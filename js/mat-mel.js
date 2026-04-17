/* ════════════════════════════════════════════════════════════
   MAT — MEL Assistante IA v3.7.2 (Phase 3)
   ════════════════════════════════════════════════════════════
   Contenu :
   - _PLU_DATA_FALLBACK  : base PLU embarquée (résilience offline 1er lancement)
   - _MEL_TREE_FALLBACK  : arbre de décision embarqué
   - PLU_DATA, MEL_TREE  : variables mutables, initialisées au fallback,
                            puis écrasées par les JSON externes dès qu'ils
                            arrivent via loadMelData() (arrière-plan).
   - loadMelData()       : fetch non-bloquant de data/plu-data.json et
                            data/mel-tree.json — appelé depuis mat-init.js.
   - PLU helpers : pluNormalizeZone, pluGetZone, pluRenderAuth, pluRenderZoneCard, pluBuildAnswer
   - MEL UI     : melShowTree, melSelectCat, melSelectQuestion, _showPluAnswer, pluCloseAnswer, pluSwitchTab
   - Direct     : _renderDirectAnswer, _showDirectAnswer, melOpenChatFromDirect
   - Chat       : melOpenChat, melResetTree, addMsg, showTyping, sendMel, MEL_THEME_SUGGESTIONS
   - Zone PLU   : melFindZoneByAddr, melFindZoneByGPS, _fetchZonePLU, _showManualZoneSelector, _setZoneResult

   ── PHASE 3 : externalisation des données ──
   Les données PLU et MEL_TREE vivent désormais dans :
     - data/plu-data.json
     - data/mel-tree.json
   Pour modifier une zone, une question ou une réponse, éditez le JSON
   sur GitHub directement — AUCUN changement de code nécessaire.
   Le fallback embarqué ci-dessous garantit que MEL fonctionne même si
   les fichiers JSON ne sont pas accessibles (offline, 404, etc.).
   ════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════════════════
// PLU — Fallback embarqué (extrait du règlement 4.1)
// ⚠️ Ne pas modifier ce bloc : éditez data/plu-data.json à la place
// ════════════════════════════════════════════════════════
const _PLU_DATA_FALLBACK = {
  zones: {
    Ua: {
      label: "Ua – Centre-bourg / hameaux anciens",
      description: "Secteurs bâtis les plus anciens du bourg. Vocation principale : habitat.",
      interdictions: ["Industrie","Agriculture","Carrières","Caravanes/camping","ICPE soumises à autorisation"],
      emprise: "50% max", espaces_verts: "non réglementé",
      hauteur_principale: "6 m max à l'égout du toit", hauteur_annexe: "non limitée spécifiquement",
      recul_voie_principale: "à l'alignement ou ≥ 2 m (si clôture assure la continuité)",
      recul_voie_annexe: "à l'alignement ou ≥ 3 m", recul_voie_abri: "≥ 3 m",
      recul_sep: "en contiguïté ou ≥ 3 m",
      toiture_principale: "≥ 2 pentes ≥ 35°, ardoises ou tuiles plates",
      toiture_annexe_sup30: "≥ 1 pente ≥ 25°, ardoises ou tuiles plates",
      toiture_annexe_inf30: "pente ≥ 25°, teinte ardoise ou brun rouge",
      cloture_voie: "mur plein ou claire-voie, max 1,50 m", cloture_sep: "mur plein ou grillage/treillage + haie, max 1,80 m",
      cloture_carrefour: "max 1,20 m sur 20 m", cloture_dp: true,
      abri_materiaux: "pierre, brique, parpaing enduit ou bois",
      piscine: "✅ Autorisée (emprise totale ≤ 50%)", stationnement: "2 places min/logement",
      rdc_max: "≤ 0,50 m / sol naturel"
    },
    Ub: {
      label: "Ub – Habitat résidentiel récent",
      description: "Secteur bâti à dominante d'habitat construit principalement dans la 2e moitié du XXe siècle.",
      interdictions: ["Industrie","Agriculture/sylviculture","Dépôts à l'air libre","Carrières","Caravanes/camping"],
      emprise: "30% max", espaces_verts: "30% min (libre de construction et imperméabilisation)",
      hauteur_principale: "4 m max à l'égout du toit", hauteur_annexe: "2,5 m max",
      recul_voie_principale: "≥ 5 m", recul_voie_annexe: "à l'alignement ou ≥ 5 m", recul_voie_abri: "≥ 3 m",
      recul_sep: "en contiguïté ou ≥ 3 m",
      toiture_principale: "≥ 2 pentes ≥ 35°, ardoises ou tuiles plates",
      toiture_annexe_sup30: "≥ 1 pente ≥ 25°, ardoises ou tuiles plates",
      toiture_annexe_inf30: "pente ≥ 25°, teinte ardoise ou brun rouge",
      cloture_voie: "mur à claire-voie UNIQUEMENT, max 1,50 m", cloture_sep: "mur plein pierre/maçonnerie ou grillage/treillage + haie, max 1,80 m",
      cloture_carrefour: "max 1,20 m sur 20 m", cloture_dp: true,
      abri_materiaux: "pierre, brique, parpaing enduit ou bois — tôle ondulée INTERDITE",
      piscine: "✅ Autorisée (emprise ≤ 30%, espaces verts ≥ 30%)", stationnement: "2 places min/logement",
      rdc_max: "≤ 0,30 m / sol naturel",
      facades: "palettes traditionnelles — blanc pur et couleurs vives INTERDITS"
    },
    Ub1: {
      label: "Ub1 – Clos de Manthelon (prescriptions spécifiques)",
      description: "Extension du lotissement Clos de Manthelon. Mêmes règles que Ub + prescriptions spécifiques ci-dessous.",
      interdictions: ["Terrasses en toiture","Toits à un seul versant (sauf annexes)","Toits à 4 pans","Tuiles couleur ardoise","Tôle ondulée","Amiante-ciment","Plaques ciment en clôture"],
      emprise: "30% max + implantation dans zones constructibles du plan parcellaire",
      espaces_verts: "30% min + 1 arbre haute tige / 250 m²",
      hauteur_principale: "4 m max (égout) ET 8 m max absolu", hauteur_annexe: "2,5 m max",
      recul_voie_principale: "≥ 5 m", recul_voie_abri: "≥ 5 m", recul_sep: "≥ 3 m",
      toiture_principale: "2 pentes entre 40° et 45°, tuiles plates TERRE CUITE uniquement, min 22 tuiles/m², faîtage selon plan parcellaire",
      cloture_voie: "haie végétale ≥ 3 variétés + grillage vert max 1,50 m (retrait 0,80 m de la limite)",
      cloture_sep: "grillage vert max 1,50 m + haie max 1,80 m — plaques ciment INTERDITES",
      cloture_portail: "retrait 5 m espaces communs, hauteur max 1,50 m, piliers max 1,80 m", cloture_dp: true,
      niveaux: "RDC seul ou RDC + combles UNIQUEMENT",
      piscine: "✅ Autorisée (selon zones constructibles du plan parcellaire)"
    },
    Ue: {
      label: "Ue – Équipements publics",
      description: "Zone réservée aux équipements publics.",
      interdictions: ["Industrie","Artisanat","Agriculture","Dépôts","Caravanes","Carrières"],
      emprise: "non réglementée", hauteur_principale: "7 m max",
      recul_voie_principale: "à l'alignement ou ≥ 2 m", recul_sep: "en contiguïté ou ≥ 3 m",
      piscine: "❌ Zone réservée aux équipements publics — consulter mairie"
    },
    Ui: {
      label: "Ui – Zone industrielle",
      interdictions: ["Hébergement hôtelier","Agriculture","Caravanes","Carrières"],
      emprise: "60% max", hauteur_principale: "8 m max",
      recul_voie_principale: "à l'alignement ou ≥ 5 m", recul_sep: "≥ moitié de la hauteur, min 3 m",
      cloture_voie: "grillage couleur sombre, max 1,50 m", cloture_sep: "grillage couleur sombre, max 1,80 m", cloture_dp: true,
      piscine: "❌ Zone industrielle — non destinée à cet usage"
    },
    "1AU": {
      label: "1AU – Zone à urbaniser (court terme)",
      description: "Construction uniquement dans le cadre d'une opération d'aménagement d'ensemble.",
      interdictions: ["Constructions isolées hors opération d'ensemble","Industrie","Agriculture","Dépôts","Caravanes"],
      emprise: "40% max", espaces_verts: "30% min",
      hauteur_principale: "5 m max", hauteur_annexe: "2,5 m max",
      recul_voie_principale: "≥ 5 m", recul_voie_annexe: "≥ 5 m", recul_sep: "en contiguïté ou ≥ 3 m",
      cloture_voie: "non obligatoire — si clôture : grillage sombre max 1,20 m + haie",
      cloture_sep: "non obligatoire — si clôture : grillage sombre max 1,50 m + haie", cloture_dp: true,
      abri_materiaux: "matériaux traditionnels (pierre, brique, parpaing enduit) et bois",
      piscine: "✅ Autorisée (emprise ≤ 40%)", stationnement: "2 places min/logement",
      alerte: "⚠️ Toute construction doit s'inscrire dans une opération d'aménagement d'ensemble (lotissement, ZAC…)."
    },
    "2AU": {
      label: "2AU – Réserve foncière (long terme)",
      description: "Zone inconstructible. Urbanisation uniquement après révision du PLU.",
      interdictions: ["TOUTE construction privée"],
      piscine: "❌ INTERDITE — zone inconstructible",
      alerte: "🚫 Cette zone est inconstructible. Seuls les équipements publics peuvent être autorisés après révision du PLU."
    },
    A: {
      label: "A – Zone agricole",
      description: "Seules les constructions liées à l'exploitation agricole sont autorisées.",
      interdictions: ["Constructions non agricoles","Habitations (sauf logement de fonction)","Grillages/piquets fer/poteaux béton"],
      hauteur_principale: "10 m max hors tout (exploitation) / 5 m max (habitation) / 2,5 m (abris animaux)",
      recul_voie_principale: "≥ 8 m (100 m de l'axe A71)", recul_sep: "en contiguïté ou ≥ 3 m",
      cloture_voie: "pieux de bois + 3 fils métalliques, max 1,20 m",
      cloture_sep: "pieux de bois + 3 fils, max 1,20 m (1,80 m si élevage déclaré)",
      piscine: "❌ INTERDITE en zone A",
      alerte: "⚠️ Zone strictement agricole. Constructions non agricoles interdites. Voir secteur Ah pour les hameaux."
    },
    Ah: {
      label: "Ah – Hameaux agricoles",
      description: "Hameaux et écarts non agricoles en zone A. Extensions limitées.",
      emprise: "Extensions ≤ 20% de la SP existante / Annexes ≤ 50 m²",
      espaces_verts: "30% min", hauteur_principale: "5 m max", hauteur_annexe: "2,5 m max",
      recul_voie_principale: "à l'alignement ou ≥ 5 m", recul_sep: "en contiguïté ou ≥ 3 m",
      toiture_principale: "≥ 2 pentes ≥ 35°, ardoises ou tuiles plates",
      piscine: "⚠️ Possible si dans le cadre de l'extension autorisée (≤ 20% SP existante)",
      changement_destination: "Autorisé vers habitat, bureaux, commerce, artisanat, tourisme, loisirs",
      alerte: "Seules extensions (+20% max) et annexes (≤ 50 m²) autorisées. Pas de nouvelle construction principale."
    },
    N: {
      label: "N – Zone naturelle et forestière",
      interdictions: ["Industrie","Artisanat","Bureaux","Entrepôts","Dépôts","Camping","Tout changement dans les EBC"],
      piscine: "❌ INTERDITE en zone N",
      alerte: "🌲 Zone naturelle protégée. Seules constructions agricoles/forestières et d'intérêt public autorisées."
    },
    Nh: {
      label: "Nh – Hameaux naturels",
      emprise: "Extensions ≤ 20% de la SP existante / Annexes ≤ 50 m²",
      espaces_verts: "30% min", hauteur_principale: "5 m max", hauteur_annexe: "2,5 m max",
      recul_voie_principale: "≥ 5 m", recul_sep: "en contiguïté ou ≥ 3 m",
      cloture_voie: "pieux de bois + 3 fils, max 1,20 m",
      toiture_principale: "≥ 2 pentes ≥ 35°, ardoises ou tuiles d'aspect plat",
      piscine: "❌ INTERDITE — pas de nouvelle construction principale",
      changement_destination: "Autorisé vers habitat, tourisme, loisirs uniquement",
      alerte: "Seules extensions (+20% max) et annexes (≤ 50 m²) autorisées. Pas de nouvelle construction principale."
    },
    Nj: {
      label: "Nj – Jardins naturels",
      emprise: "≤ 20 m²", hauteur_principale: "2,5 m max",
      recul_voie_principale: "≥ 10 m", recul_sep: "en contiguïté ou ≥ 3 m",
      piscine: "✅ Autorisée explicitement avec local technique dédié",
      alerte: "Seuls abris de jardin (≤ 20 m²), piscines et locaux techniques autorisés."
    },
    Nl: {
      label: "Nl – Loisirs naturels",
      piscine: "❌ Zone publique collective — projets privés non admis",
      alerte: "Seuls aménagements de loisirs à vocation publique et collective autorisés."
    }
  },

  autorisations: {
    permis: {
      label: "Permis de construire / Déclaration préalable",
      tableau: [
        {cas:"Extension accolée < 40 m² (SP totale ≤ 150 m²)", auth:"Déclaration Préalable (DP)"},
        {cas:"Extension accolée ≥ 40 m² ou SP totale > 150 m²", auth:"Permis de Construire (PC)"},
        {cas:"Garage/annexe non accolé < 20 m²", auth:"Déclaration Préalable (DP)"},
        {cas:"Garage/annexe non accolé ≥ 20 m²", auth:"Permis de Construire (PC)"},
        {cas:"Construction neuve", auth:"Permis de Construire (PC) — architecte si > 150 m² SP"},
      ],
      notes: ["Délai DP : 1 mois | PC : 2 mois","Validité : 3 ans","Dépôt : mairie ou GNAU CCTVL","Architecte obligatoire si SP > 150 m²"]
    },
    piscine: {
      tableau: [
        {cas:"< 10 m², non couverte, restant < 3 mois", auth:"Aucune formalité"},
        {cas:"< 100 m², non couverte", auth:"Déclaration Préalable (DP)"},
        {cas:"< 100 m², couverte < 1,80 m de hauteur", auth:"Déclaration Préalable (DP)"},
        {cas:"> 100 m²", auth:"Permis de Construire (PC)"},
      ]
    },
    cloture: {
      tableau: [
        {cas:"Tout type de clôture, mur, portail", auth:"Déclaration Préalable obligatoire (délibération CM 01/03/2012)"}
      ]
    },
    abri: {
      tableau: [
        {cas:"< 5 m²", auth:"Aucune formalité"},
        {cas:"5 à 20 m²", auth:"Déclaration Préalable (DP)"},
        {cas:"> 20 m²", auth:"Permis de Construire (PC)"},
      ]
    },
    toiture: {
      tableau: [
        {cas:"Remplacement à l'identique (même matériau, même couleur)", auth:"Aucune formalité"},
        {cas:"Changement de matériau ou de couleur", auth:"Déclaration Préalable (DP)"},
        {cas:"Velux / fenêtre de toit", auth:"Déclaration Préalable (DP)"},
        {cas:"Lucarne (ajout ou modification)", auth:"Déclaration Préalable (DP)"},
      ]
    },
    extension: {
      tableau: [
        {cas:"Extension accolée < 20 m² (si aspect modifié)", auth:"Déclaration Préalable (DP)"},
        {cas:"Extension 20 à 40 m² (zone urbaine, SP ≤ 150 m²)", auth:"Déclaration Préalable (DP)"},
        {cas:"Extension > 40 m² ou SP totale > 150 m²", auth:"Permis de Construire (PC)"},
      ]
    },
    panneaux_solaires: {
      tableau: [{cas:"Panneaux photovoltaïques en toiture", auth:"Déclaration Préalable (DP)"}],
      note: "Les ouvrages ENR sont exclus du calcul de hauteur maximale dans toutes les zones."
    }
  }
};

// ════════════════════════════════════════════════════════
// PLU — Helpers : normalisation, accès, rendu
// ════════════════════════════════════════════════════════

function pluNormalizeZone(raw) {
  // L'IGN peut retourner "1AU1", "1AUe", "Ub1" etc.
  // On cherche d'abord exact, puis avec troncature progressive
  if (!raw) return null;
  const z = String(raw).trim();
  if (PLU_DATA.zones[z]) return z;
  // Essayer sans suffixe numérique final
  const base = z.replace(/\d+$/, '');
  if (PLU_DATA.zones[base]) return base;
  // Essayer majuscule
  const up = z.toUpperCase();
  for (const k of Object.keys(PLU_DATA.zones)) {
    if (k.toUpperCase() === up) return k;
  }
  // Chercher une clé qui commence pareil
  for (const k of Object.keys(PLU_DATA.zones)) {
    if (z.startsWith(k) || k.startsWith(z)) return k;
  }
  return null;
}

function pluGetZone(zoneKey) {
  const normalized = pluNormalizeZone(zoneKey);
  return normalized ? PLU_DATA.zones[normalized] : null;
}

function pluAuthLink(auth) {
  // Retourne un lien cliquable si DP ou PC reconnu
  if (/Déclaration Préalable|\bDP\b/.test(auth)) {
    return auth + ' <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/R11646" target="_blank" class="plu-form-link">📄 Cerfa DP</a>';
  }
  if (/Permis de Construire|\bPC\b/.test(auth)) {
    return auth + ' <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/R11637" target="_blank" class="plu-form-link">📄 Cerfa PC</a>';
  }
  return auth;
}

function pluRenderAuth(authKey) {
  const a = PLU_DATA.autorisations[authKey];
  if (!a) return '';
  let h = '<div class="plu-auth"><div class="plu-auth-title">📋 Autorisation requise</div><table class="plu-table">';
  for (const row of (a.tableau||[])) {
    h += `<tr><td>${row.cas}</td><td class="plu-auth-val">${pluAuthLink(row.auth)}</td></tr>`;
  }
  h += '</table>';
  if (a.notes) h += '<ul class="plu-notes">'+a.notes.map(n=>`<li>${n}</li>`).join('')+'</ul>';
  if (a.note) h += '<p class="plu-note">ℹ️ '+a.note+'</p>';
  h += '</div>';
  return h;
}

function pluRenderZoneCard(zone) {
  if (!zone) return '';
  let h = '';
  if (zone.alerte) h += `<div class="plu-alerte">${zone.alerte}</div>`;
  const rows = [
    ['Emprise au sol max', zone.emprise],
    ['Espaces verts min', zone.espaces_verts],
    ['Hauteur construction principale', zone.hauteur_principale],
    ['Hauteur annexes', zone.hauteur_annexe],
    ['Recul par rapport à la voie', zone.recul_voie_principale],
    ['Recul voie (annexes)', zone.recul_voie_annexe],
    ['Recul voie (abri jardin)', zone.recul_voie_abri],
    ['Recul limites séparatives', zone.recul_sep],
    ['Toiture principale', zone.toiture_principale],
    ['Toiture annexe > 30 m²', zone.toiture_annexe_sup30],
    ['Toiture annexe < 30 m²', zone.toiture_annexe_inf30],
    ['Clôture sur voie', zone.cloture_voie],
    ['Clôture limite séparative', zone.cloture_sep],
    ['Carrefour', zone.cloture_carrefour],
    ['DP clôture obligatoire', zone.cloture_dp ? 'OUI — Déclaration Préalable obligatoire' : null],
    ['Portail (Ub1)', zone.cloture_portail],
    ['Abri jardin — matériaux', zone.abri_materiaux],
    ['Piscine', zone.piscine],
    ['Façades', zone.facades],
    ['Niveaux autorisés', zone.niveaux],
    ['Stationnement', zone.stationnement],
    ['Changement de destination', zone.changement_destination],
    ['Plancher RDC / sol', zone.rdc_max],
  ].filter(([,v]) => v);
  if (rows.length) {
    h += '<table class="plu-table">';
    for (const [label, val] of rows) {
      const cls = (String(val).includes('INTERDIT') || String(val).includes('❌') || String(val).includes('🚫')) ? ' plu-nok' : (String(val).includes('✅')) ? ' plu-ok' : '';
      h += `<tr><td class="plu-label">${label}</td><td class="plu-val${cls}">${val}</td></tr>`;
    }
    h += '</table>';
  }
  if (zone.interdictions && zone.interdictions.length) {
    h += '<div class="plu-interdits-title">🚫 Interdictions</div><ul class="plu-interdits">';
    zone.interdictions.forEach(i => h += `<li>${i}</li>`);
    h += '</ul>';
  }
  return h;
}

function pluBuildAnswer(qid, zone, zoneKey) {
  // Retourne un objet {html, hasPluAnswer}
  // hasPluAnswer=true si on a une réponse précise du JSON, false si fallback MEL
  const z = zone;
  const zKey = pluNormalizeZone(zoneKey) || zoneKey;
  let html = '';
  let hasPluAnswer = false;

  if (qid === 'piscine') {
    hasPluAnswer = true;
    // Autorisation selon surface
    html += pluRenderAuth('piscine');
    // Règle spécifique à la zone
    if (z && z.piscine) {
      const ok = z.piscine.includes('✅');
      const nok = z.piscine.includes('❌');
      html += `<div class="plu-zone-rule ${ok?'plu-ok-block':nok?'plu-nok-block':'plu-warn-block'}">
        <strong>En zone ${zoneKey} :</strong> ${z.piscine}
        ${z.emprise ? '<br><small>Emprise totale (maison + piscine) : '+z.emprise+'</small>' : ''}
        ${z.espaces_verts ? '<br><small>Espaces verts obligatoires : '+z.espaces_verts+'</small>' : ''}
      </div>`;
    }
    if (z && z.alerte) html += `<div class="plu-alerte">${z.alerte}</div>`;
  }
  else if (qid === 'cloture') {
    hasPluAnswer = true;
    html += pluRenderAuth('cloture');
    if (z) {
      html += `<div class="plu-zone-rule plu-warn-block"><strong>En zone ${zoneKey} :</strong><br>`;
      if (z.cloture_voie) html += `• Sur voie : ${z.cloture_voie}<br>`;
      if (z.cloture_sep) html += `• Limite séparative : ${z.cloture_sep}<br>`;
      if (z.cloture_carrefour) html += `• Carrefour : ${z.cloture_carrefour}<br>`;
      if (z.cloture_portail) html += `• Portail : ${z.cloture_portail}`;
      html += '</div>';
    }
    if (z && z.alerte) html += `<div class="plu-alerte">${z.alerte}</div>`;
  }
  else if (qid === 'abri') {
    hasPluAnswer = true;
    html += pluRenderAuth('abri');
    if (z) {
      html += `<div class="plu-zone-rule plu-warn-block"><strong>En zone ${zoneKey} — matériaux :</strong><br>`;
      if (z.abri_materiaux) html += z.abri_materiaux;
      if (z.recul_voie_abri) html += `<br>Recul par rapport à la voie : ${z.recul_voie_abri}`;
      html += '</div>';
    }
    if (z && z.alerte) html += `<div class="plu-alerte">${z.alerte}</div>`;
  }
  else if (qid === 'toiture') {
    hasPluAnswer = true;
    html += pluRenderAuth('toiture');
    if (z) {
      html += `<div class="plu-zone-rule plu-warn-block"><strong>En zone ${zoneKey} :</strong><br>`;
      if (z.toiture_principale) html += `• Construction principale : ${z.toiture_principale}<br>`;
      if (z.toiture_annexe_sup30) html += `• Annexe > 30 m² : ${z.toiture_annexe_sup30}<br>`;
      if (z.toiture_annexe_inf30) html += `• Annexe < 30 m² : ${z.toiture_annexe_inf30}`;
      html += '<br><small>Exception : appentis, vérandas, verrières non soumis à ces règles.</small></div>';
    }
    if (z && z.alerte) html += `<div class="plu-alerte">${z.alerte}</div>`;
  }
  else if (qid === 'extension') {
    hasPluAnswer = true;
    html += pluRenderAuth('extension');
    if (z) {
      html += `<div class="plu-zone-rule plu-warn-block"><strong>En zone ${zoneKey} :</strong><br>`;
      if (z.emprise) html += `• Emprise au sol max (maison + extension) : ${z.emprise}<br>`;
      if (z.hauteur_principale) html += `• Hauteur max : ${z.hauteur_principale}<br>`;
      if (z.recul_voie_principale) html += `• Recul voie : ${z.recul_voie_principale}<br>`;
      if (z.recul_sep) html += `• Limites séparatives : ${z.recul_sep}`;
      if (['Ah','Nh'].includes(zoneKey)) html += '<br>⚠️ Extension limitée à +20% de la surface de plancher existante.';
      html += '</div>';
    }
    if (z && z.alerte) html += `<div class="plu-alerte">${z.alerte}</div>`;
  }
  else if (qid === 'permis') {
    hasPluAnswer = true;
    html += pluRenderAuth('permis');
    if (z) {
      html += `<div class="plu-zone-rule plu-warn-block"><strong>Règles générales en zone ${zoneKey} :</strong><br>`;
      if (z.emprise) html += `• Emprise au sol max : ${z.emprise}<br>`;
      if (z.hauteur_principale) html += `• Hauteur max : ${z.hauteur_principale}<br>`;
      if (z.recul_voie_principale) html += `• Recul voie : ${z.recul_voie_principale}<br>`;
      if (z.recul_sep) html += `• Limites séparatives : ${z.recul_sep}`;
      if (z.alerte) html += '<br>'+z.alerte;
      html += '</div>';
    }
  }
   else if (qid === 'changement_destination') {
     hasPluAnswer = true;
   
     html += `<div class="plu-auth">
       <div class="plu-auth-title">📋 Changement de destination</div>
       <div class="plu-zone-rule plu-warn-block">
         Le changement de destination consiste à faire passer un bâtiment d’une destination à une autre
         (par exemple : agricole vers habitation, habitation vers commerce, local vers bureaux).
         <br><br>
         <strong>Autorisation :</strong><br>
         • Sans modification de façade ni de structure porteuse : <strong>Déclaration préalable (DP)</strong><br>
         • Avec modification de façade et/ou de structure porteuse : <strong>Permis de construire (PC)</strong>
       </div>
     </div>`;
   
     if (zoneKey === 'A') {
       html += `<div class="plu-zone-rule plu-nok-block">
         <strong>En zone A :</strong><br>
         Le changement de destination n’est autorisé que pour les <strong>bâtiments agricoles identifiés</strong>
         dans les documents graphiques du PLU.<br>
         Si le bâtiment n’est pas identifié, le changement de destination n’est pas autorisé en l’état.
       </div>`;
     }
     else if (zoneKey === 'Ah') {
       html += `<div class="plu-zone-rule plu-ok-block">
         <strong>En secteur Ah :</strong><br>
         Le changement de destination des constructions existantes est autorisé vers :<br>
         • l’habitat<br>
         • les bureaux<br>
         • le commerce<br>
         • l’artisanat<br>
         • le tourisme<br>
         • les loisirs<br><br>
         Le projet doit rester compatible avec le voisinage en termes de nuisances et d’aspect extérieur.
       </div>`;
     }
     else if (zoneKey === 'Nh') {
       html += `<div class="plu-zone-rule plu-ok-block">
         <strong>En secteur Nh :</strong><br>
         Le changement de destination des constructions existantes est autorisé vers :<br>
         • l’habitat<br>
         • le tourisme<br>
         • les loisirs<br><br>
         Le projet doit rester compatible avec le caractère de la zone.
       </div>`;
     }
     else {
       html += `<div class="plu-zone-rule plu-warn-block">
         <strong>En zone ${zoneKey || '?' } :</strong><br>
         Le PLU ne prévoit pas ici, dans les extraits intégrés à MEL, de règle spéciale aussi explicite que pour
         les secteurs A, Ah ou Nh.<br>
         Le projet doit donc être vérifié au cas par cas par le service urbanisme, selon la destination actuelle
         du bâtiment, la destination envisagée et les éventuelles modifications extérieures ou structurelles.
       </div>`;
     }
   
     html += `<div class="plu-note">
       ℹ️ Avant dépôt, vérifiez aussi si le bâtiment est situé dans un lotissement, s’il est repéré au PLU,
       ou si d’autres contraintes s’appliquent.
     </div>`;
   }
  // Footer commun : contact mairie
  if (hasPluAnswer) {
    html += `<div class="plu-footer">
      ⚠️ Informations issues du PLU approuvé le 30/01/2013 — à titre indicatif.<br>
      Toute décision définitive relève du service urbanisme.
      <a href="mailto:urbanisme@mezieres-lez-clery.fr" onclick="event.stopPropagation();window.location.href='mailto:urbanisme@mezieres-lez-clery.fr';return false;" style="display:block;margin-top:6px;padding:8px 12px;background:var(--forest);color:white;border-radius:8px;text-decoration:none;font-weight:700;text-align:center;">✉️ Contacter le service urbanisme</a>
      <a href="tel:0238456176" onclick="event.stopPropagation();window.location.href='tel:0238456176';return false;" style="display:block;margin-top:5px;padding:8px 12px;background:var(--leaf);color:white;border-radius:8px;text-decoration:none;font-weight:700;text-align:center;">📞 Mairie : 02 38 45 61 76</a>
    </div>`;
  }

  return { html, hasPluAnswer };
}

// ════════════════════════════════════════════════════════
// MEL — Arbre de décision (fallback embarqué)
// ⚠️ Ne pas modifier ce bloc : éditez data/mel-tree.json à la place
// ════════════════════════════════════════════════════════
const _MEL_TREE_FALLBACK = {

  urbanisme:{
    label:"Urbanisme & Construction", ico:"🏗️", needZone:true,
    questions:[

      {id:"piscine",ico:"🏊",label:"Piscine",prompt:"Je souhaite construire une piscine. Quelles sont les règles PLU applicables à mon terrain ?",topic:"urbanisme"},
      {id:"cloture",ico:"🔲",label:"Clôture / Mur / Portail",prompt:"Je souhaite installer une clôture, un mur ou un portail. Quelles sont les règles et formalités ?",topic:"urbanisme"},
      {id:"extension",ico:"📐",label:"Extension / Agrandissement",prompt:"Je souhaite agrandir ma maison. Quelles sont les règles d'extension applicables ?",topic:"urbanisme"},
      {id:"abri",ico:"🌿",label:"Abri de jardin / Garage / Annexe",prompt:"Je souhaite construire un abri de jardin, un garage ou une dépendance. Quelles sont les règles ?",topic:"urbanisme"},
      {id:"toiture",ico:"🏠",label:"Toiture / Façade / Matériaux",prompt:"Je souhaite modifier la toiture ou la façade de ma maison. Quelles sont les règles applicables ?",topic:"urbanisme"},
    ]
  },

  enfance:{
    label:"Enfance & Jeunesse", ico:"🎒", needZone:false,
    questions:[
      {id:"ecole",ico:"📚",label:"École La Forêt",
        directAnswer:{text:"L'école La Forêt est située 36 rue du Bourg. Elle ouvre à 8h20 (matin) et 13h30 (après-midi), les cours se terminent à 11h45 et 16h30. Vous pouvez joindre la directrice Mme GUILBERT-CHOLET tous les jours ou lui écrire.",
          links:[{label:"📞 École : 02 38 45 65 00",tel:"0238456500"},{label:"✉️ ec-mezieres-lez-clery@ac-orleans-tours.fr",url:"mailto:ec-mezieres-lez-clery@ac-orleans-tours.fr"}]}
      },
      {id:"periscolaire",ico:"🌅",label:"Accueil périscolaire",
        directAnswer:{text:"La commune propose un accueil périscolaire avant et après l'école pour les élèves de l'École de la Forêt. Les inscriptions et fiches de réservation sont à remettre en mairie avant le 30 juin pour l'année suivante.",
          links:[{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"},{label:"✉️ mairie@mezieres-lez-clery.fr",url:"mailto:mairie@mezieres-lez-clery.fr"}]}
      },
      {id:"cantine",ico:"🍽️",label:"Restaurant scolaire",
        directAnswer:{text:"Le restaurant scolaire prépare environ 100 repas par jour à partir de produits frais. Tarifs 2022/2023 : 3,80 € (1er enfant), 3,06 € (2e enfant), 2,32 € (3e enfant et +). Les fiches d'inscription sont à déposer en mairie avant le 30 juin.",
          links:[{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"},{label:"✉️ mairie@mezieres-lez-clery.fr",url:"mailto:mairie@mezieres-lez-clery.fr"}]}
      },
      {id:"creche",ico:"👶",label:"Crèche familiale Les Marmousets",
        directAnswer:{text:"La crèche Les Marmousets accueille les enfants de moins de 6 ans chez 17 assistantes maternelles salariées, avec des temps collectifs hebdomadaires à la crèche. Conditions : résider ou travailler à Cléry-Saint-André, Mareau-aux-Prés ou Mézières-lez-Cléry. Pré-inscription en présentiel ou par téléphone.",
          links:[{label:"📞 Crèche Les Marmousets : 02 38 45 76 56",tel:"0238457656"}]}
      },
      {id:"loisirs",ico:"🎨",label:"Centre de loisirs",
        directAnswer:{text:"Le centre de loisirs accueille les 3-13 ans pendant toutes les vacances scolaires, basé à Cléry-Saint-André (et ponctuellement à Mézières). 1ère inscription : dossier à retirer en mairie ou à la CCTVL. Réinscription : dossier pré-rempli par email.",
          links:[{label:"✉️ accueilloisirs.ardoux@ccterresduvaldeloire.fr",url:"mailto:accueilloisirs.ardoux@ccterresduvaldeloire.fr"},{label:"🌐 Site CCTVL",url:"https://www.ccterresduvaldeloire.fr/listes/enfance-jeunesse/"}]}
      },
    ]
  },

  administratif:{
    label:"Démarches Administratives", ico:"📋", needZone:false,
    questions:[
      {id:"etatcivil",ico:"📜",label:"État civil (naissance, mariage, décès, actes)",
        directAnswer:{text:"Les actes d'état civil (naissance, mariage, décès, acte de naissance…) sont délivrés par la mairie. Accueil physique : lundi 14h-17h30, vendredi 8h30-11h30. Mercredi sur rendez-vous uniquement.",
          links:[{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"},{label:"✉️ mairie@mezieres-lez-clery.fr",url:"mailto:mairie@mezieres-lez-clery.fr"}]}
      },
      {id:"cni",ico:"🪪",label:"Carte Nationale d'Identité",
        directAnswer:{text:"La CNI se fait dans une mairie équipée d'un dispositif biométrique (la mairie de Mézières vous orientera vers la plus proche, souvent Cléry-Saint-André). Démarche en ligne sur le site ANTS : créer un compte → commencer la démarche → renseigner vos informations → acheter votre timbre fiscal → valider → prendre rendez-vous en mairie → préparer vos pièces justificatives → déposer le dossier en mairie.",
          links:[{label:"🌐 Démarche CNI sur ANTS",url:"https://ants.gouv.fr"},{label:"📅 Prendre rendez-vous",url:"https://www.service-public.gouv.fr/particuliers/vosdroits/R63715"},{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"}]}
      },
      {id:"passeport",ico:"🛂",label:"Passeport",
        directAnswer:{text:"Le passeport se fait dans une mairie équipée d'un dispositif biométrique. Vous pouvez faire une pré-demande sur ants.gouv.fr. Documents nécessaires selon la situation : première demande ou renouvellement, majeur ou mineur. Un timbre fiscal est requis. Le délai varie selon la période et le lieu.",
          links:[{label:"🌐 Toutes les infos passeport",url:"https://www.service-public.gouv.fr/particuliers/vosdroits/N360"},{label:"🌐 Pré-demande sur ANTS",url:"https://ants.gouv.fr"},{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"}]}
      },
      {id:"pacs",ico:"💑",label:"PACS — Pacte Civil de Solidarité",
        directAnswer:{text:"Le PACS se déclare à la mairie. Il faut remplir la déclaration conjointe (cerfa 15725*03) avec attestations sur l'honneur de non-parenté, non-alliance et résidence commune, joindre une convention-type (cerfa 15726*02) ou une convention personnalisée, et les justificatifs d'identité.",
          links:[{label:"📄 Déclaration PACS (cerfa 15725*03)",url:"https://www.service-public.fr/particuliers/vosdroits/R42142"},{label:"📄 Convention-type PACS (cerfa 15726*02)",url:"https://www.service-public.fr/particuliers/vosdroits/R43750"},{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"}]}
      },
      {id:"vote",ico:"🗳️",label:"Inscription sur les listes électorales",
        directAnswer:{text:"Pour voter, vous devez être inscrit sur les listes électorales. Inscription en mairie ou en ligne sur service-public.gouv.fr. Documents à prévoir : pièce d'identité et justificatif de domicile.",
          links:[{label:"📄 Formulaire d'inscription (cerfa 12669)",url:"https://www.service-public.fr/particuliers/vosdroits/R16024"},{label:"🌐 Inscription en ligne",url:"https://www.service-public.gouv.fr"},{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"}]}
      },
      {id:"assainissement",ico:"🚰",label:"Assainissement (fosse, raccordement, SPANC)",
        directAnswer:{text:"L'assainissement collectif et le SPANC (Service Public d'Assainissement Non Collectif, ANC) sont gérés par la CCTVL depuis 2018. Pour un raccordement, un contrôle de fosse ou toute question, contactez directement la CCTVL. La facturation est accessible sur le portail usagers.",
          links:[{label:"📞 CCTVL : 02 38 44 59 35",tel:"0238445935"},{label:"✉️ assainissement@ccterresduvaldeloire.fr",url:"mailto:assainissement@ccterresduvaldeloire.fr"},{label:"🌐 Portail usagers CCTVL",url:"https://portail-usagers.ccterresduvaldeloire.fr"}]}
      },
      {id:"location",ico:"🪑",label:"Location de matériel communal",
        directAnswer:{text:"La commune met du matériel à disposition (tables, chaises, barnums…). Pour connaître le matériel disponible, les tarifs et les modalités de réservation, contactez la mairie.",
          links:[{label:"📞 Mairie : 02 38 45 61 76",tel:"0238456176"},{label:"✉️ mairie@mezieres-lez-clery.fr",url:"mailto:mairie@mezieres-lez-clery.fr"},{label:"🌐 Page location matériel",url:"https://mezieres-lez-clery.fr/2018/10/24/location-de-materiel/"}]}
      },
    ]
  },

  dechets:{
    label:"Déchets & Propreté", ico:"♻️", needZone:false,
    questions:[
      {id:"collecte",ico:"🗑️",label:"Jours de collecte ordures / tri sélectif",
        directAnswer:{text:"Sortez vos bacs la veille au soir ou avant 7h le matin du jour de collecte. La collecte n'a pas lieu les jours fériés — elle est reportée au lendemain. Des points d'apport volontaire (verre, papiers, plastique-cartons, vêtements) sont présents sur la commune. Consultez votre calendrier personnalisé en ligne.",
          links:[{label:"🗓️ Mon calendrier de collecte",url:"https://mezieres-lez-clery.fr/2018/10/25/gestion-des-dechets/"}]}
      },
      {id:"dechetterie",ico:"♻️",label:"Déchetterie — horaires & inscription",
        directAnswer:{text:"La déchetterie de Cléry-Saint-André est la plus proche. Inscription OBLIGATOIRE (lecture automatique de plaque). Enregistrez vos plaques SANS tiret (ex : AA123BB). Horaires : hiver (oct-mars) 10h-12h / 14h-17h, été (avr-sep) 9h-12h / 14h-18h, lun-sam sauf jours fériés. Une inscription vaut pour tous les sites CCTVL.",
          links:[{label:"🌐 S'inscrire à la déchetterie",url:"https://portail-usagers.ccterresduvaldeloire.fr"},{label:"📞 CCTVL : 02 38 44 59 35",tel:"0238445935"}]}
      },
      {id:"encombrants",ico:"🛋️",label:"Encombrants / objets volumineux",
        directAnswer:{text:"Les encombrants (meubles, électroménager, gros objets) se déposent à la déchetterie de Cléry-Saint-André. Inscription préalable obligatoire sur le portail usagers CCTVL. Certains équipements électriques peuvent être repris en magasin (obligation légale de reprise 1 pour 1).",
          links:[{label:"🌐 Portail usagers CCTVL",url:"https://portail-usagers.ccterresduvaldeloire.fr"},{label:"📞 CCTVL : 02 38 44 59 35",tel:"0238445935"}]}
      },
      {id:"tri",ico:"📦",label:"Tri sélectif — que mettre où ?",
        directAnswer:{text:"Sur la commune : bac jaune (plastiques, cartons, papiers, métaux), bac vert (ordures résiduelles). Points d'apport volontaire pour le verre, les papiers-magazines, plastique-cartons et vêtements. En cas de doute sur un déchet, consultez le guide du tri en ligne.",
          links:[{label:"🌐 Guide du tri CCTVL",url:"https://www.ccterresduvaldeloire.fr/reseau-des-dechetteries/"}]}
      },
    ]
  },

  numerique:{
    label:"Numérique & Internet", ico:"📡", needZone:false,
    questions:[
      {id:"fibre",ico:"🌐",label:"Raccordement fibre / Nouvelle construction",
        directAnswer:{text:"Pour toute nouvelle construction, déclarez-la le plus tôt possible auprès du gestionnaire départemental du réseau fibre (Lysseo). Cliquez sur 'Déclarer une nouvelle construction' en haut à droite du site.",
          links:[{label:"🌐 Déclarer une nouvelle construction — Lysseo",url:"https://lysseo.fr"}]}
      },
      {id:"thd",ico:"📶",label:"Questions fibre (raccordement, éligibilité…)",
        directAnswer:{text:"Pour toute question sur la fibre — raccordement, éligibilité, délais — contactez directement le service technique via le formulaire Lysseo.",
          links:[{label:"📞 Contacter le service fibre Lysseo",url:"https://lysseo.fr/page-contact/41"}]}
      },
      {id:"probleme",ico:"🔧",label:"Problème sur les installations (armoires, câbles…)",
        directAnswer:{text:"En cas de problème constaté sur les équipements du réseau (armoires de rue, boîtiers, câbles), faites une déclaration de dommage réseau sur Lysseo via le bouton en haut à droite.",
          links:[{label:"🛠️ Déclarer un dommage réseau",url:"https://lysseo.fr"}]}
      },
    ]
  },

  autre:{label:"Autre question",ico:"💬",needZone:false,openChatDirectly:true,questions:[]}
};

// ════════════════════════════════════════════════════════
// PHASE 3 — Données MEL/PLU externalisées
// ────────────────────────────────────────────────────────
// PLU_DATA et MEL_TREE sont initialisées au fallback embarqué,
// puis écrasées par les fichiers JSON externes dès qu'ils arrivent.
// Avantage : MEL fonctionne IMMÉDIATEMENT au chargement du script,
// sans attendre le fetch réseau. Le SW cache les JSON dès la 1ère
// visite, donc à partir du 2e lancement tout est instantané.
// ════════════════════════════════════════════════════════
let PLU_DATA = _PLU_DATA_FALLBACK;
let MEL_TREE = _MEL_TREE_FALLBACK;
let _melDataLoaded = false;  // true dès que les JSON externes sont chargés (info debug)

async function loadMelData() {
  const V = '3.7.4';

  try {
    const [pluRes, treeRes, serverTreeRes] = await Promise.all([
      fetch('./data/plu-data.json?v=' + V, { cache: 'no-cache' }),
      fetch('./data/mel-tree.json?v=' + V, { cache: 'no-cache' }),
      fetch(MEL_BACKEND + '/mel/tree', { cache: 'no-cache' }).catch(() => null)
    ]);

    if (pluRes && pluRes.ok) {
      const plu = await pluRes.json();
      if (plu && plu.zones && Object.keys(plu.zones).length >= 5) {
        PLU_DATA = plu;
      }
    }

    let tree = null;

    if (serverTreeRes && serverTreeRes.ok) {
      const remote = await serverTreeRes.json();
      if (remote && remote.ok && remote.tree && typeof remote.tree === 'object' && Object.keys(remote.tree).length >= 1) {
        tree = remote.tree;
      }
    }

    if (!tree && treeRes && treeRes.ok) {
      const localTree = await treeRes.json();
      if (localTree && typeof localTree === 'object' && Object.keys(localTree).length >= 3) {
        tree = localTree;
      }
    }

    if (tree) {
      MEL_TREE = tree;
    }

    _melDataLoaded = true;
    console.log('[MEL] Données chargées : ' +
      Object.keys(PLU_DATA.zones || {}).length + ' zones PLU, ' +
      Object.keys(MEL_TREE || {}).length + ' catégories MEL');
  } catch (e) {
    console.warn('[MEL] Fallback embarqué utilisé :', e.message || e);
  }
}

function _melEsc(v){
  if (typeof esc === 'function') return esc(v);
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ════════════════════════════════════════════════════════
// MEL — État global du module
// ════════════════════════════════════════════════════════
let _melCat=null, _melZone=null, _melZoneLabel=null, _melAddr=null;
let _melChatContext='', _melChatCategory='autre', _melChatTopic='autre';
let _melZoneNorm=null;

// Variables chat MEL
let melInited=false, melBusy=false;
const hist=[];

// ════════════════════════════════════════════════════════
// MEL — Chat (addMsg, showTyping, sendMel)
// ════════════════════════════════════════════════════════

function addMsg(role,text){
  const c=document.getElementById('msgs');
  const d=document.createElement('div'); d.className='msg '+role;
  const ttsBtn = (role==='bot' && _ttsEnabled)
    ? '<button class="tts-btn" onclick="ttsRead(\''+text.replace(/'/g,"\\'").replace(/\n/g,' ')+'\',\'MEL\')">🔊 Écouter</button>'
    : '';
  const formatted = formatMelText(text);
  d.innerHTML='<div class="mav">'+(role==='bot'?'\ud83d\udc69':'\ud83d\udc64')+'</div><div class="bub">'+formatted+ttsBtn+'</div>';
  c.appendChild(d); c.scrollTop=c.scrollHeight;
  // Lire automatiquement si TTS actif
  if(role==='bot' && _ttsEnabled) ttsSpeak(text, 'MEL');
}

function showTyping(){
  const c=document.getElementById('msgs');
  const d=document.createElement('div'); d.className='msg bot'; d.id='typ';
  d.innerHTML='<div class="mav">\ud83d\udc69</div><div class="bub"><div class="typ"><span></span><span></span><span></span></div></div>';
  c.appendChild(d); c.scrollTop=c.scrollHeight;
}

async function sendMel(){
  const inp=document.getElementById('minp');
  const txt=inp.value.trim(); if(!txt||melBusy)return;
  inp.value=''; inp.placeholder='Votre question…'; const _sugs=document.getElementById('sugs'); if(_sugs)_sugs.style.display='none';
  addMsg('user',txt); hist.push({role:'user',content:txt}); melBusy=true; showTyping();
  try{
    const r=await fetch(MEL_PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:hist.slice(-8),category:_melChatCategory||'autre',extraCtx:_melChatContext||''})});
    const d=await r.json();
    const rep=(d.reply||'Erreur technique. Contactez la mairie au 02 38 45 61 76.').replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1');
    var _typ=document.getElementById('typ'); if(_typ) _typ.remove(); hist.push({role:'assistant',content:rep}); addMsg('bot',rep);
    if(d.showElus){
      const c=document.getElementById('msgs');
      const sug=document.createElement('div'); sug.className='msg bot';
      sug.innerHTML='<div class="mav">👩</div><div class="bub" style="background:var(--mist);border:1px solid rgba(0,0,0,0.06);font-size:0.78rem;display:flex;align-items:center;gap:8px;padding:10px 12px;flex-wrap:wrap;">'
        +'<span style="font-size:1.1rem;flex-shrink:0;">🏛️</span>'
        +'<span style="flex:1;color:var(--forest);min-width:100px;">Consulter la fiche ou contacter un élu ?</span>'
        +'<button onclick="closeOv(\'mel\');openConseil();" style="background:var(--forest);color:white;border:none;border-radius:8px;padding:7px 12px;font-size:0.72rem;font-weight:900;cursor:pointer;flex-shrink:0;">🏛️ Voir les élus</button>'
        +'</div>';
      c.appendChild(sug); c.scrollTop=99999;
    }
    if(d.showUrbanisme){
      const c=document.getElementById('msgs');
      const sug=document.createElement('div'); sug.className='msg bot';
      sug.innerHTML='<div class="mav">👩</div><div class="bub" style="background:var(--mist);border:1px solid rgba(0,0,0,0.06);padding:10px 12px;">'
        +'<div style="font-size:0.72rem;font-weight:900;color:var(--forest);margin-bottom:6px">🏗️ Schéma des autorisations d\'urbanisme</div>'
        +'<img src="./autorisation-urbanisme.jpg?v=3.7.3" '
        +'alt="Autorisations urbanisme" style="width:100%;border-radius:8px;display:block;margin-bottom:6px;" '
        +'onerror="this.style.display=\'none\'">'
        +'<div style="font-size:0.67rem;color:var(--muted);line-height:1.5">DP = Déclaration Préalable · PC = Permis de Construire · SP = Surface Plancher</div>'
        +'</div>';
      c.appendChild(sug); c.scrollTop=99999;
    }
  }catch(e){ var _typ=document.getElementById('typ'); if(_typ) _typ.remove(); addMsg('bot','Je ne peux pas répondre pour le moment.\nMairie\u00a0: 02\u00a038\u00a045\u00a061\u00a076 \ud83d\ude0a'); }
  melBusy=false;
}

// ════════════════════════════════════════════════════════
// MEL — Suggestions thématiques (affichées en haut du chat)
// ════════════════════════════════════════════════════════
const MEL_THEME_SUGGESTIONS = {
  urbanisme: [
    "Faut-il une déclaration préalable pour une clôture ?",
    "Ai-je besoin d'un permis pour une extension ?",
    "Comment trouver ma zone PLU sur le Géoportail ?",
    "Quelles règles pour un abri de jardin en zone Ub ?",
    "Quelle hauteur maximale pour construire en zone Ua ?",
    "Puis-je construire une piscine sans permis ?",
    "Quelles règles pour une véranda ou une terrasse ?",
    "Qu'est-ce que la zone A agricole ?",
    "Quelles sont les zones constructibles à Mézières ?",
  ],
  enfance:   ["Comment fonctionne la cantine ?","Quels sont les services périscolaires ?","Comment s'inscrire au centre de loisirs ?","Quelles infos sur la crèche familiale ?"],
  demarches: ["Comment demander un acte de naissance ?","Où faire une carte d'identité ?","Comment obtenir un passeport ?","Quelles démarches pour un mariage ?"],
  fibre:     ["Suis-je éligible à la fibre ?","Qui contacter pour le raccordement fibre ?","Que faire si la fibre n'est pas disponible ?","Où trouver les infos numériques utiles ?"],
  cctvl: ["Comment m'inscrire à la déchetterie de Cléry ?","Quelle maison de santé est proche de Mézières ?","Comment bénéficier de l'OPAH pour rénover mon logement ?","Ma fosse septique doit-elle être contrôlée ?"]
};

function renderMelThemes(){
  const sugs = document.getElementById('sugs');
  if(!sugs) return;
  sugs.style.display='';
  sugs.innerHTML = '<button class="sug" onclick="showMelThemeQuestions(\'urbanisme\')">🏗️ Urbanisme</button>'
    + '<button class="sug" onclick="showMelThemeQuestions(\'enfance\')">🧒 Enfance</button>'
    + '<button class="sug" onclick="showMelThemeQuestions(\'demarches\')">📄 Démarches</button>'
    + '<button class="sug" onclick="showMelThemeQuestions(\'fibre\')">🌐 Fibre</button>'
    + '<button class="sug" onclick="showMelThemeQuestions(\'cctvl\')">🏛️ CCTVL</button>';
}

function showMelThemeQuestions(theme){
  const sugs = document.getElementById('sugs');
  const qs = MEL_THEME_SUGGESTIONS[theme] || [];
  if(!sugs) return;
  let extra = '';
  if(theme === 'urbanisme'){
    extra = '<a class="sug" href="https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=1.8048256197128292&lat=47.81814028325263&zoom=15&mlon=1.805022&mlat=47.818434" target="_blank" style="text-decoration:none">🗺️ Voir le PLU sur Géoportail →</a>';
  }
  sugs.innerHTML = '<button class="sug" onclick="renderMelThemes()">← Thèmes</button>'
    + qs.map(q => '<button class="sug" onclick="askMelSuggestedQuestion(this)">'+q+'</button>').join('')
    + extra;
}

function askMelSuggestedQuestion(btn){
  document.getElementById('minp').value = btn.textContent.trim();
  sendMel();
}

function sendSug(btn){ document.getElementById('minp').value=btn.textContent.trim(); sendMel(); }

// ════════════════════════════════════════════════════════
// MEL — Navigation arbre de décision
// ════════════════════════════════════════════════════════

function melShowTree(){
  const tree=document.getElementById('mel-tree');
  const l1=document.getElementById('mel-tree-l1');
  const l2=document.getElementById('mel-tree-l2');
  const msgs=document.getElementById('msgs');
  const sugs=document.getElementById('sugs');
  const mbar=document.querySelector('.mbar');
  const backBtn=document.getElementById('mel-back-btn');
  if(tree){tree.style.display='flex';tree.style.flexDirection='column';}
  if(l1){
    l1.style.display='flex';
    l1.style.flexDirection='column';
    l1.innerHTML = Object.entries(MEL_TREE || {}).map(function(entry){
      var cat = entry[0], def = entry[1] || {};
      var catSafe = String(cat).replace(/'/g, "\'");
      return '<button class="mel-cat-btn" onclick="melSelectCat(\'' + catSafe + '\')"><span class="ico">'
        + _melEsc(def.ico || '💬') + '</span>'
        + _melEsc(def.label || cat) + '</button>';
    }).join('');
  }
  if(l2){l2.classList.remove('active');l2.style.display='none';l2.innerHTML='';}
  if(msgs)msgs.style.display='none';
  if(sugs)sugs.style.display='none';
  if(mbar)mbar.style.display='none';
  if(backBtn)backBtn.remove();
  _melCat=null;_melZone=null;_melZoneLabel=null;_melAddr=null;
  _melChatContext='';_melChatCategory='autre';
}

function melSelectCat(cat){
  _melCat=cat;
  const def=MEL_TREE[cat];
  if(!def)return;
  if(def.openChatDirectly){
    melOpenChat('',cat,'');
    return;
  }
  const l1=document.getElementById('mel-tree-l1');
  const l2=document.getElementById('mel-tree-l2');
  if(!l2){console.error('mel-tree-l2 introuvable');return;}
  if(l1)l1.style.display='none';
  // Injecter le contenu AVANT d'afficher pour éviter le flash vide
  l2.innerHTML=_buildSubLevel(cat,def);
  l2.classList.add('active');
  l2.style.display='flex';
  l2.style.flexDirection='column';
  l2.scrollTop=0;
}

function _buildSubLevel(cat,def){
  let h=`<div class="mel-sub"><div class="mel-sub-hdr"><button class="mel-sub-back" onclick="melResetTree()">← Retour</button><span>${def.ico} ${def.label}</span></div>`;
  if(def.needZone){
    h+=`<div class="mel-zone-block"><label>📍 Votre adresse ou position GPS (pour identifier votre zone PLU)</label><div class="mel-zone-row"><input type="text" id="mel-addr-input" class="mel-addr-input" placeholder="Ex : 12 rue du Bourg" oninput="this.style.borderColor='';document.getElementById('mel-addr-warn')?.remove()" onkeydown="if(event.key==='Enter')melFindZoneByAddr()"/><button class="mel-addr-btn" onclick="melFindZoneByAddr()">🔍</button><button class="mel-gps-btn" onclick="melFindZoneByGPS()" title="Utiliser mon GPS">📍</button></div><div id="mel-zone-result" class="mel-zone-result"></div></div>`;
    h+=`<div class="mel-schema-block"><div class="mel-schema-label">📋 Schéma des autorisations</div><img src="./autorisation-urbanisme.jpg?v=3.7.3" alt="Autorisations urbanisme" class="mel-schema-img" onerror="this.closest('.mel-schema-block').style.display='none'"/></div>`;
  }
  for(const q of def.questions){
    h+=`<button class="mel-q-btn" onclick="melSelectQuestion('${cat}','${q.id}')"><span class="q-ico">${q.ico}</span><span>${q.label}</span></button>`;
  }
  h+=`<button class="mel-q-btn mel-autre" onclick="melSelectQuestion('${cat}','__autre__')"><span class="q-ico">💬</span><span>Autre question ou cas particulier…</span></button>`;
  h+=`</div>`;
  return h;
}

function melSelectQuestion(cat,qid){
  const def=MEL_TREE[cat];
  if(!def)return;

  // ── Urbanisme : adresse obligatoire avant de continuer ──────────
  if(def.needZone && !_melAddr){
    const inp=document.getElementById('mel-addr-input');
    if(inp){
      inp.style.borderColor='#e53e3e';
      inp.placeholder='⚠️ Saisissez votre adresse d\'abord…';
      inp.focus();
      let warn=document.getElementById('mel-addr-warn');
      if(!warn){
        warn=document.createElement('div');
        warn.id='mel-addr-warn';
        warn.style.cssText='color:#e53e3e;font-size:.78rem;font-weight:700;margin-top:5px;padding:6px 10px;background:#fff5f5;border-radius:7px;';
        inp.closest('.mel-zone-row').after(warn);
      }
      warn.textContent='⚠️ Veuillez saisir votre adresse ou utiliser le GPS pour identifier votre zone PLU.';
    }
    return;
  }

  const zoneCtx=[
    _melAddr ? 'Adresse : '+_melAddr+'.' : '',
    _melZone ? 'Zone PLU : '+_melZone+(_melZoneLabel?' ('+_melZoneLabel+')':'')+'.' : ''
  ].filter(Boolean).join(' ');

  if(qid==='__autre__'){
    melOpenChat('',cat,'Catégorie : '+def.label+'. '+zoneCtx);
    return;
  }
  const q=def.questions.find(x=>x.id===qid);
  if(!q)return;

  // ── Urbanisme : réponse directe depuis le JSON PLU ───────────────
  if(cat==='urbanisme' && _melZone){
    const zoneData=pluGetZone(_melZone);
    const {html:pluHtml, hasPluAnswer}=pluBuildAnswer(qid, zoneData, _melZone);
    if(hasPluAnswer){
      _showPluAnswer(pluHtml, q.label, cat, qid, zoneCtx);
      return;
    }
  }

  // ── Autres catégories ou cas non couverts : directAnswer ou MEL ──
  if(q.directAnswer){
    _showDirectAnswer(q.directAnswer,cat,q.topic||cat,zoneCtx+' '+(q.prompt||''),q.label);
    return;
  }
  const fullPrompt=[zoneCtx,q.prompt].filter(Boolean).join('\n');
  melOpenChat(fullPrompt,cat,zoneCtx,q.topic||cat);
}

// ════════════════════════════════════════════════════════
// MEL — Affichage réponse PLU avec onglets
// ════════════════════════════════════════════════════════
function _showPluAnswer(pluHtml, questionLabel, cat, qid, zoneCtx){
  const l2=document.getElementById('mel-tree-l2');
  if(!l2)return;

  // Masquer les boutons de questions (on garde juste le header et le bloc zone)
  const subDiv=l2.querySelector('.mel-sub');
  if(subDiv){
    subDiv.querySelectorAll('.mel-q-btn').forEach(b=>b.style.display='none');
  }

  // Supprimer réponse précédente si elle existe
  l2.querySelector('.mel-plu-answer')?.remove();

  const zoneData = _melZone ? pluGetZone(_melZone) : null;
  const ctx=encodeURIComponent((zoneCtx||'').substring(0,300));

  // ── Construire TOUT le HTML en une seule passe (évite innerHTML += qui casse les liens) ──
  let fullHtml = '';

  // Titre + bouton fermer
  fullHtml += '<div class="plu-answer-hdr">'
    +'<div class="plu-answer-title">📐 '+questionLabel+' — Zone <strong>'+(_melZone||'?')+'</strong></div>'
    +'<button class="plu-close-btn" onclick="pluCloseAnswer()" title="Retour aux questions">✕ Retour</button>'
    +'</div>';

  // Onglets
  fullHtml += '<div class="plu-tabs">'
    +'<button class="plu-tab active" onclick="pluSwitchTab(this,&quot;auth&quot;)">📋 Autorisation</button>'
    +'<button class="plu-tab" onclick="pluSwitchTab(this,&quot;rules&quot;)">📐 Règles de zone</button>'
    +'<button class="plu-tab" onclick="pluSwitchTab(this,&quot;interdits&quot;)">🚫 Interdictions</button>'
    +'</div>';

  // Onglet 1 : Autorisation (contenu principal)
  fullHtml += '<div class="plu-tab-content" id="plu-tab-auth">'+pluHtml+'</div>';

  // Onglet 2 : Toutes les règles de la zone
  let rulesHtml = '';
  if(zoneData){
    rulesHtml = pluRenderZoneCard(zoneData).replace(/<ul class="plu-interdits[\s\S]*?<\/ul>/,'').replace(/<div class="plu-interdits[\s\S]*?<\/div>/,'').replace(/<div class="plu-alerte[\s\S]*?<\/div>/,'');
  } else {
    rulesHtml = '<p style="color:var(--muted);font-size:.82rem;padding:8px 0;">Zone non identifiée — saisissez votre adresse pour obtenir les règles spécifiques.</p>';
  }
  fullHtml += '<div class="plu-tab-content" id="plu-tab-rules" style="display:none">'+rulesHtml+'</div>';

  // Onglet 3 : Interdictions
  let interditsHtml = '';
  if(zoneData && zoneData.interdictions && zoneData.interdictions.length){
    interditsHtml = '<ul class="plu-interdits">'
      + zoneData.interdictions.map(i=>'<li>'+i+'</li>').join('')
      + '</ul>';
    if(zoneData.alerte) interditsHtml = '<div class="plu-alerte">'+zoneData.alerte+'</div>'+interditsHtml;
  } else {
    interditsHtml = '<p style="color:var(--muted);font-size:.82rem;padding:8px 0;">Aucune interdiction spécifique trouvée pour cette zone.</p>';
  }
  fullHtml += '<div class="plu-tab-content" id="plu-tab-interdits" style="display:none">'+interditsHtml+'</div>';

  const ctxSafe = ctx.replace(/'/g, '%27');

  // Bouton MEL + bouton retour en bas
  fullHtml += '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">'
    +'<button class="mel-open-chat-btn" onclick="melOpenChatFromDirect(\''+cat+'\',\'urbanisme\',decodeURIComponent(\''+ctxSafe+'\'))">💬 Question complémentaire ? Parler à MEL</button>'
    +'<button class="plu-back-bottom-btn" onclick="pluCloseAnswer()">← Retour aux questions</button>'
    +'</div>';

  // ── Injection unique dans le DOM ──
  const div=document.createElement('div');
  div.className='mel-plu-answer';
  div.innerHTML = fullHtml;

  if(subDiv) subDiv.appendChild(div);
  else l2.appendChild(div);
  setTimeout(()=>div.scrollIntoView({behavior:'smooth',block:'start'}),50);
}

function pluCloseAnswer(){
  // Réafficher les boutons de questions, supprimer la réponse
  const l2=document.getElementById('mel-tree-l2');
  if(!l2)return;
  l2.querySelectorAll('.mel-q-btn').forEach(b=>b.style.display='');
  l2.querySelector('.mel-plu-answer')?.remove();
}

function pluSwitchTab(btn, tabId){
  const answer=btn.closest('.mel-plu-answer');
  if(!answer)return;
  answer.querySelectorAll('.plu-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  answer.querySelectorAll('.plu-tab-content').forEach(c=>c.style.display='none');
  const target=answer.querySelector('#plu-tab-'+tabId);
  if(target)target.style.display='';
}

// ════════════════════════════════════════════════════════
// MEL — Réponses directes (catégories non-urbanisme)
// ════════════════════════════════════════════════════════

function _renderDirectAnswer(answer){
  // answer peut être une string ou un objet {text, links:[{label,url,tel}]}
  if(typeof answer==='string'){
    // Transformer URLs et tél en liens cliquables
    let t=answer
      .replace(/\n/g,'<br>')
      .replace(/(https?:\/\/[^\s<>]+)/g,'<a href="$1" target="_blank" style="color:var(--leaf);font-weight:700;word-break:break-all;">$1</a>')
      .replace(/(?<![\/\w@])((?:www\.)[^\s<>]+)/g,'<a href="https://$1" target="_blank" style="color:var(--leaf);font-weight:700;">$1</a>')
      .replace(/(?<!\d)(0[1-9](?:[\s\.\-]?\d{2}){4})(?!\d)/g,'<a href="tel:$1" style="color:var(--leaf);font-weight:700;">📞 $1</a>');
    return '<p style="margin:0 0 8px;line-height:1.6;">'+t+'</p>';
  }
  // Format objet
  let h='<p style="margin:0 0 10px;line-height:1.6;">'+answer.text+'</p>';
  if(answer.links&&answer.links.length){
    h+='<div style="display:flex;flex-direction:column;gap:6px;">';
    for(const lk of answer.links){
      const href=lk.tel?'tel:'+lk.tel:lk.url;
      const target=lk.tel?'':'target="_blank"';
      const isLocal=href.startsWith('tel:')||href.startsWith('mailto:');
      const clickHandler=isLocal?' onclick="event.stopPropagation();window.location.href=\''+href.replace(/'/g,"\\'")+'\';return false;"':'';
      h+='<a href="'+href+'" '+target+clickHandler+' style="display:block;padding:10px 13px;background:var(--forest);color:white;border-radius:9px;text-decoration:none;font-weight:700;font-size:.84rem;">'+lk.label+'</a>';
    }
    h+='</div>';
  }
  return h;
}

function _showDirectAnswer(answer,cat,topic,ctxForMel,questionLabel){
  const l2=document.getElementById('mel-tree-l2');
  if(!l2)return;
  l2.querySelector('.mel-direct-answer')?.remove();
  const container=l2.querySelector('.mel-sub');
  if(!container){console.warn('mel-sub not found in l2');return;}
  const div=document.createElement('div');
  div.className='mel-direct-answer';
  // Enrichir le contexte avec le libellé de la question posée
  const fullCtx = (questionLabel ? 'Question initiale : '+questionLabel+'. ' : '') + (ctxForMel||'');
  const ctx=encodeURIComponent(fullCtx.substring(0,400)).replace(/'/g,'%27');
  div.innerHTML='<span class="da-label">Réponse</span>'
    +_renderDirectAnswer(answer)
    +'<button class="mel-open-chat-btn" style="margin-top:10px;" onclick="melOpenChatFromDirect(\''+cat+'\',\''+topic+'\',decodeURIComponent(\''+ctx+'\'))">💬 Question complémentaire ? Parler à MEL</button>';
  container.appendChild(div);
  setTimeout(()=>div.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
}

function melOpenChatFromDirect(cat,topic,ctx){
  melOpenChat('',cat,ctx||'',topic||cat);
}

// ════════════════════════════════════════════════════════
// MEL — Bascule vers le mode chat libre
// ════════════════════════════════════════════════════════
function melOpenChat(initialMsg,category,extraCtx,topic){
  _melChatContext=extraCtx||'';
  _melChatCategory=category||'autre';
  _melChatTopic=topic||category||'autre';

  // Construire le contexte complet à injecter dans _melChatContext
  // Zone PLU + adresse si disponibles
  const zonePrefix = _melZone
    ? '[Zone PLU : '+_melZone+(_melAddr?' — '+_melAddr:'')+'] '
    : (_melAddr ? '[Adresse : '+_melAddr+'] ' : '');
  const catLabel = {
    urbanisme:'Urbanisme & Construction',
    enfance:'Enfance & Jeunesse',
    administratif:'Démarches administratives',
    dechets:'Déchets & Propreté',
    numerique:'Numérique & Internet',
    autre:''
  }[_melChatCategory]||'';
  const catPrefix = catLabel ? '[Catégorie : '+catLabel+'] ' : '';
  if(!_melChatContext) _melChatContext = zonePrefix + catPrefix;
  else _melChatContext = zonePrefix + catPrefix + _melChatContext;

  // Afficher le chat, cacher l'arbre
  const tree=document.getElementById('mel-tree');
  const msgs=document.getElementById('msgs');
  const mbar=document.querySelector('.mbar');
  if(tree)tree.style.display='none';
  if(msgs){msgs.style.display='flex';msgs.style.flexDirection='column';}
  if(mbar)mbar.style.display='flex';

  // Bouton retour vers l'arbre
  if(!document.getElementById('mel-back-btn')){
    const backBtn=document.createElement('button');
    backBtn.id='mel-back-btn';
    backBtn.textContent='← Retour aux thèmes';
    backBtn.style.cssText='width:100%;padding:8px;background:var(--mist);border:none;border-radius:8px;font-family:Nunito,sans-serif;font-size:.78rem;font-weight:700;color:var(--leaf);cursor:pointer;margin-bottom:6px;flex-shrink:0;';
    backBtn.onclick=()=>{document.getElementById('mel-back-btn')?.remove();melShowTree();};
    if(msgs)msgs.parentNode.insertBefore(backBtn,msgs);
  }

  // Message d'accueil MEL (une seule fois)
  if(!melInited){
    melInited=true;
    addMsg('bot','Bonjour\u00a0! Je suis MEL.\n\nComment puis-je vous aider\u00a0? \ud83d\ude0a');
  }

  // Reset melBusy (sécurité si état corrompu)
  melBusy=false;

  const inp=document.getElementById('minp');
  if(!inp) return;

  // Labels catégories pour le pré-remplissage
  const catLabels = {
    urbanisme:"une question d'urbanisme",
    enfance:"une question sur l'enfance et la jeunesse",
    administratif:"une question sur les démarches administratives",
    dechets:"une question sur les déchets",
    numerique:"une question sur le numérique"
  };
  const catPhrase = catLabels[_melChatCategory] || '';
  const zonePhrase = _melZone ? ', je suis en zone '+_melZone : '';

  if(initialMsg && initialMsg.trim()){
    inp.value=initialMsg;
    inp.placeholder='Votre question…';
    setTimeout(()=>{ melBusy=false; sendMel(); }, 200);
  } else {
    // Format demandé : "J'ai une question [catégorie], je suis en zone [zone]. "
    inp.value = catPhrase ? 'J\'ai '+catPhrase+zonePhrase+'. ' : '';
    inp.placeholder='Votre question…';
    inp.focus();
    const len=inp.value.length;
    inp.setSelectionRange(len,len);
  }
}

function melResetTree(){
  _melCat=null;_melZone=null;_melZoneLabel=null;_melAddr=null;
  const l1=document.getElementById('mel-tree-l1');
  const l2=document.getElementById('mel-tree-l2');
  if(l1)l1.style.display='';
  if(l2){l2.classList.remove('active');l2.style.display='';l2.innerHTML='';}
}

// ════════════════════════════════════════════════════════
// MEL — Détection de zone PLU (adresse + GPS)
// ════════════════════════════════════════════════════════

async function melFindZoneByAddr(){
  const inp=document.getElementById('mel-addr-input');
  const addr=(inp?.value||'').trim();
  if(!addr){_setZoneResult('warn','⚠️ Saisissez une adresse');return;}
  _setZoneResult('','⏳ Recherche…',true);
  try{
    const q=encodeURIComponent(addr+' Mézières-lez-Cléry 45370');
    const geo=await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1&citycode=45204`);
    const gd=await geo.json();
    const feat=gd?.features?.[0];
    if(!feat){_setZoneResult('warn','⚠️ Adresse introuvable. Essayez avec moins de mots ou utilisez le GPS.');return;}
    const [lon,lat]=feat.geometry.coordinates;
    _melAddr=feat.properties?.label||addr;
    await _fetchZonePLU(lat,lon);
  }catch(e){_setZoneResult('err','❌ Erreur réseau. Réessayez ou utilisez le GPS.');}
}

function melFindZoneByGPS(){
  if(!navigator.geolocation){_setZoneResult('warn','⚠️ GPS non disponible.');return;}
  _setZoneResult('','📍 Localisation…',true);
  navigator.geolocation.getCurrentPosition(
    async pos=>{
      _melAddr=`GPS (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`;
      await _fetchZonePLU(pos.coords.latitude,pos.coords.longitude);
    },
    ()=>_setZoneResult('warn','⚠️ GPS refusé. Saisissez votre adresse.'),
    {enableHighAccuracy:true,timeout:8000}
  );
}

async function _fetchZonePLU(lat,lon){
  try{
    const r=await fetch(`${MEL_BACKEND}/api/zone-plu?lat=${lat}&lon=${lon}`);
    const d=await r.json();
    if(!d.ok||!d.zone){
      _setZoneResult('warn','⚠️ Zone PLU non trouvée automatiquement. Sélectionnez-la manuellement :');
      _showManualZoneSelector();return;
    }
    _melZone=d.zone;_melZoneLabel=d.liblong||'';_melZoneNorm=pluNormalizeZone(d.zone);
    _setZoneResult('ok',`✅ Zone PLU détectée : <strong>${d.zone}</strong>${d.liblong?' — '+d.liblong:''}`);
  }catch(e){
    _setZoneResult('err','❌ Service IGN indisponible. Sélectionnez votre zone :');
    _showManualZoneSelector();
  }
}

function _showManualZoneSelector(){
  const result=document.getElementById('mel-zone-result');
  if(!result||result.querySelector('select'))return;
  const sel=document.createElement('select');
  sel.className='mel-zone-manual';
  sel.innerHTML='<option value="">— Sélectionner votre zone —</option>'
    +'<option value="Ua">Ua – Centre-bourg / hameaux anciens</option>'
    +'<option value="Ub">Ub – Habitat résidentiel récent</option>'
    +'<option value="Ub1">Ub1 – Clos de Manthelon</option>'
    +'<option value="Ue">Ue – Équipements publics</option>'
    +'<option value="Ui">Ui – Zone industrielle</option>'
    +'<option value="1AU">1AU – Zone à urbaniser</option>'
    +'<option value="2AU">2AU – Réserve foncière (inconstructible)</option>'
    +'<option value="A">A – Zone agricole</option>'
    +'<option value="Ah">Ah – Hameaux agricoles</option>'
    +'<option value="N">N – Zone naturelle</option>'
    +'<option value="Nh">Nh – Hameaux naturels</option>'
    +'<option value="Nj">Nj – Jardins</option>';
  sel.onchange=()=>{
    _melZone=sel.value||null;
    _melZoneLabel=sel.options[sel.selectedIndex]?.text?.split('–')[1]?.trim()||'';
    if(_melZone)_setZoneResult('ok',`✅ Zone sélectionnée : <strong>${_melZone}</strong> — ${_melZoneLabel}`);
  };
  result.after(sel);
}

function _setZoneResult(type,html,spin=false){
  const el=document.getElementById('mel-zone-result');
  if(!el)return;
  el.style.display='block';
  el.className='mel-zone-result'+(type?' '+type:'');
  el.innerHTML=spin?`<span class="mel-zone-spin">⏳</span> ${html}`:html;
}
