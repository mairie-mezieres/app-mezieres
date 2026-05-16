// MAT — Kit de réplication · Wizard de génération de prompt
// Source de vérité parallèle : REPLICATION.md (à la racine du repo)
// En cas de modification ici, mettre à jour REPLICATION.md à l'identique.

(function () {
  'use strict';

  // Catalogue identique à REPLICATION.md section 3
  var FEATURES = [
    { id: 1,  level: 'ess',  defaultOn: true,  cost: 0,    title: 'Actualités municipales',           desc: 'Fil de news avec photos et dates.' },
    { id: 2,  level: 'ess',  defaultOn: true,  cost: 0,    title: 'Agenda des événements',            desc: 'Calendrier des manifestations communales.' },
    { id: 3,  level: 'ess',  defaultOn: true,  cost: 0,    title: 'Trombinoscope des élus',           desc: 'Photos, fonctions, mandats.' },
    { id: 4,  level: 'ess',  defaultOn: true,  cost: 0,    title: 'Horaires & jours fériés',          desc: 'Tableau d\'ouverture + alertes fermeture.' },
    { id: 5,  level: 'ess',  defaultOn: true,  cost: 0,    title: 'Formulaire de contact',            desc: 'Message vers la mairie (anti-spam intégré).' },
    { id: 6,  level: 'reco', defaultOn: false, cost: 0,    title: 'Signalements citoyens',            desc: 'Voirie, éclairage, dépôts sauvages.' },
    { id: 7,  level: 'reco', defaultOn: false, cost: 0,    title: 'Météo locale',                     desc: 'Via open-meteo.com (gratuit, sans clé).' },
    { id: 8,  level: 'reco', defaultOn: false, cost: 0,    title: 'Calendrier collecte des déchets',  desc: 'Avec rappels du prochain ramassage.' },
    { id: 9,  level: 'reco', defaultOn: false, cost: 0,    title: 'Notifications push web',           desc: 'Alertes envoyées sur le téléphone (VAPID).' },
    { id: 10, level: 'reco', defaultOn: false, cost: 0,    title: 'Application installable (PWA)',    desc: 'Fonctionne hors-ligne, installable sur mobile.' },
    { id: 11, level: 'reco', defaultOn: false, cost: 0,    title: 'Mode accessibilité',               desc: 'Contraste élevé, gros texte, daltonisme.' },
    { id: 12, level: 'opt',  defaultOn: false, cost: 0,    title: 'Annuaire des associations',        desc: 'Fiche par association locale.' },
    { id: 13, level: 'opt',  defaultOn: false, cost: 5,    title: 'Annuaire entreprises / commerces', desc: 'Avec logos via Cloudinary (~5 €/mois).' },
    { id: 14, level: 'opt',  defaultOn: false, cost: 0,    title: 'Sondages citoyens',                desc: 'Enquêtes à choix simple ou multiple.' },
    { id: 15, level: 'opt',  defaultOn: false, cost: 0,    title: 'Transports locaux',                desc: 'Horaires bus, prix carburants.' },
    { id: 16, level: 'opt',  defaultOn: false, cost: 0,    title: 'Sentiers & randonnées',            desc: 'Fiches balades avec traces GPX.' },
    { id: 17, level: 'opt',  defaultOn: false, cost: 0,    title: 'Visualiseur PLU / cadastre',       desc: 'Cartes IGN + données data.gouv.' },
    { id: 18, level: 'opt',  defaultOn: false, cost: 10,   title: 'Chatbot IA « assistant »',         desc: 'Répond aux questions des administrés (Claude ou Mistral). Coût réel : 10 à 240 €/mois selon le trafic. Réservé aux profils intermédiaires.' },
    { id: 19, level: 'opt',  defaultOn: false, cost: 0,    title: 'Interface d\'administration',      desc: 'Gérer le contenu sans toucher au code.' },
    { id: 20, level: 'opt',  defaultOn: false, cost: 0,    title: 'Publication automatique Facebook', desc: 'Relai des actualités vers la page Facebook.' }
  ];

  var LEVEL_LABEL = { ess: '🟢 Essentielle', reco: '🟡 Recommandée', opt: '🔵 Optionnelle' };
  var LEVEL_CLASS = { ess: 'pill-ess', reco: 'pill-reco', opt: 'pill-opt' };

  var state = { current: 1 };

  // ── Rendu des fonctionnalités ──
  function renderFeatures() {
    var list = document.getElementById('feat-list');
    list.innerHTML = '';
    FEATURES.forEach(function (f) {
      var lbl = document.createElement('label');
      lbl.className = 'feat' + (f.defaultOn ? ' checked' : '');
      lbl.setAttribute('data-fid', String(f.id));
      lbl.innerHTML =
        '<input type="checkbox" data-fid="' + f.id + '"' + (f.defaultOn ? ' checked' : '') + '>' +
        '<div class="feat-body">' +
          '<div class="feat-title">' + escapeHtml(f.title) +
            ' <span class="feat-pill ' + LEVEL_CLASS[f.level] + '">' + LEVEL_LABEL[f.level] + '</span>' +
          '</div>' +
          '<div class="feat-desc">' + escapeHtml(f.desc) + '</div>' +
          '<div class="feat-cost">' + (f.cost === 0 ? 'Gratuit' : '~' + f.cost + ' €/mois') + '</div>' +
        '</div>';
      list.appendChild(lbl);
    });

    list.addEventListener('change', function (e) {
      if (e.target.tagName !== 'INPUT') return;
      var card = e.target.closest('.feat');
      if (card) card.classList.toggle('checked', e.target.checked);
      updateCost();
    });
  }

  function getChecked() {
    var ids = [];
    document.querySelectorAll('#feat-list input[type=checkbox]:checked').forEach(function (i) {
      ids.push(parseInt(i.getAttribute('data-fid'), 10));
    });
    return FEATURES.filter(function (f) { return ids.indexOf(f.id) !== -1; });
  }

  function updateCost() {
    var total = getChecked().reduce(function (s, f) { return s + f.cost; }, 0);
    document.getElementById('cost-display').textContent = total === 0 ? 'Gratuit' : '~' + total + ' €/mois';
  }

  // ── Navigation entre étapes ──
  function goTo(n) {
    state.current = n;
    [1, 2, 3].forEach(function (i) {
      document.getElementById('step-' + i).classList.toggle('hidden', i !== n);
      var bar = document.getElementById('step-bar-' + i);
      bar.classList.remove('active', 'done');
      if (i < n) bar.classList.add('done');
      else if (i === n) bar.classList.add('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.goTo = goTo;

  // ── Sélecteur radio "niveau" ──
  function initRadioCards() {
    document.querySelectorAll('.radio-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('.radio-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        var input = card.querySelector('input[type=radio]');
        if (input) input.checked = true;
      });
    });
  }

  // ── Slider budget ──
  function initBudget() {
    var s = document.getElementById('f-budget');
    var v = document.getElementById('f-budget-val');
    function refresh() { v.textContent = s.value + ' €/mois'; }
    s.addEventListener('input', refresh);
    refresh();
  }

  // ── Génération du prompt ──
  function generate() {
    var commune = (document.getElementById('f-commune').value || '[À COMPLÉTER — nom de la commune]').trim();
    var pop     = (document.getElementById('f-pop').value || '[À COMPLÉTER]').toString().trim();
    var niveau  = document.querySelector('input[name=niveau]:checked').value;
    var budget  = document.getElementById('f-budget').value;
    var host    = document.getElementById('f-host').value;
    var checked = getChecked();
    var total   = checked.reduce(function (s, f) { return s + f.cost; }, 0);

    // Alerte si débutant + fonctionnalités complexes
    var advancedIds = [9, 18, 19, 20];
    var advancedPicked = checked.filter(function (f) { return advancedIds.indexOf(f.id) !== -1; });
    var notice = document.getElementById('copy-notice');
    notice.className = 'notice';
    if (niveau === 'debutant' && advancedPicked.length > 0) {
      notice.textContent = '⚠ Vous avez coché des fonctionnalités avancées (' +
        advancedPicked.map(function (f) { return f.title; }).join(', ') +
        ') alors que vous avez choisi le profil débutant. Claude vous proposera des versions simplifiées.';
    } else if (total > parseInt(budget, 10)) {
      notice.textContent = 'ℹ Le coût estimé (~' + total + ' €/mois) dépasse votre budget (' + budget + ' €). Décochez certaines options ou augmentez le budget.';
    } else {
      notice.textContent = 'Prompt prêt. Cliquez sur « Copier le prompt » puis ouvrez Claude.';
      notice.className = 'notice success';
    }

    var prompt = buildPrompt({
      commune: commune,
      population: pop,
      niveau: niveau,
      budget: budget,
      host: host,
      features: checked,
      totalCost: total
    });

    document.getElementById('prompt-output').value = prompt;
    renderSummary({ commune: commune, niveau: niveau, budget: budget, host: host, count: checked.length, totalCost: total });
    goTo(3);
  }
  window.generate = generate;

  function renderSummary(s) {
    var nivLabel = s.niveau === 'debutant' ? 'Débutant' : 'Intermédiaire';
    document.getElementById('summary').innerHTML =
      '<div><strong>Commune</strong>' + escapeHtml(s.commune) + '</div>' +
      '<div><strong>Niveau</strong>' + nivLabel + '</div>' +
      '<div><strong>Hébergeur</strong>' + escapeHtml(s.host) + '</div>' +
      '<div><strong>Fonctionnalités</strong>' + s.count + ' coch&eacute;es · ' + (s.totalCost === 0 ? 'Gratuit' : '~' + s.totalCost + ' €/mois') + '</div>';
  }

  function buildPrompt(p) {
    var nivLabel = p.niveau === 'debutant' ? 'Débutant' : 'Intermédiaire';
    var hostLabel = ({
      'netlify': 'Netlify',
      'vercel': 'Vercel',
      'render': 'Render',
      'github-pages': 'GitHub Pages',
      'ovh': 'OVH',
      'autre': 'à recommander selon le niveau'
    })[p.host] || p.host;

    var featLines = p.features.map(function (f) {
      return '- ' + f.title + (f.cost > 0 ? ' (coût estimé : ~' + f.cost + ' €/mois)' : '');
    }).join('\n');

    var contraintes = (p.niveau === 'debutant')
      ? '- Produis UN SEUL fichier index.html auto-portant (HTML + CSS + JS embarqués).\n' +
        '- Aucune dépendance, aucun build, aucun framework. L\'utilisateur double-clique le fichier et ça fonctionne.\n' +
        '- Tout contenu modifiable (actus, élus, événements) dans des variables JavaScript clairement commentées en français en haut du fichier.\n' +
        '- Recommande Netlify Drop pour le déploiement : glisser-déposer le fichier sur https://app.netlify.com/drop, c\'est en ligne en 10 secondes.'
      : '- Produis une structure multi-fichiers inspirée de https://github.com/mairie-mezieres/app-mezieres :\n' +
        '  - index.html à la racine\n' +
        '  - css/main.css\n' +
        '  - js/ avec un module JavaScript par fonctionnalité\n' +
        '  - data/ avec des fichiers JSON pour le contenu modifiable\n' +
        '- HTML5 + CSS3 + JavaScript vanille uniquement. Pas de React, Vue, Angular.\n' +
        '- Inclus un README.md expliquant la structure, comment ajouter une actualité, et la procédure de déploiement sur ' + hostLabel + '.';

    return [
      'Tu es un assistant chargé de générer un site web officiel de mairie, sobre, accessible, conforme RGPD et déployable rapidement.',
      '',
      '## Contexte',
      '- Commune : ' + p.commune,
      '- Population : ' + p.population + ' habitants',
      '- Niveau technique de la personne qui te lit : ' + nivLabel,
      '- Budget mensuel total visé : ' + p.budget + ' € (coût estimé des fonctionnalités cochées : ' + (p.totalCost === 0 ? 'Gratuit' : '~' + p.totalCost + ' €/mois') + ')',
      '- Hébergeur cible : ' + hostLabel,
      '',
      '## Fonctionnalités à intégrer',
      featLines,
      '',
      '## Contraintes techniques',
      contraintes,
      '',
      '## Règles communes',
      '- Langue : français uniquement, ton institutionnel et chaleureux.',
      '- Accessibilité RGAA 4 : contraste AA, navigation clavier, ARIA, alternatives aux images.',
      '- Responsive mobile-first.',
      '- Performance : chargement initial < 1 Mo.',
      '- RGPD : AUCUN cookie tiers, AUCUN tracker (pas de Google Analytics, pas de Meta Pixel). Pour la mesure d\'audience, propose Plausible ou Matomo.',
      '- Privilégier les services publics et open-source quand c\'est possible : open-meteo.com plutôt qu\'OpenWeatherMap, api-adresse.data.gouv.fr plutôt que Google Maps. Pour toute fonction IA générative côté backend, Claude (Anthropic) ou Mistral.',
      '- Génère un gabarit de mentions légales conformes.',
      '',
      '## Format de sortie attendu',
      '1. Résumé de ce que tu as construit (5 lignes max).',
      '2. Le code complet, organisé par fichier, chaque fichier dans son propre bloc avec son nom en en-tête.',
      '3. Instructions de déploiement numérotées, adaptées à ' + hostLabel + '.',
      '4. Termine en proposant 2 ou 3 améliorations possibles pour un second tour.',
      '',
      '## Garde-fous',
      '- Si une information manque dans le contexte, laisse [À COMPLÉTER] visible plutôt que d\'inventer.',
      '- Si une fonctionnalité requiert une clé API ou un compte tiers, liste-les explicitement avant le code, avec liens d\'inscription.',
      '- Refuse poliment toute demande contraire à l\'éthique d\'une publication municipale (contenu politique partisan, données nominatives sensibles).',
      '',
      'Quand tu es prêt, génère le projet complet en une seule réponse.'
    ].join('\n');
  }

  // ── Copier dans le presse-papier ──
  function copyPrompt() {
    var ta = document.getElementById('prompt-output');
    var notice = document.getElementById('copy-notice');

    function feedback(ok, msg) {
      notice.className = 'notice' + (ok ? ' success' : '');
      notice.textContent = msg;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(
        function () { feedback(true, '✓ Prompt copié. Collez-le dans une nouvelle conversation Claude.'); },
        function () { fallbackCopy(ta, feedback); }
      );
    } else {
      fallbackCopy(ta, feedback);
    }
  }
  window.copyPrompt = copyPrompt;

  function fallbackCopy(ta, feedback) {
    ta.focus();
    ta.select();
    try {
      var ok = document.execCommand('copy');
      feedback(ok, ok ? '✓ Prompt copié.' : '⚠ Impossible de copier automatiquement. Sélectionnez le texte puis Ctrl+C.');
    } catch (e) {
      feedback(false, '⚠ Sélectionnez le texte manuellement puis Ctrl+C.');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ── Init ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    renderFeatures();
    updateCost();
    initRadioCards();
    initBudget();
  }
})();
