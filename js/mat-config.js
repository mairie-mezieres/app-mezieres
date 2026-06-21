// ⚙️ CONFIGURATION MAT — Adresse du backend (API Render)
// ──────────────────────────────────────────────────────────────────────────
// ► RÉPLICATION : pour déployer l'app sur une AUTRE commune, remplacez l'URL
//   ci-dessous par celle de VOTRE backend Render. C'est le SEUL endroit à
//   changer côté pages — le service worker garde sa propre copie (voir la
//   constante MAT_API en tête de service-worker.js).
//
// Ce fichier est chargé en PREMIER (script synchrone dans <head>), avant tous
// les autres scripts, pour que window.MAT_API soit défini partout.
window.MAT_API = window.MAT_API || 'https://chatbot-mairie-mezieres.onrender.com';
