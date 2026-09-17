const { test, expect } = require('@playwright/test');

// ÉQUILIBRE DES TROIS COLONNES DU BUREAU (≥ 1024 px).
//
// ⛔ CE QU'ON VOIT D'UNE COLONNE, C'EST LA HAUTEUR DE SON CONTENU. Les trois
// colonnes n'ont pas de fond : leur largeur est fixée par la grille
// (`1fr 1fr 1fr`, soit 432 px chacune sur un écran de 1440 px, mesuré), mais
// rien ne borne leur hauteur. En v4.121, la colonne du centre pesait 1 338 px
// contre 694 à gauche et 761 à droite — deux colonnes s'arrêtaient à mi-page et
// laissaient 600 px de blanc sous elles. Un habitant y lit une page cassée, pas
// un choix de mise en page.
//
// ⚠️ ET LA CAUSE N'ÉTAIT PAS CELLE QU'ON CROIT : le déséquilibre ne venait pas
// de la répartition des cartes seule, mais de la description de « Prochain
// évènement », que rien ne plafonnait. Elle vient de l'agenda public : sa
// longueur ne dépend de personne ici. Un concert décrit en six paragraphes
// faisait une carte de 690 px — plus haute à elle seule que toute la colonne de
// gauche. C'est pour ça que ce test sert une description LONGUE : avec un
// événement d'une ligne, il serait vert quoi qu'on fasse.
//
// ⚠️ Un test qui n'interroge que le JS ne prouve rien ici (règle 7 du
// CLAUDE.md) : on mesure des rectangles rendus, jamais un état interne.
const { couperReseauExterne } = require('./helpers/reseau');

// Une description d'agenda réaliste : six paragraphes, comme le concert du
// 27 septembre 2026 qui a révélé le défaut.
const DESC_LONGUE = [
  'Venez découvrir Fabienne Magnant Trio et son univers musical riche et singulier.',
  '',
  'Elle compose et joue avec ses trois guitares une musique à la fois intense et subtile, tonique et sensuelle.',
  '',
  "Son voyage musical nous emmène du Brésil à l'Andalousie, sans oublier les musiques traditionnelles et classiques européennes.",
  '',
  '🎶 Un beau moment musical à partager en plein air !',
  '',
  'Entrée gratuite — Venez nombreux ! 🎸'
].join('\n');

// PNG 1×1 transparent : les vignettes ont toutes une taille imposée par le CSS
// (52 px pour une actu, `aspect-ratio:1/1` pour une photo, `max-height:260px`
// pour l'affiche de l'évènement), donc l'image réelle ne change pas la mesure —
// mais une image ABSENTE, si : `onerror` la masque et la carte rétrécit.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X1QAAAAABJRU5ErkJggg==',
  'base64'
);

function pad(n) { return String(n).padStart(2, '0'); }
function jour(delta, h) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + delta, h, 0, 0);
}
function ical(events) {
  const blocs = events.map((e, i) => {
    const d = e.date;
    const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
      + 'T' + pad(d.getHours()) + '0000';
    return [
      'BEGIN:VEVENT',
      'UID:equilibre-' + i,
      'SUMMARY:' + e.summary,
      'DTSTART:' + stamp,
      'LOCATION:' + (e.location || 'Mairie'),
      'DESCRIPTION:' + String(e.description || '').replace(/\n/g, '\\n'),
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');
  return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' + blocs + '\r\nEND:VCALENDAR\r\n';
}

const ACTUS = [
  { id: 'a1', titre: '-travaux 🚧-', description: 'Des travaux sont en cours sur le plateau sportif. Nous faisons retirer les rondins de bois…', date: jour(-2, 9).toISOString(), photo: 'https://res.cloudinary.com/demo/image/upload/v1/t1.jpg' },
  { id: 'a2', titre: '-formation des habitants-', description: 'Problème informatique, hameçonnage… Des problématiques complexes lors de la navigation sur internet.', date: jour(-5, 9).toISOString(), photo: 'https://res.cloudinary.com/demo/image/upload/v1/t2.jpg' },
  { id: 'a3', titre: '🎶 CONCERT GRATUIT – FABIENNE MAGNANT TRIO 🎸', description: DESC_LONGUE, date: jour(-7, 9).toISOString(), eventDate: jour(10, 16).toISOString(), photo: 'https://res.cloudinary.com/demo/image/upload/v1/t3.jpg' }
];

const PHOTOS = {
  photos: Array.from({ length: 8 }, (_, i) => ({
    id: 'p' + i,
    url: 'https://res.cloudinary.com/demo/image/upload/v1/p' + i + '.jpg',
    desc: 'Photo de la commune ' + i
  }))
};

// ⛔ `couperReseauExterne` coupe `onrender.com` — donc `/actus`, `/photos`,
// `/meteo/commune` ET `/calendar-proxy`, qui vivent tous là. Les simulations
// passent par le CROCHET, évalué avant la coupure : un `page.route` posé après
// elle gagnerait et annulerait la protection (ADR-0048).
async function ouvrirBureau(page) {
  await page.addInitScript(() => { localStorage.setItem('mat_onboarded_v3', '1'); });
  await couperReseauExterne(page, (route, url) => {
    if (url.includes('/calendar-proxy')) {
      route.fulfill({
        status: 200,
        contentType: 'text/calendar; charset=utf-8',
        body: ical([
          { date: jour(10, 16), summary: '🎶 CONCERT GRATUIT – FABIENNE MAGNANT TRIO 🎸', location: "Cour de l'école", description: DESC_LONGUE },
          { date: jour(24, 19), summary: 'Conseil municipal' }
        ])
      });
      return true;
    }
    if (url.includes('/actus')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTUS) });
      return true;
    }
    if (url.includes('/photos')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PHOTOS) });
      return true;
    }
    if (url.includes('/meteo/commune')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ forecast: { current: { temperature_2m: 18.4, weather_code: 2, wind_speed_10m: 12 } } })
      });
      return true;
    }
    if (url.includes('res.cloudinary.com')) {
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1x1 });
      return true;
    }
    return false;
  });
  await page.goto('/');
  // La carte de l'évènement est la dernière peuplée (elle attend les actus puis
  // l'agenda) : tant qu'elle n'est pas là, toute mesure de hauteur est fausse.
  await expect(page.locator('#dsk-featured .d-featured')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#dsk-actus-list .d-actu-item').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#dsk-photos-grid .d-photo-thumb').first()).toBeVisible({ timeout: 20000 });
}

// Hauteur RÉELLE du contenu d'une colonne : du haut de la colonne au bas de sa
// dernière carte visible. ⚠️ Pas `getBoundingClientRect().height` de la colonne
// elle-même : la grille les étire toutes à la même valeur (`stretch`), donc
// cette hauteur est identique pour les trois et ne mesure RIEN. C'est
// exactement le genre de contrôle qui naît vert (ADR-0030).
async function mesurerColonnes(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('.d-main-grid > .d-col')].map((col) => {
      const r = col.getBoundingClientRect();
      const kids = [...col.children].filter((c) => c.getBoundingClientRect().height > 0);
      const last = kids[kids.length - 1].getBoundingClientRect();
      return {
        nom: col.className,
        largeur: Math.round(r.width),
        contenu: Math.round(last.bottom - r.top),
        cartes: kids.length
      };
    });
  });
}

test.describe('mise en page du bureau — trois colonnes équilibrées', () => {
  test.beforeEach(async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width < 1024, 'mise en page ordinateur uniquement');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test('les trois colonnes ont la même largeur', async ({ page }) => {
    await ouvrirBureau(page);
    const cols = await mesurerColonnes(page);
    expect(cols).toHaveLength(3);
    const larg = cols.map((c) => c.largeur);
    expect(Math.max(...larg) - Math.min(...larg)).toBeLessThanOrEqual(2);
  });

  test('aucune colonne ne dépasse une autre de plus de 25 %', async ({ page }) => {
    await ouvrirBureau(page);
    const cols = await mesurerColonnes(page);
    const h = cols.map((c) => c.contenu);
    const hauteMax = Math.max(...h);
    const ecart = (hauteMax - Math.min(...h)) / hauteMax;
    const detail = cols.map((c) => c.nom.replace('d-col d-col-', '') + '=' + c.contenu + 'px').join(', ');
    // 25 % de la plus haute : à 1 000 px de colonne, c'est 250 px de blanc en
    // bas de page — visible, mais pas encore lisible comme une panne. Au-delà,
    // c'est le défaut de la v4.121 qui revient (écart mesuré : 48 %).
    expect(ecart, 'déséquilibre des colonnes du bureau — ' + detail).toBeLessThan(0.25);
    // Et personne ne vide une colonne pour équilibrer.
    cols.forEach((c) => expect(c.cartes, c.nom).toBeGreaterThanOrEqual(3));
  });

  test('la description de l’évènement est plafonnée, même sur six paragraphes', async ({ page }) => {
    await ouvrirBureau(page);
    const desc = page.locator('#dsk-featured .d-featured-desc');
    await expect(desc).toBeVisible();
    const m = await desc.evaluate((el) => ({
      rendu: Math.round(el.getBoundingClientRect().height),
      reel: el.scrollHeight,
      clamp: getComputedStyle(el).webkitLineClamp
    }));
    // Le texte servi fait six paragraphes : s'il tenait en entier, `rendu`
    // dépasserait 150 px. Et `reel > rendu` prouve que quelque chose est bien
    // coupé — sans quoi le plafond pourrait n'être qu'une déclaration morte.
    expect(m.clamp, 'plafond de lignes absent du rendu').toBe('3');
    expect(m.rendu, 'description non plafonnée').toBeLessThan(80);
    expect(m.reel, 'rien n’est coupé : le texte de test est trop court').toBeGreaterThan(m.rendu);
  });

  test('les actualités ouvrent la colonne de droite', async ({ page }) => {
    await ouvrirBureau(page);
    // « Les éléments importants en premier » : la carte des actualités est la
    // première de sa colonne, juste sous l'intitulé. Elle était auparavant
    // sous une carte d'évènement de 690 px, donc sous la ligne de flottaison.
    const premiere = page.locator('.d-col-right > .d-card').first();
    await expect(premiere).toHaveAttribute('id', 'dsk-actus');
    const haut = await premiere.evaluate((el) => el.getBoundingClientRect().top);
    expect(haut, 'les actualités ne sont pas visibles sans défiler').toBeLessThan(900);
  });
});
