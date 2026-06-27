/**
 * MAT — Générateur des visuels d'alerte sécheresse (VigiEau)
 * Usage : node scripts/generate-secheresse-cards.js
 * Sortie : img/secheresse/secheresse-{niveau}.png (1200×630, format réseaux sociaux)
 *
 * Même approche que les visuels de vigilance Météo-France (img/vigilance/) :
 * un template HTML rendu en PNG via Chromium (Playwright). Les cartes servent
 * d'illustration aux actualités / notifications / posts Facebook publiés par le
 * backend quand le niveau sécheresse atteint « alerte » (et à la levée).
 *
 * Chromium est fourni par l'environnement (PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers).
 * Si le binaire n'est pas trouvé automatiquement, définir CHROMIUM_PATH.
 */
"use strict";
const path = require("path");
const fs = require("fs");

let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch (_) {
  try { ({ chromium } = require("@playwright/test")); }
  catch (e) {
    console.error("Playwright introuvable. Installer : npm i -D playwright-core");
    process.exit(1);
  }
}

const OUT = path.join(__dirname, "..", "img", "secheresse");
fs.mkdirSync(OUT, { recursive: true });

const COMMUNE = "Mézières-lez-Cléry";
const SOURCE = "Source : VigiEau";

// Pictogramme goutte d'eau (blanc). Variante « fin » : goutte + coche.
function dropIcon(withCheck) {
  const check = withCheck
    ? '<path d="M86 116 l16 16 l30 -34" fill="none" stroke="#16a34a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>'
    : "";
  return `<svg width="190" height="190" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
    <path d="M110 18 C110 18 38 104 38 150 a72 72 0 0 0 144 0 C182 104 110 18 110 18 Z" fill="#ffffff"/>
    ${check}
  </svg>`;
}

// Niveaux (croissants) + carte de levée.
const CARDS = [
  {
    slug: "vigilance",
    c1: "#fde047", c2: "#ca8a04",
    header: "RESTRICTIONS D'EAU",
    title: "VIGILANCE",
    subtitle: "Économies d'eau recommandées",
    message: "Pas d'interdiction — préservons la ressource",
    check: false,
  },
  {
    slug: "alerte",
    c1: "#fb923c", c2: "#ea580c",
    header: "RESTRICTIONS D'EAU",
    title: "ALERTE",
    subtitle: "Premières restrictions d'usage de l'eau",
    message: "Arrosage, lavage, piscines : usages limités",
    check: false,
  },
  {
    slug: "alerte-renforcee",
    c1: "#f87171", c2: "#dc2626",
    header: "RESTRICTIONS D'EAU",
    title: "ALERTE RENFORCÉE",
    subtitle: "Restrictions durcies",
    message: "Réduisez fortement votre consommation",
    check: false,
  },
  {
    slug: "crise",
    c1: "#c084fc", c2: "#7c3aed",
    header: "RESTRICTIONS D'EAU",
    title: "CRISE",
    subtitle: "Usages prioritaires uniquement",
    message: "Santé, sécurité, alimentation en eau potable",
    check: false,
  },
  {
    slug: "fin",
    c1: "#4ade80", c2: "#16a34a",
    header: "SÉCHERESSE",
    title: "FIN DES RESTRICTIONS",
    subtitle: "Le niveau est repassé sous l'alerte",
    message: "Merci pour vos économies d'eau",
    check: true,
  },
];

// Taille du titre adaptée à sa longueur (évite le débordement).
function titleSize(title) {
  const n = title.length;
  if (n <= 6) return 168;
  if (n <= 9) return 150;
  if (n <= 14) return 104;
  return 86;
}

function html(card) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:1200px; height:630px; }
    .card {
      width:1200px; height:630px; position:relative; overflow:hidden;
      padding:70px 80px;
      background:linear-gradient(135deg, ${card.c1} 0%, ${card.c2} 100%);
      font-family:'Arial','Helvetica Neue',Helvetica,sans-serif; color:#fff;
      display:flex; flex-direction:column; justify-content:space-between;
    }
    .card::after { content:""; position:absolute; top:-180px; right:-120px;
      width:520px; height:520px; border-radius:50%;
      background:radial-gradient(circle, rgba(255,255,255,.18), rgba(255,255,255,0)); }
    .top { display:flex; justify-content:space-between; align-items:flex-start; z-index:1; }
    .header { display:flex; align-items:center; gap:22px; }
    .tri { width:60px; height:60px; }
    .htext { font-size:40px; font-weight:900; letter-spacing:3px; }
    .icon { z-index:1; opacity:.96; }
    .mid { z-index:1; }
    .title { font-size:${titleSize(card.title)}px; font-weight:900; line-height:.95; letter-spacing:-1px; }
    .subtitle { font-size:40px; font-weight:500; margin-top:14px; opacity:.95; }
    .divider { height:2px; background:rgba(255,255,255,.45); margin:0 0 18px; z-index:1; }
    .foot { z-index:1; display:flex; justify-content:space-between; align-items:flex-end; }
    .commune { font-size:36px; font-weight:800; }
    .msg { font-size:28px; font-weight:500; opacity:.9; margin-top:4px; }
    .src { font-size:26px; font-weight:600; opacity:.85; }
  </style></head><body>
  <div class="card">
    <div class="top">
      <div class="header">
        <svg class="tri" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 10 L92 86 L8 86 Z" fill="#fff"/>
          <rect x="45" y="38" width="10" height="26" rx="5" fill="${card.c2}"/>
          <circle cx="50" cy="74" r="6" fill="${card.c2}"/>
        </svg>
        <div class="htext">${card.header}</div>
      </div>
      <div class="icon">${dropIcon(card.check)}</div>
    </div>
    <div class="mid">
      <div class="title">${card.title}</div>
      <div class="subtitle">${card.subtitle}</div>
    </div>
    <div>
      <div class="divider"></div>
      <div class="foot">
        <div>
          <div class="commune">${COMMUNE}</div>
          <div class="msg">${card.message}</div>
        </div>
        <div class="src">${SOURCE}</div>
      </div>
    </div>
  </div></body></html>`;
}

(async () => {
  const execPath = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const launchOpts = { args: ["--no-sandbox", "--disable-dev-shm-usage"] };
  if (fs.existsSync(execPath)) launchOpts.executablePath = execPath;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const card of CARDS) {
    await page.setContent(html(card), { waitUntil: "networkidle" });
    const file = path.join(OUT, `secheresse-${card.slug}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log("✓", path.relative(path.join(__dirname, ".."), file));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
