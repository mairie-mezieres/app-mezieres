#!/usr/bin/env node
// Calcule un score Eco-index depuis les métriques d'un rapport Lighthouse CI.
// Utilise la formule officielle ecoindex.fr (v5) :
//   ecoindex = 100 - (5/3) * (dom/10 + requests + weight_kb/100)
// Grade : A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 55 · E ≥ 40 · F ≥ 25 · G < 25
//
// Usage (depuis le workflow Lighthouse CI) :
//   node scripts/compute-ecoindex.js
//
// Entrée : variable d'env LHCI_LINKS (JSON produit par treosh/lighthouse-ci-action)
//          ou fichiers *.report.json dans .lighthouseci/
// Sortie : rapport-ecoindex.md (artefact CI)

const fs = require('fs');
const path = require('path');

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 55) return 'D';
  if (score >= 40) return 'E';
  if (score >= 25) return 'F';
  return 'G';
}

function gradeEmoji(g) {
  return { A: '🟢', B: '🟢', C: '🟡', D: '🟡', E: '🟠', F: '🔴', G: '🔴' }[g] || '⚪';
}

function computeEcoindex(dom, requests, weightKb) {
  const raw = 100 - (5 / 3) * (dom / 10 + requests + weightKb / 100);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function extractMetrics(report) {
  const audits = report.audits || {};
  const dom = audits['dom-size']?.numericValue ?? null;
  const requests = audits['network-requests']?.details?.items?.length ?? null;
  const weightBytes = audits['total-byte-weight']?.numericValue ?? null;
  return {
    dom: dom !== null ? Math.round(dom) : null,
    requests,
    weightKb: weightBytes !== null ? Math.round(weightBytes / 1024) : null,
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
      const { dom, requests, weightKb } = extractMetrics(report);
      if (dom === null || requests === null || weightKb === null) continue;
      const score = computeEcoindex(dom, requests, weightKb);
      const g = grade(score);
      results.push({ url, dom, requests, weightKb, score, grade: g });
    } catch (_) {}
  }

  const date = new Date().toISOString().slice(0, 10);

  let md = `# Rapport Eco-index — ${date}\n\n`;
  md += `> Formule : [ecoindex.fr v5](https://www.ecoindex.fr/comment-ca-marche/) — `;
  md += `Score = 100 − (5/3) × (DOM/10 + Requêtes + Poids(Ko)/100)\n\n`;

  if (!results.length) {
    md += '> ⚠️ Aucun rapport Lighthouse trouvé. Vérifier que le step LHCI a bien produit des fichiers `.report.json`.\n';
  } else {
    md += '| URL | DOM | Requêtes | Poids (Ko) | Score | Grade |\n';
    md += '|-----|-----|----------|------------|-------|-------|\n';
    for (const r of results) {
      const cleanUrl = r.url.replace('?_lh=1', '');
      md += `| ${cleanUrl} | ${r.dom} | ${r.requests} | ${r.weightKb} | ${r.score}/100 | ${gradeEmoji(r.grade)} **${r.grade}** |\n`;
    }
    md += '\n';

    const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const avgGrade = grade(avg);
    md += `**Score moyen : ${avg}/100 — Grade ${gradeEmoji(avgGrade)} ${avgGrade}**\n\n`;
    md += `| Grade | Seuil | Signification |\n`;
    md += `|-------|-------|---------------|\n`;
    md += `| 🟢 A | ≥ 90 | Excellent |\n`;
    md += `| 🟢 B | ≥ 80 | Très bon |\n`;
    md += `| 🟡 C | ≥ 70 | Bon |\n`;
    md += `| 🟡 D | ≥ 55 | Moyen |\n`;
    md += `| 🟠 E | ≥ 40 | Médiocre |\n`;
    md += `| 🔴 F | ≥ 25 | Mauvais |\n`;
    md += `| 🔴 G | < 25 | Très mauvais |\n`;
  }

  const out = 'rapport-ecoindex.md';
  fs.writeFileSync(out, md, 'utf8');
  console.log(`[eco-index] Rapport écrit : ${out}`);
  if (results.length) {
    for (const r of results) {
      console.log(`[eco-index] ${r.url.replace('?_lh=1', '')} → score ${r.score}/100 grade ${r.grade} (DOM:${r.dom} req:${r.requests} ${r.weightKb}Ko)`);
    }
  }
}

run();
