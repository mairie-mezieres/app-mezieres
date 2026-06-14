/**
 * Envoi du rapport de veille par email via l'API Resend.
 * Lit le fichier rapport-veille.html généré par Claude Code et l'envoie.
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY    - clé API Resend (secret, partagée avec le chatbot)
 *   EMAIL_TO          - adresse destinataire (secret VEILLE_EMAIL_TO)
 *   RESEND_FROM       - adresse expéditrice (optionnel, même convention que le
 *                       chatbot ; défaut « MAT Veille <onboarding@resend.dev> »)
 *
 * Node 20+ requis (fetch global). Aucune dépendance externe.
 */

const fs = require('fs');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_TO = process.env.EMAIL_TO;
const EMAIL_FROM = (process.env.RESEND_FROM || 'MAT Veille <onboarding@resend.dev>').trim();

if (!RESEND_API_KEY || !EMAIL_TO) {
  console.error('Variables manquantes : RESEND_API_KEY et/ou VEILLE_EMAIL_TO (EMAIL_TO).');
  process.exit(1);
}

const HTML_PATH = 'rapport-veille.html';

if (!fs.existsSync(HTML_PATH)) {
  console.error(`Fichier introuvable : ${HTML_PATH}. Claude Code n'a pas généré le rapport.`);
  process.exit(1);
}

const html = fs.readFileSync(HTML_PATH, 'utf8');
if (!html.trim()) {
  console.error('Le rapport HTML est vide.');
  process.exit(1);
}

const today = new Date().toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris'
});

(async () => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: EMAIL_TO.split(',').map((addr) => addr.trim()).filter(Boolean),
      subject: `Veille technologique MAT - ${today}`,
      html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`API Resend : ${response.status} - ${body}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(`Email envoyé (id ${data.id}) à ${EMAIL_TO}.`);
})().catch((error) => {
  console.error('Échec de l’envoi :', error.message);
  process.exit(1);
});
