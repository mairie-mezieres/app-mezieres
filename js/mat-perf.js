/* ════════════════════════════════════════════════════════════
   MAT — Badge performances footer v1.0.6
   Charge data/ecoindex.json (mis à jour chaque lundi par CI)
   et affiche les scores Lighthouse + Eco-index dans le footer.
   La note Éco n'est affichée que si l'éco-index atteint D (≥ 40).
   Peuplé dans tous les éléments .footer-perf (mobile + desktop).
   ════════════════════════════════════════════════════════════ */

async function loadPerfBadge() {
  const els = document.querySelectorAll('.footer-perf');
  if (!els.length) return;
  try {
    const r = await fetch('./data/ecoindex.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const d = await r.json();
    if (!d.performance) return;

    // La note Éco n'est montrée qu'à partir de D (≥ 40).
    const gradeColors = {
      A: '#74c69d', B: '#95d5b2', C: '#ffe08a',
      D: '#ffd166', E: '#ffb38a', F: '#ff9999', G: '#ff9999'
    };
    const dateStr = d.date ? d.date.split('-').reverse().join('/') : '';
    const showEco = d.grade && d.ecoindex >= 40;
    const col = gradeColors[d.grade] || 'var(--sage)';

    const html =
      (showEco
        ? `<span class="fp-eco" style="color:${col}" title="Éco-index : sobriété numérique (poids, DOM, requêtes) — ${d.ecoindex}/100, note ${d.grade}">🌿&nbsp;Éco&nbsp;${d.grade}&nbsp;${d.ecoindex}</span><span class="fp-sep">·</span>`
        : '') +
      `<span title="Performance Lighthouse : vitesse de chargement — ${d.performance}/100">⚡&nbsp;Performance&nbsp;${d.performance}</span>` +
      `<span class="fp-sep">·</span>` +
      `<span title="Accessibilité Lighthouse : conformité RGAA/WCAG — ${d.accessibility}/100">♿&nbsp;Accessibilité&nbsp;${d.accessibility}</span>` +
      `<span class="fp-sep">·</span>` +
      `<span title="Bonnes pratiques (sécurité, HTTPS, absence d'erreurs) — ${d.bestPractices}/100">✅&nbsp;Pratiques&nbsp;${d.bestPractices}</span>` +
      (dateStr ? `<span class="fp-sep">·</span><span class="fp-date">${dateStr}</span>` : '');

    els.forEach(el => { el.innerHTML = html; });
  } catch (_) {}
}
