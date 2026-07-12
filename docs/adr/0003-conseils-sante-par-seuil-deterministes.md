# ADR-0003 — Conseils santé « du jour » déterministes, par seuil

**Date** : 2026-07-11
**Statut** : accepté

## Contexte

La fenêtre météo affiche déjà un indice de qualité de l'air (IQA), les pollens, la
température et l'UV. La mairie a souhaité, en plus, **donner des conseils** aux habitants
(que faire en cas de pic d'ozone, de canicule, de pollens…). Public cible : des habitants,
souvent seniors, pour qui un tableau de valeurs en µg/m³ n'est pas exploitable.

## Décision

Un bloc **« 💡 Conseils du jour »** est rendu dans `js/mat-widgets.js` (fenêtre météo), selon
trois principes :

1. **Conditionnel — le silence est le défaut.** Chaque conseil n'apparaît que si un
   paramètre franchit un seuil (chaleur ≥ 32 / ≥ 36 °C, froid min ≤ −4 °C, IQA ≥ 60 / ≥ 80,
   pollens ≥ « Élevé », UV ≥ 8). Quand tout est clément, aucun bloc ne s'affiche — on n'ennuie
   pas l'utilisateur. Les seuils sont **auto-limitants par saison** (le froid ne se déclenche
   pas l'été, l'UV pas l'hiver).
2. **Déterministe, pas d'IA.** Règles par seuil en dur, cohérentes avec la discipline
   anti-hallucination du projet (cf. grounding MEL). Aucune génération de texte.
3. **Général, pas médical, sourcé.** Gestes de bon sens de santé publique, avec la mention
   « source : Santé publique France / ATMO — en cas de doute, voyez votre médecin ». Protège
   la commune et donne du crédit. Même esprit que les consignes VigiEau déjà en place.

En complément, le **polluant dominant** (sous-indice AQI le plus élevé — souvent l'ozone en
été) est exposé par le backend (`routes/env-local.js`, clé Redis `mat:env-local:v5`) et affiché
sous la barre IQA. L'IQA global européen *étant* ce maximum, c'est une info gratuite qui
répond à « qu'est-ce qui pollue aujourd'hui ».

## Conséquences

- Pas de notification push pour ces conseils : ce serait de la fatigue d'alerte. Le push reste
  réservé aux vraies vigilances (météo, sécheresse).
- Pas de tableau chiffré µg/m³ : jugé illisible pour le public. À ajouter seulement si un
  habitant le réclame vraiment.
- Pour ajuster un seuil ou ajouter un conseil : une entrée dans le tableau `_cons` de
  `loadMeteoDetail` (`js/mat-widgets.js`). Tests : scénarios chaud/froid/air/pollens/UV en
  Chromium headless.
