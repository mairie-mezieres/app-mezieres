/* ════════════════════════════════════════════════════════════
   MAT — Badge performances footer v1.0.0
   Charge data/ecoindex.json (mis à jour chaque lundi par CI)
   et affiche les scores Lighthouse + Eco-index dans le footer.
   ════════════════════════════════════════════════════════════ */

async function loadPerfBadge() {
  const el = document.getElementById('footer-perf');
  if (!el) return;
  try {
    const r = await fetch('./data/ecoindex.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const d = await r.json();
    if (!d.grade) return;

    const gradeColors = {
      A: '#52b788', B: '#74c69d', C: '#f4d35e',
      D: '#f9a03f', E: '#ee6c4d', F: '#e63946', G: '#9d0208'
    };
    const col = gradeColors[d.grade] || 'var(--sage)';
    const dateStr = d.date ? d.date.split('-').reverse().join('/') : '';

    el.innerHTML =
      `<span class="fp-eco" style="color:${col}" title="Eco-index ${d.ecoindex}/100">🌿 ${d.grade} ${d.ecoindex}</span>` +
      `<span class="fp-sep">·</span>` +
      `<span title="Performance Lighthouse">⚡&nbsp;${d.performance}</span>` +
      `<span class="fp-sep">·</span>` +
      `<span title="Accessibilité Lighthouse">♿&nbsp;${d.accessibility}</span>` +
      `<span class="fp-sep">·</span>` +
      `<span title="SEO Lighthouse">🔍&nbsp;${d.seo}</span>` +
      (dateStr ? `<span class="fp-sep">·</span><span class="fp-date">${dateStr}</span>` : '');
  } catch (_) {}
}
