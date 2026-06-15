# SFD-13 — Accessibilité & personnalisation

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Accessibilité & personnalisation**

## 1. Objectif

Permettre à chaque habitant d'**adapter l'interface** à ses besoins (vue, confort de lecture,
audio, thème), avec une exigence forte d'accessibilité pour un public majoritairement sénior
(objectif **RGAA 4 / WCAG 2.1 AA**).

## 2. Acteurs concernés

- **Citoyen** : règle ses préférences d'accessibilité et d'affichage.

## 3. User stories

- **US-13.1** — En tant que citoyen malvoyant, je veux agrandir le texte et activer un fort contraste
  afin de lire confortablement.
- **US-13.2** — En tant que citoyen daltonien, je veux activer un mode adapté afin de distinguer les informations.
- **US-13.3** — En tant que citoyen, je veux écouter le contenu (lecture vocale) afin de ne pas avoir à lire.
- **US-13.4** — En tant que citoyen, je veux choisir un thème (clair/sombre) et d'autres réglages de
  confort afin d'adapter l'application à mes préférences.
- **US-13.5** — En tant que citoyen, je veux que mes préférences soient mémorisées afin de les
  retrouver à chaque visite.

## 4. Critères d'acceptation (Gherkin)

### US-13.1
```
Étant donné le panneau « Accessibilité »
Quand je sélectionne une taille de texte agrandie et/ou le contraste élevé
Alors l'interface s'adapte immédiatement
Et les contrastes respectent le niveau WCAG 2.1 AA.
```

### US-13.3
```
Étant donné que la lecture vocale est activée
Quand je déclenche la lecture d'un contenu
Alors le texte est lu en français via la synthèse vocale du navigateur
Et je peux interrompre/reprendre la lecture.
```

### US-13.5
```
Étant donné des préférences réglées
Quand je reviens sur l'application
Alors mes réglages sont restaurés (taille, contraste, daltonien, lecture vocale, thème, etc.)
Et un bouton « Réinitialiser » permet de revenir aux valeurs par défaut.
```

## 5. Règles de gestion

- **RG-13.1** — Réglages disponibles : **taille de texte** (normal / A+ / A++), **contraste élevé**,
  **mode daltonien**, **lecture vocale (TTS)**, **espacement des lignes**, **boutons tactiles
  agrandis** (mobile), **aide contextuelle**, **thème** (vert / bleu / sombre), masquage
  header/widgets.
- **RG-13.2** — Les préférences sont **persistées localement** (`mat_accessibility`) et appliquées
  au chargement ; un **« Réinitialiser »** restaure les valeurs par défaut.
- **RG-13.3** — Objectif **RGAA 4 / WCAG 2.1 AA** (cf. RG-T-15) : contrastes ≥ 4,5:1 (texte normal),
  vérification automatique **axe-core** en CI.
- **RG-13.4** — La **lecture vocale** utilise l'API de synthèse du navigateur, en **français**, avec
  contrôle pause/reprise.
- **RG-13.5** — L'**aide contextuelle**, lorsqu'elle est activée, affiche des conseils ciblés sur les
  écrans clés (assistant, signalement, contact) et reste **dismissible**.

## 6. Données manipulées

- **Local** : `mat_accessibility` (JSON des préférences), `mat_accessibility_profile` (preset éventuel).

## 7. Intégrations & dépendances

- **API Web Speech** (synthèse vocale, native navigateur).
- Aucune dépendance backend (entièrement côté client).

## 8. Cas limites & mode dégradé

- **Hors-ligne** : entièrement fonctionnel (réglages locaux, pas d'appel réseau).
- **TTS non supporté** par le navigateur : l'option est masquée/inopérante sans erreur bloquante.

## 9. Exigences de conformité spécifiques

- **Accessibilité** : exigence centrale du produit (public sénior), vérifiée en continu (axe-core,
  Lighthouse) — cf. RG-T-15.
- **RGPD** : préférences stockées **localement uniquement**, aucune donnée transmise.
