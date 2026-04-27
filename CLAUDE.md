# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**MAT — Mézières Avec Toi** is a PWA (Progressive Web App) for the municipality of Mézières-lez-Cléry. It is a pure vanilla HTML/CSS/JavaScript static app — no build system, no framework, no npm. It is deployed as-is to static hosting (Cloudflare Pages).

## No build step

There is no build, compile, or install step. Open `index.html` directly in a browser or serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

There are no tests, no linter config, and no package manager in this repo.

## Architecture

### JS module loading order — CRITICAL

`index.html` loads modules with `defer` in a strict order. **This order must be preserved:**

```
mat-utils.js → mat-core.js → (other modules) → mat-boot.js  ← ALWAYS LAST
```

`mat-boot.js` is the entry point that calls all initialization functions. It also dynamically injects secondary modules after page load: `mat-pwa-notif.js`, `mat-dechets-notif.js`, `mat-jours-feries.js`, `mat-sondages.js`, `mat-associations.js`, `mat-eau8.js`. Note: `mat-desktop.js` is loaded via a static `<script defer>` in `index.html`, not injected by `mat-boot.js`.

### Module responsibilities

| File | Role |
|------|------|
| `mat-utils.js` | Global constants (API URLs, localStorage keys), shared helpers (`esc()`, `detectDevice()`, `trackStat()`) |
| `mat-core.js` | PWA install prompt, overlays, splash screen, install banner |
| `mat-boot.js` | Init sequence — must be loaded last |
| `mat-mel.js` | MEL AI assistant: PLU data (urban planning), decision tree, chat with backend |
| `mat-widgets.js` | Header widgets: weather, waste collection, bus Rémi, town hall open/closed |
| `mat-forms.js` | Forms: signal (→ Trello), contact, bug report, ideas |
| `mat-actus.js` | News feed + push notification badge |
| `mat-accessibility.js` | Themes (vert/bleu/sombre), font size, contrast, TTS, onboarding |
| `mat-trombi.js` | Elected officials gallery |
| `mat-agenda.js` | Events calendar |

### Backend

All API calls go to `https://chatbot-mairie-mezieres.onrender.com` (the companion `chatbot-mairie-mezieres` repo). Constants are defined at the top of `mat-utils.js`:

```js
const MEL_PROXY  = '…/mel';
const SIGNAL_URL = '…/signal';
const ACTU_URL   = '…/actus';
const ICAL_URL   = '…/calendar-proxy';
const METEO_URL  = '…/meteo/commune';
```

### MEL data files — edit without touching JS

MEL's PLU rules and decision tree live in:
- `data/plu-data.json` — urban planning zone rules
- `data/mel-tree.json` — guided question tree

Both files can be edited directly on GitHub; `mat-mel.js` fetches them at runtime and falls back to embedded copies if unavailable.

### Service worker

`service-worker.js` uses a **Network First** strategy. The cache is named `mat-v{version}`. When bumping the version, update the cache name here — old caches are deleted on activate.

### Admin panel

`admin.html` is a separate page with its own manifest (`manifest-admin.webmanifest`) and service worker (`sw-admin.js`). It has a login screen and displays statistics via Chart.js.

## Versioning

The version string appears in several places and **must be kept in sync** manually:

- `index.html` comment `<!-- VERSION x.y.z -->` and version badge `v{x.y.z}`
- `service-worker.js` — `const CACHE = 'mat-v{x.y.z}'`
- All `?v=x.y.z` query strings on `<script>` and `<link>` tags in `index.html`
- `mat-utils.js` — `const MAT_VERSION`
- The `PRECACHE_URLS` array in `service-worker.js`

## Deployment

Push to `main` → Cloudflare Pages auto-deploys. The `_headers` file forces `no-cache` on JS, CSS, and `index.html` so browsers always fetch the latest version despite the service worker.
