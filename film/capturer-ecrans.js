// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Capture les écrans RÉELS de l'application pour le film de présentation.
//
//   node film/capturer-ecrans.js            (sert le dépôt sur :4173 tout seul)
//   BASE_URL=http://localhost:4173 node film/capturer-ecrans.js
//
// Sortie : film/ecrans/*.png (390×844 @2 = 780×1688).
//
// ⛔ AUCUN APPEL NE SORT. Toute requête hors `localhost` est soit servie par
// `film/fixtures.js`, soit abandonnée. Un navigateur piloté qui atteint le
// backend s'enregistre comme un habitant de plus au tableau de bord de la
// mairie (ADR-0048) — et le film n'a aucune raison de faire vieillir des
// statistiques que des élus lisent.
"use strict";

const path = require("path");
const fs = require("fs");
const http = require("http");
const { chromium } = require("@playwright/test");
const { fixtures, MEL_QUESTION } = require("./fixtures");

const RACINE = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "ecrans");
const PORT = Number(process.env.FILM_PORT || 4173);
const BASE_URL = process.env.BASE_URL || "http://localhost:" + PORT;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const VIEWPORT = { width: 390, height: 844 };
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"
};

const delai = (ms) => new Promise((r) => setTimeout(r, ms));

/* Serveur statique minimal : évite d'exiger un `npx serve` en parallèle. */
function servir() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const f = path.join(RACINE, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
      if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404); return res.end("404");
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

/* Les écrans du film. `prepare` reçoit la page une fois l'overlay ouvert.
   Trois formes :
     • `fn`  — une fonction de l'app à appeler (overlay de `index.html`) ;
     • `url` — une PAGE à part, chargée dans son propre contexte ;
     • ni l'un ni l'autre — l'accueil, tel qu'il s'ouvre. */
const ECRANS = [
  { nom: "accueil", desc: "Accueil" },
  {
    // ⚠️ Cette capture-là n'est PAS celle du film. Les actualités du film
    // viennent d'un vrai téléphone (`ecrans/actus-photos.webp`) : les fixtures
    // ne portent aucune photo, et une page d'actualités sans image ne montre
    // pas ce qu'elle sait faire — carrousel, pastille, bouton d'alerte.
    nom: "actus", desc: "Actualités (sans photo — voir actus-photos.webp)", fn: "openNotifs()",
    prepare: async (page) => { await delai(1200); }
  },
  {
    // ⚠️ On DÉROULE de 330 px avant de capturer. Les tuiles OpenStreetMap sont
    // coupées comme tout le reste : la carte du signalement apparaîtrait en
    // rectangle gris, soit le tiers haut de l'écran vide dans le film. Ce qu'on
    // veut montrer est dessous — catégorie, description, photo.
    nom: "signalement", desc: "Signalement citoyen", fn: "openSignal()",
    prepare: async (page) => {
      await page.evaluate(() => {
        const b = document.querySelector("#ov-signal .panel-body");
        if (b) b.scrollTop = 330;
      });
      await delai(400);
    }
  },
  { nom: "agenda", desc: "Agenda", fn: "openAgenda()" },
  { nom: "meteo", desc: "Météo détaillée", fn: "openMeteo()" },
  {
    nom: "suivi", desc: "Suivi des signalements", fn: "openSuivi('signalements')",
    prepare: async (page) => { await delai(900); }
  },
  { nom: "idees", desc: "Boîte à idées", fn: "openIdees()", prepare: async () => delai(900) },
  { nom: "guide", desc: "Guide d'arrivée", fn: "openGuideArrivee()" },
  { nom: "accessibilite", desc: "Personnalisation / accessibilité", fn: "openAccessibilite()" },
  {
    // Le fait du jour n'est pas un overlay : c'est un bloc de l'accueil qui se
    // déplie. On le centre dans l'écran avant de photographier.
    // ⚠️ `jours: 9` DÉCALE L'HORLOGE du navigateur. Le fait du jour tourne avec
    // le calendrier (`_jourDepuisOrigine`), et celui d'aujourd'hui portait sur le
    // 3114, le numéro national de prévention du suicide : vrai, utile, et
    // parfaitement déplacé dans un film de promotion. Le 9e jour suivant tombe
    // sur la carte de Cassini — le village, son nom, son histoire.
    nom: "saviezvous", desc: "Le saviez-vous ?", jours: 9,
    prepare: async (page) => {
      await page.evaluate(() => {
        if (typeof window.matSaviezVousBascule === "function") window.matSaviezVousBascule();
      });
      await delai(700);
      await page.evaluate(() => {
        const b = document.querySelector(".sv-bloc");
        if (b) b.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await delai(500);
    }
  },
  {
    // ⚠️ La carte 3D a besoin des tuiles et du bâti de l'IGN (data.geopf.fr).
    // Sans réseau elle rend un fond vide : la capture n'est donc PAS utilisable
    // telle quelle, et le film attend une image fournie par la mairie.
    // ⚠️ LE NOM DIT L'ÉTAT DU FICHIER. Appelée `carte3d.png`, cette capture
    // finirait un jour branchée dans le film par quelqu'un qui n'aura pas lu le
    // README — et le film montrerait « Aucun bâtiment chargé » en grand.
    nom: "carte3d-sans-reseau", desc: "Carte 3D (⚠️ inutilisable : IGN coupé)", fn: "matOuvrirCarte3D()",
    prepare: async (page) => { await delai(4000); }
  },
  {
    nom: "mel", desc: "MEL — assistante", fn: "openMel()",
    prepare: async (page) => {
      // Arbre de décision → « Autre question » → chat libre.
      await page.evaluate(() => window.melSelectCat && window.melSelectCat("autre"));
      await delai(400);
      await page.evaluate(() => window.melSelectQuestion && window.melSelectQuestion("autre", "__autre__"));
      await delai(500);
      await page.evaluate((q) => {
        const i = document.getElementById("minp");
        if (i) { i.value = q; window.sendMel && window.sendMel(); }
      }, MEL_QUESTION);
      await delai(1500);
      // Dérouler jusqu'à la réponse.
      await page.evaluate(() => {
        const m = document.getElementById("msgs");
        if (m) m.scrollTop = m.scrollHeight;
      });
      await delai(400);
    }
  },

  /* ── Kit de réplication (`partager.html`) ─────────────────────────────────
     ⚠️ CE N'EST PAS UN ÉCRAN DE L'APP mais une PAGE à part : elle se charge par
     `url`, elle ne s'ouvre pas par une fonction. Elle ne pose pas `app-ready`
     et n'a ni service worker ni onboarding — `nouvellePage` ne l'attend donc
     pas (sans quoi chaque capture coûterait 20 s de timeout).
     ⚠️ Les trois captures viennent de TROIS PAGES distinctes : l'étape 3 écrase
     l'étape 2 dans le DOM (`goTo` masque les sections), et photographier la
     même page trois fois donnerait trois fois le dernier état. */
  {
    nom: "partager-profil", desc: "Kit — 1. profil de la commune", url: "/partager.html",
    prepare: async (page) => {
      await page.evaluate(() => {
        const c = document.getElementById("f-commune");
        // Le libellé d'exemple du formulaire lui-même : aucune commune réelle
        // n'est nommée, et personne ne peut lire la capture comme un déploiement
        // annoncé ailleurs.
        if (c) c.value = "Mairie de Saint-Exemple";
        const p = document.getElementById("f-pop"); if (p) p.value = "1250";
        const s = document.getElementById("f-sovereign");
        if (s && !s.checked) s.click();       // mode « 100 % français » déplié
      });
      await delai(600);
      // Haut de page : le bandeau « Osez la vôtre » et la première étape. C'est
      // le plan d'ouverture de la scène — ce que voit un élu qui arrive.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await delai(400);
    }
  },
  {
    nom: "partager-cout", desc: "Kit — 2. fonctionnalités et coût estimé", url: "/partager.html",
    prepare: async (page) => {
      await page.evaluate(() => { if (window.goTo) window.goTo(2); });
      await delai(900);
      await page.evaluate(() => {
        const c = document.querySelector("#step-2 .cost-bar");
        if (c) c.scrollIntoView({ block: "center", behavior: "instant" });
        // Remonter de 150 px : centrée, la carte du coût laisse entrer la fiche
        // de l'auteur en bas de capture, qui n'a rien à faire dans le film.
        window.scrollBy(0, -150);
      });
      await delai(500);
    }
  },
  {
    nom: "partager-prompt", desc: "Kit — 3. prompt personnalisé", url: "/partager.html",
    prepare: async (page) => {
      await page.evaluate(() => {
        const c = document.getElementById("f-commune");
        if (c) c.value = "Mairie de Saint-Exemple";
        if (window.goTo) window.goTo(2);
      });
      await delai(600);
      await page.evaluate(() => { if (window.generate) window.generate(); });
      await delai(1200);
      // Sur le prompt lui-même : c'est le livrable du kit, pas le bandeau (déjà
      // vu au premier plan de la scène).
      await page.evaluate(() => {
        const b = document.querySelector("#step-3 .prompt-box");
        if (b) b.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await delai(400);
    }
  }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = process.env.BASE_URL ? null : await servir();
  const fx = fixtures(new Date());

  const navigateur = await chromium.launch({ headless: true, executablePath: CHROME });

  /* Ouvre une page prête : réseau simulé, onboarding passé, app chargée.
     `decalageJours` décale l'horloge ET les données simulées ensemble — sinon
     l'accueil daterait ses cartes d'aujourd'hui sous une horloge de la semaine
     prochaine. */
  async function nouvellePage(decalageJours, chemin) {
    const quand = new Date(Date.now() + (decalageJours || 0) * 86400000);
    const contexte = await navigateur.newContext(OPTIONS_CONTEXTE);
    const p = await contexte.newPage();
    if (decalageJours) await p.clock.install({ time: quand });
    const donnees = decalageJours ? fixtures(quand) : fx;
    await p.route("**/*", (route) => brancher(route, donnees));
    await p.addInitScript(PREPARATION);
    await p.goto(BASE_URL + (chemin || "/index.html"), { waitUntil: "load", timeout: 60000 });
    // `app-ready` n'est posé que par l'application : une page autonome
    // (`partager.html`) ne le pose jamais, et l'attendre coûterait 20 s.
    if (!chemin) {
      await p.waitForFunction(() => document.body.classList.contains("app-ready"), { timeout: 20000 }).catch(() => {});
      await delai(3500);
    } else {
      await delai(1200);
    }
    return p;
  }

  const OPTIONS_CONTEXTE = {
    viewport: VIEWPORT, deviceScaleFactor: 2, locale: "fr-FR",
    timezoneId: "Europe/Paris", colorScheme: "light",
    // ⚠️ UN ANDROÏD, PAS UN IPHONE. Hors mode « application installée », l'écran
    // Actualités d'un iPhone remplace le bouton d'abonnement par un « Installation
    // requise » rouge (`js/mat-actus.js` : iOS ≥ 16 sans `standalone`) — vrai, utile
    // dans l'app, et parfaitement hors sujet dans un film de présentation.
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
  };

  /* Le branchement des requêtes, partagé par toutes les pages. */
  function brancher(route, donnees) {
    const url = route.request().url();
    if (url.startsWith(BASE_URL) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    let chemin = "";
    try { chemin = new URL(url).pathname; } catch (_) { return route.abort(); }
    const trouve = donnees.find(([prefixe]) => chemin.startsWith(prefixe));
    if (trouve) {
      const rep = trouve[1];
      return route.fulfill({
        status: 200,
        contentType: rep.type || "application/json; charset=utf-8",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: rep.text != null ? rep.text : JSON.stringify(rep.json)
      });
    }
    // Tout le reste (Sentry, cartes, Cloudinary, stats…) : coupé net.
    return route.abort();
  }

  const PREPARATION = () => {
    localStorage.setItem("mat_onboarded_v3", "1");
    localStorage.setItem("mat_installed_v3", "dismissed");
    localStorage.setItem("mat_install_tracked", "1");
    localStorage.setItem("mat_stats_optout", "1");
  };

  console.log("📸 Captures du film — " + BASE_URL);
  let page = await nouvellePage(0);

  // Mise au point d'un seul plan : FILM_ECRANS=partager-cout,mel node film/…
  // (sans la variable, tout est repris — c'est ce que fait une régénération.)
  const filtre = (process.env.FILM_ECRANS || "").split(",").map((s) => s.trim()).filter(Boolean);

  for (const e of ECRANS) {
    if (filtre.length && !filtre.includes(e.nom)) continue;
    let pageJetable = null;
    try {
      if (e.jours || e.url) { pageJetable = await nouvellePage(e.jours || 0, e.url); }
      const cible = pageJetable || page;
      if (!e.url) {
        await cible.evaluate(() => document.querySelectorAll(".ov.open").forEach((o) => o.classList.remove("open")));
        await delai(400);
      }
      if (e.fn) {
        await cible.evaluate((f) => { new Function(f)(); }, e.fn);
        await delai(1400);
      } else {
        await cible.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      if (e.prepare) await e.prepare(cible);
      await cible.screenshot({ path: path.join(OUT, e.nom + ".png") });
      console.log("   ✅ " + e.nom + ".png — " + e.desc);
    } catch (err) {
      console.error("   ❌ " + e.nom + " : " + err.message);
    } finally {
      if (pageJetable) await pageJetable.context().close();
    }
  }

  await navigateur.close();
  if (srv) srv.close();
})();
