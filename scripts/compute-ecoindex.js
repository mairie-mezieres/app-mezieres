#!/usr/bin/env node
// Calcule un score Eco-index + extrait les scores Lighthouse depuis les rapports LHCI.
// Formule officielle GreenIT (tables de quantiles) — cf.
//   https://github.com/cnumr/GreenIT-Analysis/blob/master/script/ecoIndex.js
//   score = 100 - 5 * (3*q_dom + 2*q_req + q_size) / 6
// Grade : A > 80 · B > 70 · C > 55 · D > 40 · E > 25 · F > 10 · G ≤ 10
//
// Produit :
//   data/ecoindex.json   — lu par l'app (badge footer)
//   rapport-ecoindex.md  — artefact CI détaillé

const fs = require('fs');
const path = require('path');

// Tables de quantiles issues de l'implémentation de référence GreenIT
const Q_DOM = [
  0, 47, 75, 159, 233, 298, 358, 417, 476, 537,
  603, 674, 753, 843, 949, 1076, 1237, 1459, 1801, 2479, 594601
];
const Q_REQ = [
  0, 2, 15, 25, 34, 42, 49, 56, 63, 70,
  78, 86, 95, 105, 117, 130, 147, 170, 205, 281, 3920
];
const Q_SIZE = [ // Ko
  0, 1.37, 144.7, 319.53, 479.46, 631.97, 783.38, 937.91, 1098.31, 1276.58,
  1481.96, 1716.64, 1993.79, 2337.54, 2783.42, 3401.97, 4240.69, 5565.92, 8037.54, 14710.01, 223212.26
];

function getQuantile(table, value) {
  for (let i = 1; i < table.length; i++) {
    if (value < table[i]) {
      return (i - 1) + (value - table[i - 1]) / (table[i] - table[i - 1]);
    }
  }
  return 20;
}

function computeEcoindex(dom, requests, weightKb) {
  const q1 = getQuantile(Q_DOM, dom);
  const q2 = getQuantile(Q_REQ, requests);
  const q3 = getQuantile(Q_SIZE, weightKb);
  const raw = 100 - 5 * (3 * q1 + 2 * q2 + q3) / 6;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function grade(score) {
  if (score > 80) return 'A';
  if (score > 70) return 'B';
  if (score > 55) return 'C';
  if (score > 40) return 'D';
  if (score > 25) return 'E';
  if (score > 10) return 'F';
  return 'G';
}

function gradeEmoji(g) {
  return { A: '🟢', B: '🟢', C: '🟡', D: '🟡', E: '🟠', F: '🔴', G: '🔴' }[g] || '⚪';
}

function extractMetrics(report) {
  const audits = report.audits || {};
  const cats = report.categories || {};
  const lh = (key) => cats[key] ? Math.round(cats[key].score * 100) : null;

  const dom = audits['dom-size']?.numericValue ?? null;
  const requests = audits['network-requests']?.details?.items?.length ?? null;
  const weightBytes = audits['total-byte-weight']?.numericValue ?? null;

  return {
    dom: dom !== null ? Math.round(dom) : null,
    requests,
    weightKb: weightBytes !== null ? Math.round(weightBytes / 1024) : null,
    fetchTime: report.fetchTime || null,
    performance: lh('performance'),
    accessibility: lh('accessibility'),
    seo: lh('seo'),
    bestPractices: lh('best-practices'),
  };
}

function findReportFiles() {
  const dirs = ['.lighthouseci', path.join(process.env.GITHUB_WORKSPACE || '.', '.lighthouseci')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.report.json'));
    if (files.length) return files.map(f => path.join(dir, f));
  }
  return [];
}

function run() {
  const reportFiles = findReportFiles();
  const results = [];

  for (const file of reportFiles) {
    try {
      const report = JSON.parse(fs.readFileSync(file, 'utf8'));
      const url = report.finalUrl || report.requestedUrl || 'URL inconnue';
      const m = extractMetrics(report);
      if (m.dom === null || m.requests === null || m.weightKb === null) continue;
      const ecoindex = computeEcoindex(m.dom, m.requests, m.weightKb);
      const g = grade(ecoindex);
      results.push({ url, ...m, ecoindex, grade: g });
    } catch (_) {}
  }

  const date = new Date().toISOString().slice(0, 10);

  // Le 1er passage chronologique est ÉCARTÉ des moyennes : il mesure le réveil
  // du backend Render (cold start du plan gratuit), pas l'app — vu le 10/07/2026 :
  // perf 25 au 1er run contre 71/72 aux suivants. On ne l'écarte que s'il reste
  // au moins 2 passages pour moyenner.
  let ignored = null;
  if (results.length >= 2) {
    results.sort((a, b) => new Date(a.fetchTime || 0) - new Date(b.fetchTime || 0));
    ignored = results.shift();
  }

  // Moyenne des runs restants (LHCI lance 3 runs par défaut)
  const avg = (key) => results.length
    ? Math.round(results.reduce((s, r) => s + (r[key] ?? 0), 0) / results.length)
    : null;

  // data/ecoindex.json — lu par l'app PWA
  const dataDir = path.join(process.env.GITHUB_WORKSPACE || '.', 'data');
  if (fs.existsSync(dataDir)) {
    const json = {
      date,
      ecoindex: avg('ecoindex'),
      grade: results.length ? grade(avg('ecoindex')) : null,
      performance: avg('performance'),
      accessibility: avg('accessibility'),
      seo: avg('seo'),
      bestPractices: avg('bestPractices'),
    };
    const jsonPath = path.join(dataDir, 'ecoindex.json');
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log('[eco-index] data/ecoindex.json mis à jour');
  }

  // rapport-ecoindex.md — artefact CI détaillé
  let md = `# Rapport Eco-index — ${date}\n\n`;
  md += `> Formule : [GreenIT Reference](https://github.com/cnumr/GreenIT-Analysis) — `;
  md += `tables de quantiles DOM/requêtes/poids, score = 100 − 5×(3×q_dom + 2×q_req + q_size)/6\n\n`;

  if (!results.length) {
    md += '> ⚠️ Aucun rapport Lighthouse trouvé. Vérifier que le step LHCI a bien produit des fichiers `.report.json`.\n';
  } else {
    if (ignored) {
      md += `> ℹ️ Le 1er passage (cold start du backend Render — perf ${ignored.performance}/100, éco ${ignored.ecoindex}/100) est écarté des moyennes.\n\n`;
    }
    md += '### Scores Lighthouse\n\n';
    md += `| Métrique | Score |\n|---|---|\n`;
    md += `| 🚀 Performance | ${avg('performance')}/100 |\n`;
    md += `| ♿ Accessibilité | ${avg('accessibility')}/100 |\n`;
    md += `| 🔍 SEO | ${avg('seo')}/100 |\n`;
    md += `| ✅ Bonnes pratiques | ${avg('bestPractices')}/100 |\n\n`;

    md += '### Eco-index\n\n';
    md += '| URL | DOM | Requêtes | Poids (Ko) | Score | Grade |\n';
    md += '|-----|-----|----------|------------|-------|-------|\n';
    for (const r of results) {
      const cleanUrl = r.url.replace('?_lh=1', '');
      md += `| ${cleanUrl} | ${r.dom} | ${r.requests} | ${r.weightKb} | ${r.ecoindex}/100 | ${gradeEmoji(r.grade)} **${r.grade}** |\n`;
    }
    md += '\n';

    const avgEco = avg('ecoindex');
    const avgGrade = grade(avgEco);
    md += `**Score moyen : ${avgEco}/100 — Grade ${gradeEmoji(avgGrade)} ${avgGrade}**\n\n`;
    md += `| Grade | Seuil | Signification |\n`;
    md += `|-------|-------|---------------|\n`;
    md += `| 🟢 A | > 80 | Excellent |\n`;
    md += `| 🟢 B | > 70 | Très bon |\n`;
    md += `| 🟡 C | > 55 | Bon |\n`;
    md += `| 🟡 D | > 40 | Moyen |\n`;
    md += `| 🟠 E | > 25 | Médiocre |\n`;
    md += `| 🔴 F | > 10 | Mauvais |\n`;
    md += `| 🔴 G | ≤ 10 | Très mauvais |\n`;
  }

  fs.writeFileSync('rapport-ecoindex.md', md, 'utf8');
  console.log('[eco-index] rapport-ecoindex.md écrit');
  if (ignored) {
    console.log(`[eco-index] 1er passage écarté (cold start) → éco:${ignored.ecoindex}/100 perf:${ignored.performance}`);
  }
  for (const r of results) {
    console.log(`[eco-index] ${r.url.replace('?_lh=1', '')} → éco:${r.ecoindex}/100 ${r.grade} perf:${r.performance} a11y:${r.accessibility} seo:${r.seo}`);
  }
}

run();
