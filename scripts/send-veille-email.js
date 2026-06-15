/**
 * Envoi d'un rapport de veille par email via l'API Resend.
 * Lit le rapport HTML généré par Claude Code et l'envoie.
 *
 * Script générique partagé par les workflows de veille (techno, bulletin…).
 *
 * Variables d'environnement requises :
 *   RESEND_API_KEY    - clé API Resend (secret, partagée avec le chatbot)
 *   EMAIL_TO          - adresse destinataire (secret VEILLE_EMAIL_TO)
 *
 * Variables d'environnement optionnelles :
 *   RESEND_FROM       - adresse expéditrice (même convention que le chatbot ;
 *                       défaut « MAT Veille <onboarding@resend.dev> »)
 *   REPORT_PATH       - chemin du rapport HTML à envoyer
 *                       (défaut « rapport-veille.html »)
 *   EMAIL_SUBJECT     - objet de l'email (défaut « Veille technologique MAT - <date> »)
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

const HTML_PATH = (process.env.REPORT_PATH || 'rapport-veille.html').trim();

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

const SUBJECT = (process.env.EMAIL_SUBJECT || `Veille technologique MAT - ${today}`).trim();

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
      subject: SUBJECT,
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
