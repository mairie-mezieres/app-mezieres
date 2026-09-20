// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Réponses simulées du backend, pour la capture des écrans du film.
//
// ⛔ POURQUOI ON NE BRANCHE PAS LE VRAI BACKEND. Deux raisons, et la seconde
// suffirait seule :
//   1. `POST /stats/track` compte un visiteur unique par `deviceId` tiré d'un
//      `localStorage` vierge — un navigateur piloté, c'est un habitant de plus
//      au tableau de bord de la mairie. C'est exactement ce qui a pollué les
//      statistiques du 31 août au 17 septembre 2026 (ADR-0048).
//   2. Un écran capturé sur des données réelles fige, dans un film qui sera
//      diffusé des mois, une actualité datée et parfois des contenus
//      d'habitants (idées, signalements).
//
// ⚠️ CE QUE CES DONNÉES SONT. Des ILLUSTRATIONS plausibles, pas des
// informations. Les seuls contenus repris du dépôt à l'identique sont ceux qui
// sont vrais et stables : la réponse de MEL sur les horaires de bricolage
// (arrêté préfectoral du Loiret du 1er mars 1999, `lib/mel.js` du backend) et
// les coordonnées de la mairie. Tout le reste — actualités, agenda, prix des
// carburants, température — est fabriqué ici. La mairie relit le film avant
// publication ; ne jamais y faire figurer une annonce qui pourrait se lire
// comme officielle (coupure d'eau, fermeture, date de scrutin…).
"use strict";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const isoH = (d) => iso(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
  "août", "septembre", "octobre", "novembre", "décembre"];

function jourDecale(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/* ── Météo ────────────────────────────────────────────────────────────────
   Forme = payload open-meteo brut, tel que `lib/meteo.js` le relaie, avec
   `past_days=1` : ⚠️ `daily[0]` est HIER (ADR-0007 du backend). Une belle
   journée de septembre sans vigilance — un film n'annonce pas d'alerte. */
function meteo(now) {
  const hier = jourDecale(now, -1);
  const jours = [];
  for (let i = 0; i < 10; i++) jours.push(iso(jourDecale(hier, i)));

  const heures = [];
  const t0 = new Date(hier);
  t0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 24 * 10; i++) heures.push(isoH(new Date(t0.getTime() + i * 3600000)));

  // Courbe journalière douce : 12 °C la nuit, 22 °C l'après-midi.
  const tempHoraire = heures.map((h) => {
    const heure = Number(h.slice(11, 13));
    return Math.round((17 + 5 * Math.sin(((heure - 9) / 24) * 2 * Math.PI)) * 10) / 10;
  });

  return {
    forecast: {
      latitude: 47.79, longitude: 1.79, timezone: "Europe/Paris",
      current: {
        time: isoH(now), temperature_2m: 21.4, apparent_temperature: 20.8,
        weather_code: 2, wind_speed_10m: 11.2, wind_direction_10m: 230,
        relative_humidity_2m: 62, pressure_msl: 1018.4, precipitation: 0,
        wind_gusts_10m: 24.1
      },
      hourly: {
        time: heures,
        temperature_2m: tempHoraire,
        apparent_temperature: tempHoraire.map((t) => Math.round((t - 0.6) * 10) / 10),
        precipitation_probability: heures.map((_, i) => (i % 24 > 14 && i % 24 < 19 ? 15 : 5)),
        precipitation: heures.map(() => 0),
        weather_code: heures.map((_, i) => (i % 24 > 14 && i % 24 < 19 ? 3 : 2)),
        wind_speed_10m: heures.map(() => 11),
        wind_direction_10m: heures.map(() => 230),
        relative_humidity_2m: heures.map(() => 62),
        wind_gusts_10m: heures.map(() => 24),
        surface_pressure: heures.map(() => 1018)
      },
      daily: {
        time: jours,
        weather_code: [3, 2, 1, 2, 3, 61, 3, 2, 1, 2],
        temperature_2m_max: [21.8, 23.1, 24.0, 22.6, 21.2, 19.4, 20.8, 22.3, 23.6, 22.9],
        temperature_2m_min: [11.2, 12.4, 13.1, 12.8, 12.0, 11.6, 10.9, 11.8, 12.6, 13.0],
        apparent_temperature_max: [21.0, 22.4, 23.3, 21.9, 20.5, 18.7, 20.1, 21.6, 22.9, 22.2],
        apparent_temperature_min: [10.4, 11.6, 12.3, 12.0, 11.2, 10.8, 10.1, 11.0, 11.8, 12.2],
        precipitation_sum: [0, 0, 0, 0, 0.4, 5.2, 0.6, 0, 0, 0],
        uv_index_max: [4.1, 4.6, 4.8, 4.4, 3.9, 2.8, 3.6, 4.2, 4.5, 4.3],
        sunrise: jours.map((j) => j + "T07:38"),
        sunset: jours.map((j) => j + "T19:52"),
        wind_direction_10m_dominant: jours.map(() => 230),
        wind_gusts_10m_max: [24, 22, 19, 21, 26, 38, 29, 23, 20, 21]
      }
    },
    vigilance: null,
    secheresse: null,
    stale: false,
    cacheTime: Date.now(),
    source: "film-fixtures"
  };
}

/* ── Actualités ───────────────────────────────────────────────────────────
   Trois publications volontairement intemporelles et sans engagement de la
   commune : elles illustrent la MISE EN FORME, elles n'annoncent rien. */
/* ⚠️ AUCUNE PHOTO ICI, ET C'EST VOULU. Les vraies photos d'actualité vivent sur
   Cloudinary, que la capture coupe ; y mettre une image du dépôt, c'est illustrer
   « la bibliothèque » avec le logo du comité des fêtes — un contresens que
   personne ne relit une fois le film encodé. Sans photo, la liste montre trois
   publications au lieu d'une : c'est aussi ce qui se lit le mieux à l'écran.

   ⛔ ET AUCUNE ANNONCE. La première version de ce film titrait « La bibliothèque
   vous accueille le mercredi » : une phrase inventée, datée d'hier, signée de la
   mairie, diffusée à des centaines d'habitants sur Facebook. Un titre de film ne
   se lit pas comme un exemple — il se lit comme une information de la commune.
   Ces trois lignes ne nomment donc que des RUBRIQUES, qui n'affirment rien :
   aucun horaire, aucun lieu, aucune décision, aucune date dans le titre.
   ⚠️ Si la mairie préfère, remplacer par trois VRAIS titres déjà publiés sur sa
   page — c'est encore mieux, et c'est sans risque. */
function actus(now) {
  const dateLisible = (d) => d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear();
  return {
    actus: [
      {
        id: "film-1",
        title: "Compte rendu du conseil municipal",
        text: "Les délibérations du conseil, publiées après chaque séance.",
        date: dateLisible(jourDecale(now, -1)),
        likes: 12
      },
      {
        id: "film-2",
        title: "Travaux et voirie dans la commune",
        text: "L'avancement des chantiers et les circulations modifiées.",
        date: dateLisible(jourDecale(now, -4)),
        likes: 23
      },
      {
        id: "film-3",
        title: "Vie associative et manifestations",
        text: "Ce que préparent les associations de Mézières-lez-Cléry.",
        date: dateLisible(jourDecale(now, -8)),
        likes: 9
      }
    ]
  };
}

/* ── Suivi des signalements ───────────────────────────────────────────────
   `GET /api/signalements`. On montre le MÉCANISME — trois statuts et une
   réponse de la mairie — jamais un incident précis : ni rue, ni numéro, ni
   engagement de délai. */
function signalements(now) {
  const j = (n) => jourDecale(now, n).toISOString();
  return {
    signalements: [
      {
        id: "f1", cat: "💡 Éclairage public", status: "resolved",
        statusLabel: "Résolu", date: j(-9), desc: "Lampadaire éteint.",
        comments: [{ date: j(-6), text: "Ampoule remplacée par les services techniques." }]
      },
      {
        id: "f2", cat: "🛣️ Voirie", status: "in_progress",
        statusLabel: "En cours", date: j(-4), desc: "Nid-de-poule signalé.",
        comments: [{ date: j(-3), text: "Intervention planifiée." }]
      },
      {
        id: "f3", cat: "🗑️ Propreté", status: "pending",
        statusLabel: "À traiter", date: j(-1), desc: "Corbeille pleine."
      }
    ],
    bugs: []
  };
}

/* ── Boîte à idées ────────────────────────────────────────────────────────
   Même règle : des idées d'habitants ne s'inventent pas au nom de personne.
   Celles-ci sont des propositions génériques, sans auteur et sans promesse. */
function idees(now) {
  return {
    idees: [
      { id: "i1", cat: "Cadre de vie", text: "Installer un banc supplémentaire près de l'aire de jeux.",
        votes: 34, createdAt: jourDecale(now, -12).toISOString(), status: "studying",
        adminComment: "Proposition à l'étude par la commission." },
      { id: "i2", cat: "Mobilité", text: "Un abri à vélos devant la salle communale.",
        votes: 21, createdAt: jourDecale(now, -20).toISOString() },
      { id: "i3", cat: "Environnement", text: "Planter des arbres le long du chemin piéton.",
        votes: 17, createdAt: jourDecale(now, -26).toISOString() }
    ]
  };
}

/* ── Agenda (ICS) ─────────────────────────────────────────────────────────
   `GET /calendar-proxy` renvoie du texte iCalendar, que l'app parse
   elle-même (`parseIcalDetailed`). */
function agendaIcs(now) {
  const stamp = (d, h, m) =>
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(h) + pad(m) + "00";
  const evts = [
    { j: 2, h: 9, m: 0, hf: 18, mf: 0, t: "Brocante de la commune", l: "Place de la Mairie" },
    { j: 6, h: 20, m: 30, hf: 22, mf: 0, t: "Conseil municipal", l: "Salle du conseil" },
    { j: 11, h: 14, m: 0, hf: 17, mf: 0, t: "Après-midi jeux de société", l: "Salle communale" },
    { j: 18, h: 10, m: 0, hf: 12, mf: 0, t: "Nettoyage des bords de Loire", l: "Parking du Bréau" }
  ];
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MAT//film//FR",
    ...evts.flatMap((e) => {
      const d = jourDecale(now, e.j);
      return [
        "BEGIN:VEVENT",
        "UID:film-" + e.j + "@mezieres-lez-clery.fr",
        "DTSTART:" + stamp(d, e.h, e.m),
        "DTEND:" + stamp(d, e.hf, e.mf),
        "SUMMARY:" + e.t,
        "LOCATION:" + e.l,
        "END:VEVENT"
      ];
    }),
    "END:VCALENDAR"
  ].join("\r\n");
}

/* ── Carburant ────────────────────────────────────────────────────────────
   Deux dates par station (ADR-0047 : chaque carburant porte la sienne). */
function carburant(now) {
  const court = (d) => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  const h = (d, hh) => {
    const x = new Date(d); x.setHours(hh, 5, 0, 0); return x.toISOString();
  };
  const j0 = now, j1 = jourDecale(now, -1), j3 = jourDecale(now, -3);
  const st = (nom, sp, go, dSp, dGo) => ({
    nom, sp95: sp, gazole: go,
    sp95Maj: court(dSp), sp95MajISO: h(dSp, 8),
    gazoleMaj: court(dGo), gazoleMajISO: h(dGo, 8),
    maj: court(dSp < dGo ? dSp : dGo), majISO: h(dSp < dGo ? dSp : dGo, 8)
  });
  return {
    clery: st("Intermarché Cléry-Saint-André", 1.719, 1.659, j0, j0),
    meung: st("Super U Meung-sur-Loire", 1.729, 1.669, j0, j1),
    olivet: st("E.Leclerc Olivet", 1.699, 1.639, j1, j1),
    coudray: st("Relais du Coudray", 1.759, 1.699, j3, j3),
    beaugency: st("E.Leclerc Beaugency", 1.709, 1.649, j1, j0),
    saintpryve: st("Intermarché Saint-Pryvé", 1.739, 1.679, j1, j1),
    _ts: Date.now()
  };
}

/* ── MEL ──────────────────────────────────────────────────────────────────
   ⚠️ RÉPONSE REPRISE TELLE QUELLE de la règle `bruit_travaux_horaires`
   (`lib/mel.js`, dépôt chatbot-mairie-mezieres). Elle est VRAIE : arrêté
   préfectoral du Loiret du 1er mars 1999. Ne jamais la reformuler ici pour
   « faire plus court à l'écran » — un horaire faux dans un film se diffuse
   mieux qu'il ne se corrige. */
const MEL_QUESTION = "À quelle heure ai-je le droit de tondre ?";
const MEL_REPONSE =
  "🔇 Les travaux de bricolage et de jardinage bruyants (tondeuse, taille-haie, " +
  "tronçonneuse, perceuse…) sont encadrés à Mézières-lez-Cléry par l'arrêté " +
  "préfectoral du Loiret du 1er mars 1999. Ils sont autorisés uniquement : " +
  "• du lundi au vendredi de 8h30 à 12h et de 14h30 à 19h30 ; • le samedi de 9h " +
  "à 12h et de 15h à 19h ; • le dimanche et les jours fériés de 10h à 12h. " +
  "En dehors de ces plages, ils sont interdits.";

/* ── Table de routage ─────────────────────────────────────────────────────
   Clé = début du chemin de l'URL backend. La capture répond par le premier
   préfixe qui correspond ; tout le reste reçoit `{}` en 200, ce qui suffit
   à l'app (elle est écrite pour un backend absent). */
function fixtures(now) {
  const d = now || new Date();
  return [
    ["/meteo/commune", { json: meteo(d) }],
    ["/actus", { json: actus(d) }],
    ["/calendar-proxy", { text: agendaIcs(d), type: "text/calendar" }],
    ["/carburant", { json: carburant(d) }],
    ["/mel", { json: { reply: MEL_REPONSE, provider: "direct" } }],
    ["/info-banner", { json: { active: false } }],
    ["/config/features", { json: {} }],
    ["/config/mascotte", { json: {} }],
    ["/api/signalements", { json: signalements(d) }],
    ["/idees", { json: idees(d) }],
    ["/sondages", { json: { sondages: [] } }],
    ["/docs/featured", { json: {} }],
    ["/events-locaux", { json: { events: [] } }],
    ["/health", { json: { ok: true } }]
  ];
}

module.exports = { fixtures, MEL_QUESTION, MEL_REPONSE };
