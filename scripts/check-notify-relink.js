#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
"use strict";

/**
 * Contrôle du re-raccordement des tokens de suivi (signalements, idées,
 * demandes, bugs) à l'abonnement push de l'habitant.
 *
 * Pourquoi un contrôle de source plutôt qu'un test end-to-end : le service
 * worker est bloqué sous Playwright (profil vierge, ADR-0006) et l'événement
 * `pushsubscriptionchange` n'est déclenchable par aucun test — c'est le
 * navigateur qui décide, des semaines après l'abonnement. Le seul garde-fou
 * possible est donc statique. Voir ADR-0034.
 *
 * Les trois invariants verrouillés ici correspondent à trois façons dont la
 * réponse de la mairie a cessé d'arriver, sans le moindre signal :
 *
 *   1. `_registerNotifyTokensSafe` doit être appelé AVANT le garde-fou
 *      `PUSH_ACTIVE_KEY`. Ce drapeau n'est posé que par le menu Notifications
 *      et le prompt post-installation : un habitant ayant activé les alertes
 *      depuis le formulaire d'un signalement ne l'a jamais. Placer le
 *      re-raccordement après, c'est ne jamais le faire — pour exactement les
 *      abonnements qui en dépendent.
 *   2. Le handler `pushsubscriptionchange` du service worker doit rappeler
 *      `/notify/register-token`. Il re-synchronisait actus, déchets et météo,
 *      mais pas les tokens : une rotation d'endpoint survenue sans onglet
 *      ouvert coupait définitivement les réponses de la mairie.
 *   3. La clé de Cache API doit être la MÊME des deux côtés. Le client écrit,
 *      le service worker lit ; le localStorage lui étant inaccessible, une
 *      divergence de nom rendrait le point 2 muet sans rien casser d'autre.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CACHE_KEY = "mat-notify-tokens";
const ENDPOINT = "/notify/register-token";

// ⚠️ La clé se cherche ENTRE GUILLEMETS, jamais en sous-chaîne nue :
// `'mat-notify-tokens-v2'.includes('mat-notify-tokens')` vaut `true`, donc un
// renommage d'un seul côté passait le contrôle au vert. C'est le sabotage n° 3
// qui l'a montré — le contrôle ne mesurait pas ce qu'il annonçait.
const CACHE_KEY_LITERAL = "'" + CACHE_KEY + "'";

const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ── 1. L'ordre dans js/mat-pwa-notif.js ────────────────────────
const notif = read("js/mat-pwa-notif.js");

// ⚠️ Le point-virgule n'est pas décoratif : sans lui, `indexOf` tombait sur la
// DÉCLARATION `function _registerNotifyTokensSafe(sub) {`, située en haut du
// fichier, donc toujours avant le garde-fou. Le contrôle mesurait la position
// de la fonction, pas celle de son appel, et restait vert quel que soit
// l'ordre réel. Révélé par le sabotage n° 1.
const iRelink = notif.indexOf("_registerNotifyTokensSafe(sub);");
const iGate = notif.indexOf("if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;");

if (iRelink === -1) {
  errors.push(
    "js/mat-pwa-notif.js : appel `_registerNotifyTokensSafe(sub)` introuvable dans " +
    "`checkAndRenewPushSubscription`. Sans lui, les tokens de suivi ne sont jamais " +
    "re-raccordés et les réponses de la mairie n'arrivent plus."
  );
} else if (iGate === -1) {
  errors.push(
    "js/mat-pwa-notif.js : garde-fou `PUSH_ACTIVE_KEY` introuvable — ce contrôle ne " +
    "mesure donc plus rien. Mettre à jour le repère, ou ce script."
  );
} else if (iRelink > iGate) {
  errors.push(
    "js/mat-pwa-notif.js : `_registerNotifyTokensSafe(sub)` est appelé APRÈS le " +
    "garde-fou `PUSH_ACTIVE_KEY`. Un habitant ayant activé les notifications depuis " +
    "le formulaire d'un signalement n'a jamais ce drapeau : son token ne sera donc " +
    "jamais re-raccordé, et il ne recevra plus la réponse de la mairie."
  );
}

if (!notif.includes(CACHE_KEY_LITERAL)) {
  errors.push(
    "js/mat-pwa-notif.js : la clé de Cache API `" + CACHE_KEY + "` n'est plus écrite. " +
    "Le service worker n'a pas accès au localStorage : sans cette copie, il ne peut " +
    "pas re-raccorder les tokens lors d'un `pushsubscriptionchange`."
  );
}

// ── 2 & 3. Le handler du service worker ────────────────────────
const sw = read("service-worker.js");

const iHandler = sw.indexOf("addEventListener('pushsubscriptionchange'");
if (iHandler === -1) {
  errors.push(
    "service-worker.js : handler `pushsubscriptionchange` introuvable — ce contrôle " +
    "ne mesure plus rien. Mettre à jour le repère, ou ce script."
  );
} else {
  const handler = sw.slice(iHandler);
  if (!handler.includes(ENDPOINT)) {
    errors.push(
      "service-worker.js : le handler `pushsubscriptionchange` ne rappelle pas `" +
      ENDPOINT + "`. Il re-synchronise les actus, les déchets et la météo, mais pas " +
      "les tokens de suivi : une rotation d'endpoint survenue sans onglet ouvert " +
      "coupe définitivement les réponses de la mairie."
    );
  }
  if (!handler.includes(CACHE_KEY_LITERAL)) {
    errors.push(
      "service-worker.js : le handler `pushsubscriptionchange` ne relit pas la clé `" +
      CACHE_KEY + "` du Cache API. C'est la seule source de tokens accessible depuis " +
      "un service worker (pas de localStorage) — les deux côtés doivent employer " +
      "exactement le même nom de clé."
    );
  }
}

if (errors.length) {
  console.error("✗ Re-raccordement des tokens de notification — " + errors.length + " problème(s) :\n");
  errors.forEach((e) => console.error("  • " + e + "\n"));
  process.exit(1);
}

console.log(
  "✓ Tokens de suivi : re-raccordement placé avant le garde-fou `PUSH_ACTIVE_KEY`,\n" +
  "  relayé par le service worker sur `pushsubscriptionchange`, clé de cache commune."
);
