// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Rend `film/presentation.html` en MP4 (H.264), image par image.
//
//   node film/rendre-video.js
//   FPS=30 SORTIE=film/sortie node film/rendre-video.js
//
// Dépendances : @playwright/test (Chromium) et un ffmpeg compilé avec libx264
// (`@ffmpeg-installer/ffmpeg` fait l'affaire, ou `ffmpeg` dans le PATH).
//
// ⛔ ON NE FILME PAS L'ÉCRAN, ON COMMANDE LE TEMPS. Aucune capture vidéo de
// navigateur ici : chaque image est obtenue en appelant `window.filmSeek(i/FPS)`
// puis en photographiant la page. Conséquences, toutes voulues :
//   • le résultat ne dépend pas de la charge de la machine — pas d'image sautée,
//     pas de saccade, et deux rendus donnent le même fichier ;
//   • une machine lente rend simplement plus lentement, jamais moins bien ;
//   • le ffmpeg livré avec Playwright ne sait faire que du VP8/WebM — il faut
//     donc un vrai ffmpeg, sans quoi le fichier ne s'ouvre ni sur un iPhone ni
//     dans un message.
//
// ⚠️ LES IMAGES SONT ENVOYÉES À FFMPEG PAR UN TUYAU, jamais écrites sur disque :
// 41 s × 30 i/s en PNG 1080×1920, c'est plus de 2 Go de fichiers temporaires
// pour un MP4 de quelques mégaoctets.
"use strict";

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { chromium } = require("@playwright/test");

const FPS = Number(process.env.FPS || 30);
const LARGEUR = Number(process.env.LARGEUR || 1080);
const HAUTEUR = Number(process.env.HAUTEUR || 1920);
const SORTIE = path.resolve(process.env.SORTIE || path.join(__dirname, "sortie"));
const NOM = process.env.NOM || "mat-presentation-vertical";
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

function trouverFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require("@ffmpeg-installer/ffmpeg").path; } catch (_) { /* pas installé */ }
  return "ffmpeg";
}

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const ffmpeg = trouverFfmpeg();
  const fichier = path.join(SORTIE, NOM + ".mp4");

  const navigateur = await chromium.launch({
    headless: true, executablePath: CHROME,
    // Sans cela, Chromium ralentit les pages qu'il croit en arrière-plan : le
    // rendu n'en serait pas faux (le temps est commandé), seulement très lent.
    args: ["--force-color-profile=srgb", "--disable-lcd-text", "--hide-scrollbars"]
  });
  const ctx = await navigateur.newContext({
    viewport: { width: LARGEUR, height: HAUTEUR }, deviceScaleFactor: 1,
    locale: "fr-FR", timezoneId: "Europe/Paris", reducedMotion: "no-preference"
  });
  const page = await ctx.newPage();

  // ⛔ La page ne doit RIEN demander au réseau : elle ne vit que de fichiers du
  // dépôt (captures, polices, QR). Une requête sortante serait une anomalie.
  await page.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith("file://") || u.startsWith("data:")) return route.continue();
    console.warn("   ⚠️  requête sortante refusée : " + u);
    return route.abort();
  });

  const url = "file://" + path.join(__dirname, "presentation.html") + "?rendu=1";
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.filmPret === true, { timeout: 30000 });

  const duree = await page.evaluate(() => window.filmDuree);
  const images = Math.round(duree * FPS);
  console.log("🎬 " + NOM + " — " + duree.toFixed(1) + " s, " + images + " images, "
    + LARGEUR + "×" + HAUTEUR + " @" + FPS + " i/s");

  // Affiche (vignette du post) : prise pendant l'ouverture, titre en place.
  await page.evaluate(() => window.filmSeek(2.4));
  await page.screenshot({ path: path.join(SORTIE, NOM + "-affiche.jpg"), type: "jpeg", quality: 92 });

  const args = [
    "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    // `yuv420p` n'est pas un détail : sans lui, le fichier ne s'ouvre pas sur
    // la moitié des téléphones et QuickTime affiche un écran noir.
    "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.1",
    // Lecture qui démarre avant la fin du téléchargement (fil d'actualité).
    "-movflags", "+faststart",
    fichier
  ];
  const enc = spawn(ffmpeg, args, { stdio: ["pipe", "ignore", "pipe"] });
  let journalFfmpeg = "";
  enc.stderr.on("data", (d) => { journalFfmpeg += d.toString(); });
  const fini = new Promise((resolve, reject) => {
    enc.on("error", reject);
    enc.on("close", (code) => code === 0 ? resolve() : reject(
      new Error("ffmpeg a rendu " + code + "\n" + journalFfmpeg.slice(-2000))));
  });

  // ⚠️ Un `once("error")` par image, c'est 1 230 écouteurs sur le même flux :
  // Node avertit dès le onzième (« MaxListenersExceededWarning »). L'erreur
  // s'écoute donc UNE fois, ici, et l'attente ne porte que sur `drain`.
  let erreurTuyau = null;
  enc.stdin.on("error", (e) => { erreurTuyau = e; });
  const ecrire = (buf) => new Promise((resolve, reject) => {
    if (erreurTuyau) return reject(erreurTuyau);
    if (enc.stdin.write(buf)) return resolve();
    enc.stdin.once("drain", resolve);
  });

  for (let i = 0; i < images; i++) {
    await page.evaluate((t) => window.filmSeek(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    await ecrire(buf);
    if (i % 60 === 0) process.stdout.write("   " + Math.round(100 * i / images) + "%\r");
  }
  enc.stdin.end();
  await fini;
  await navigateur.close();

  const ko = Math.round(fs.statSync(fichier).size / 1024);
  console.log("   ✅ " + fichier + " — " + (ko / 1024).toFixed(1) + " Mo");
  console.log("   ✅ " + path.join(SORTIE, NOM + "-affiche.jpg"));
})();
