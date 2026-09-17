const { test, expect } = require('@playwright/test');

// « Prochaine manifestation » — l'écart en jours doit se compter en JOURS DE
// CALENDRIER, pas en durée écoulée.
//
// Bug corrigé : le 31 août 2026 à 7 h 28, la carte annonçait « Demain » pour le
// conseil municipal du 31 août à 19 h. L'ancien calcul faisait
// `Math.ceil((debut - maintenant) / 86400000)` : 11 h 30 d'écart → 0,48 →
// arrondi au-dessus → 1 jour. Symétriquement, `Math.floor` aurait annoncé
// « Aujourd'hui » un événement de demain matin consulté ce soir. Seule la
// comparaison de deux minuits locaux (matDaysUntil, js/mat-utils.js) est juste.
//
// Le test sert un agenda iCal fabriqué : les tests tournent sans backend, donc
// on interceptera l'appel à /calendar-proxy avant de couper le reste.

// ⛔ Cette spec portait sa propre copie de la liste, elle aussi amputée de
// `'onrender.com'` — et son commentaire affirmait pourtant que la production
// était coupée. Une protection écrite noir sur blanc, et absente : c'est ce
// qui l'a rendue invisible à la relecture. Source unique désormais. ADR-0048.
const { couperReseauExterne } = require('./helpers/reseau');

function pad(n) { return String(n).padStart(2, '0'); }

// DTSTART en heure locale flottante (sans « Z ») : c'est le format que produit
// l'agenda de la mairie, et celui qui rend le test insensible au fuseau.
function ical(events) {
  const blocs = events.map((e, i) => {
    const d = e.date;
    const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
      + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    return [
      'BEGIN:VEVENT',
      'UID:test-' + i,
      'SUMMARY:' + e.summary,
      'DTSTART:' + stamp,
      'LOCATION:Mairie',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');
  return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' + blocs + '\r\nEND:VCALENDAR\r\n';
}

// Une date locale à J+delta, à l'heure dite.
function jour(delta, h, min) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + delta, h, min || 0, 0);
}

async function ouvrirAvecAgenda(page, events) {
  await page.addInitScript(() => { localStorage.setItem('mat_onboarded_v3', '1'); });
  // ⚠️ `/calendar-proxy` vit sur onrender.com, que la coupure emporte : la
  // simulation passe donc par le crochet, évalué AVANT elle. C'est bien ce que
  // l'ancienne rédaction voulait dire — sauf que sa liste ne coupait pas
  // onrender.com, si bien que tout le reste de l'app parlait à la production.
  await couperReseauExterne(page, (route, url) => {
    if (!url.includes('/calendar-proxy')) return false;
    route.fulfill({
      status: 200,
      contentType: 'text/calendar; charset=utf-8',
      body: ical(events)
    });
    return true;
  });
  await page.goto('/');
}

test('un événement de ce soir s’annonce « Aujourd’hui », pas « Demain »', async ({ page }) => {
  await ouvrirAvecAgenda(page, [{ date: jour(0, 19, 0), summary: 'Conseil municipal' }]);
  const jours = page.locator('#next-event-days');
  await expect(jours).toHaveText("Aujourd'hui", { timeout: 15000 });
  await expect(page.locator('#next-event-name')).toHaveText('Conseil municipal');
});

test('un événement de demain matin s’annonce « Demain »', async ({ page }) => {
  await ouvrirAvecAgenda(page, [{ date: jour(1, 8, 30), summary: 'Marché' }]);
  await expect(page.locator('#next-event-days')).toHaveText('Demain', { timeout: 15000 });
});

test('un événement à J+5 s’annonce « Dans 5 j. »', async ({ page }) => {
  await ouvrirAvecAgenda(page, [{ date: jour(5, 10, 0), summary: 'Brocante' }]);
  await expect(page.locator('#next-event-days')).toHaveText('Dans 5 j.', { timeout: 15000 });
});

// Le cas qui piégeait l'ancien calcul : plus l'événement du jour est tard, plus
// la durée écoulée approchait 24 h. À 23 h 59, `Math.ceil` donnait 1.
test('un événement du jour à 23 h 59 reste « Aujourd’hui »', async ({ page }) => {
  await ouvrirAvecAgenda(page, [{ date: jour(0, 23, 59), summary: 'Feu d’artifice' }]);
  await expect(page.locator('#next-event-days')).toHaveText("Aujourd'hui", { timeout: 15000 });
});
