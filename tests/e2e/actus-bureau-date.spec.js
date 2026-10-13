const { test, expect } = require('@playwright/test');

// DATES DES ACTUALITÉS SUR LE BUREAU (≥ 1024 px).
//
// ⛔ Le backend publie `date` au format FR « JJ/MM/AAAA »
// (`toLocaleDateString('fr-FR')`). `new Date('12/10/2026')` le lit en MM/JJ :
// le 12 octobre s'affichait « 10 déc », le 9 « 10 sept », le 8 « 10 août »
// (bug signalé le 13/10/2026). Les autres specs servaient des dates ISO — le
// seul format que le backend n'envoie PAS dans ce champ —, d'où un vert trompeur.
const { couperReseauExterne } = require('./helpers/reseau');

const ACTUS = [
  { id: 1, title: 'A', description: 'a', date: '12/10/2026', dateISO: '2026-10-12' },
  { id: 2, title: 'B', description: 'b', date: '09/10/2026', dateISO: '2026-10-09' },
  { id: 3, title: 'C', description: 'c', date: '8/10/2026' }
];

test('le bureau lit la date JJ/MM/AAAA du backend sans inverser jour et mois', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width < 1024, 'mise en page ordinateur uniquement');
  await page.addInitScript(() => { localStorage.setItem('mat_onboarded_v3', '1'); });
  await couperReseauExterne(page, (route, url) => {
    if (url.includes('/actus')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACTUS) });
      return true;
    }
    return false;
  });
  await page.goto('/');
  const dates = page.locator('#dsk-actus-list .d-actu-date');
  await expect(dates).toHaveCount(3, { timeout: 20000 });
  const textes = (await dates.allTextContents()).map(t => t.trim());
  expect(textes[0]).toMatch(/^12 oct/);
  expect(textes[1]).toMatch(/^09 oct/);
  expect(textes[2]).toMatch(/^08 oct/);
});
