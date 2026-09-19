// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Pose une musique sur le film et écrit une seconde version, sonore.
//
//   node film/ajouter-musique.js film/musique/<piste>.mp3
//
// Sortie : film/sortie/mat-presentation-vertical-musique.mp4
//
// ⛔ LE FILM MUET RESTE LA RÉFÉRENCE, et cette version s'ajoute à côté. Deux
// raisons : les réseaux lisent en sourdine par défaut (tout ce qui compte est
// donc écrit à l'écran, et le restera), et une projection dans la salle de la
// mairie ou un envoi par mail se passe très bien de fond musical.
//
// ⚠️ L'IMAGE N'EST PAS RÉENCODÉE (`-c:v copy`) : on ne recompresse pas un H.264
// pour lui coller une piste audio — ce serait une génération de perte pour
// rien, et six minutes de calcul.
//
// ⚠️ `-map 1:a:0` N'EST PAS DÉCORATIF : un MP3 étiqueté porte souvent sa
// pochette comme un flux VIDÉO (un PNG). Sans cette sélection explicite, ffmpeg
// attrape la pochette et produit un fichier à deux pistes vidéo, que certains
// lecteurs affichent… en montrant la pochette.
//
// ⚠️ ORDRE DES FILTRES : `loudnorm` AVANT les fondus. L'inverse laisse la
// normalisation, qui travaille par fenêtres, remonter le volume pendant le
// fondu de sortie — le film se termine alors sur un petit sursaut sonore.
"use strict";

const path = require("path");
const fs = require("fs");
const { execFileSync, spawnSync } = require("child_process");

const FILM = process.env.FILM || path.join(__dirname, "sortie", "mat-presentation-vertical.mp4");
const PISTE = process.argv[2];
const SORTIE = process.env.SORTIE
  || path.join(__dirname, "sortie", "mat-presentation-vertical-musique.mp4");

// Fondus : court à l'entrée, long à la sortie — le film se termine sur un QR
// code qu'on laisse le temps de photographier, la musique doit s'effacer avant.
const FONDU_ENTREE = 1.2;
const FONDU_SORTIE = 2.6;

function trouverFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require("@ffmpeg-installer/ffmpeg").path; } catch (_) { /* pas installé */ }
  return "ffmpeg";
}

/* Durée d'un fichier, lue dans ce que ffmpeg raconte sur stderr : évite
   d'exiger ffprobe, qui n'accompagne pas toujours ffmpeg. */
function duree(ffmpeg, fichier) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", fichier], { encoding: "utf8" });
  const m = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(r.stderr || "");
  if (!m) throw new Error("durée illisible pour " + fichier);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

if (!PISTE) {
  console.error("Usage : node film/ajouter-musique.js <piste audio>");
  process.exit(1);
}
for (const f of [FILM, PISTE]) {
  if (!fs.existsSync(f)) { console.error("Fichier introuvable : " + f); process.exit(1); }
}

const ffmpeg = trouverFfmpeg();
const d = duree(ffmpeg, FILM);
const debutFondu = Math.max(0, d - FONDU_SORTIE);
const musique = duree(ffmpeg, PISTE);

console.log("🎵 " + path.basename(PISTE) + " (" + musique.toFixed(1) + " s) → film de " + d.toFixed(1) + " s");
if (musique < d) {
  console.warn("   ⚠️  la piste est PLUS COURTE que le film : la fin sera muette.");
}

execFileSync(ffmpeg, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-i", FILM,
  "-i", PISTE,
  "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "copy",
  "-af", "loudnorm=I=-16:TP=-1.5:LRA=11"
    + ",afade=t=in:st=0:d=" + FONDU_ENTREE
    + ",afade=t=out:st=" + debutFondu.toFixed(2) + ":d=" + FONDU_SORTIE,
  // -16 LUFS : la cible des réseaux sociaux. Plus fort, ils réduisent
  // eux-mêmes et le rendu devient imprévisible d'une plateforme à l'autre.
  "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
  "-shortest", "-movflags", "+faststart",
  SORTIE
], { stdio: "inherit" });

const mo = fs.statSync(SORTIE).size / 1024 / 1024;
console.log("   ✅ " + SORTIE + " — " + mo.toFixed(1) + " Mo");
