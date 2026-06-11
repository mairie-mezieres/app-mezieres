/**
 * Veille technologique MAT (Mézières Avec Toi)
 * Exécuté par GitHub Actions (cron hebdomadaire).
 * 1. Interroge l'API Claude avec recherche web sur le stack MAT + innovations civic-tech.
 * 2. Publie le rapport en issue GitHub avec le label "veille".
 *
 * Variables d’environnement requises :
 *   ANTHROPIC_API_KEY  - clé API Anthropic
 *   GITHUB_TOKEN       - fourni automatiquement par Actions
 *   GITHUB_REPOSITORY  - "owner/repo", fourni automatiquement par Actions
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!ANTHROPIC_API_KEY || !GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Variables d’environnement manquantes (ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY).');
  process.exit(1);
}

const MODEL = 'claude-sonnet-4-6';

const STACK = `
Stack technique de la PWA :
- Frontend : PWA vanilla JS hébergée sur GitHub Pages, Service Worker, notifications push web
- Backend : Node.js / Express hébergé sur Render.com
- Base de données : Upstash Redis (REST API)
- IA : Mistral AI (chatbot principal), Claude Haiku (fallback)
- Cartographie : Leaflet.js + GeoJSON (randonnée, PLU)
- Intégrations : Trello, Facebook Graph API, Google Calendar, Open-Meteo, Météo-France, IGN Apicarto, api-adresse.data.gouv.fr, Cloudinary
- CI/CD : GitHub Actions, tests Playwright, monitoring Sentry, EcoIndex, Lighthouse
Contexte : portail citoyen d’une commune rurale française de moins de 1 000 habitants, audience majoritairement séniors, exigences fortes d’accessibilité et de souveraineté numérique.
`;

const PROMPT = `Tu es un agent de veille technologique pour une PWA municipale française.
${STACK}
Effectue des recherches web récentes (moins de 30 jours si possible) et produis un rapport de veille en français, en Markdown, structuré ainsi :

## 1. Mises à jour du stack
Nouvelles versions, breaking changes, failles de sécurité ou dépréciations concernant : Leaflet.js, Node.js/Express, Upstash Redis, Render, GitHub Pages/Actions, API Mistral, API Anthropic, Service Workers / PWA (Chrome, Safari iOS), Playwright, Sentry.

## 2. Innovations civic-tech et communes
Nouvelles fonctionnalités vues dans d’autres applications de communes françaises ou portails citoyens (France ou Europe) qui pourraient inspirer une commune rurale : participation citoyenne, accessibilité séniors, IA souveraine, signalements, etc.

## 3. Accessibilité et séniors
Évolutions des bonnes pratiques, RGAA, outils ou patterns UX pertinents pour un public âgé.

## 4. Recommandations actionnables
3 à 5 actions concrètes, priorisées (haute / moyenne / basse), avec effort estimé.

Règles : cite tes sources (liens), reste factuel, ne mentionne que des informations vérifiées par recherche web. Si une section n’a rien de nouveau cette semaine, indique-le brièvement.`;

async function callClaude() {
  let messages = [{ role: 'user', content: PROMPT }];
  let data;

  // La recherche web côté serveur peut interrompre le tour (stop_reason
  // "pause_turn") : renvoyer la conversation telle quelle pour reprendre.
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API Anthropic : ${response.status} - ${body}`);
    }

    data = await response.json();
    if (data.stop_reason !== 'pause_turn') {
      break;
    }
    messages = [
      { role: 'user', content: PROMPT },
      { role: 'assistant', content: data.content }
    ];
  }

  const report = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  if (!report.trim()) {
    throw new Error('Rapport vide retourné par l’API.');
  }
  return report;
}

async function createIssue(report) {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      title: `Veille technologique MAT - ${today}`,
      body: `${report}\n\n---\n*Rapport généré automatiquement par l’agent de veille (GitHub Actions + API Claude avec recherche web).*`,
      labels: ['veille']
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API GitHub : ${response.status} - ${body}`);
  }

  const issue = await response.json();
  console.log(`Issue créée : ${issue.html_url}`);
}

(async () => {
  try {
    console.log('Lancement de la veille technologique...');
    const report = await callClaude();
    await createIssue(report);
    console.log('Veille terminée avec succès.');
  } catch (error) {
    console.error('Échec de la veille :', error.message);
    process.exit(1);
  }
})();
