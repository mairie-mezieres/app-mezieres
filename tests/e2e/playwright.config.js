const { defineConfig, devices } = require('@playwright/test');

// Tests E2E « smoke » de l'interface, sans backend : on sert les fichiers
// statiques et on coupe les appels externes (cf. smoke.spec.js) pour tester
// la résilience du shell et l'accessibilité, de façon hermétique et stable.
module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // ⚠️ Service worker BLOQUÉ pendant les tests — indispensable à la stabilité.
    // Sinon le SW s'installe, prend le contrôle (skipWaiting), et mat-core.js
    // recharge la page sur « controllerchange » : le frame principal navigue en
    // plein test (4 navigations au lieu de 2, mesuré). Toute opération en vol
    // est alors coupée — attente de locator, ou `analyze()` d'axe qui reste
    // pendant jusqu'au timeout de 30 s (« Target page, context or browser has
    // been closed »). Cette course faisait échouer ~2 exécutions sur 3, au
    // hasard des projets et des tests. Le SW n'est pas l'objet de ces tests :
    // ils vérifient le shell et l'accessibilité.
    serviceWorkers: 'block',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'node static-server.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ]
});
