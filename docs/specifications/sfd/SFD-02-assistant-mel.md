# SFD-02 — Assistant virtuel MEL

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Assistant MEL**

## 1. Objectif

Offrir aux habitants un **assistant conversationnel** (MEL) répondant aux questions courantes
sur la commune (horaires, démarches, urbanisme/PLU, déchets, transports…), via un **arbre de
questions guidées** et un **chat libre** propulsé par IA, avec une priorité forte à la fiabilité
(pas de décision administrative, réponses sourcées et sans valeur juridique).

## 2. Acteurs concernés

- **Citoyen** : pose des questions (guidées ou libres).
- **Administrateur** : configure l'arbre de décision, les réponses directes et les liens
  (cf. [SFD-14](SFD-14-administration-backoffice.md)).

## 3. User stories

- **US-02.1** — En tant que citoyen, je veux choisir une catégorie et une question pré-rédigée
  afin d'obtenir rapidement une réponse fiable sans tout saisir.
- **US-02.2** — En tant que citoyen, je veux poser une question en texte libre afin d'obtenir une
  réponse adaptée à ma situation.
- **US-02.3** — En tant que citoyen, je veux connaître les règles d'urbanisme applicables à mon
  terrain (zone PLU) afin de préparer mes démarches.
- **US-02.4** — En tant que citoyen, je veux que l'assistant fonctionne même hors-ligne pour les
  questions les plus fréquentes afin d'avoir l'essentiel en toute circonstance.

## 4. Critères d'acceptation (Gherkin)

### US-02.1
```
Étant donné l'arbre de catégories MEL
Quand je sélectionne une catégorie puis une question pré-rédigée disposant d'une réponse directe
Alors la réponse s'affiche immédiatement, sans appel à l'IA
Et les liens utiles associés (URL ou téléphone) sont proposés.
```

### US-02.2
```
Étant donné le chat libre
Quand je saisis une question
Alors MEL cherche d'abord une réponse directe, puis le cache, puis interroge l'IA (Mistral)
Et la réponse s'affiche avec un indicateur « MEL réfléchit… » pendant l'attente
Et la réponse rappelle qu'elle est sans valeur juridique et renvoie à la mairie si nécessaire.
```

### US-02.3
```
Étant donné une question d'urbanisme nécessitant la zone PLU
Quand je fournis mon adresse ou mes coordonnées (ou choisis la zone manuellement)
Alors MEL identifie la zone PLU (via l'IGN) et restitue les règles applicables
Et signale clairement si la construction envisagée est interdite.
```

### US-02.4
```
Étant donné que je suis hors-ligne
Quand je pose une question fréquente couverte par une réponse directe ou le cache
Alors MEL répond sans réseau
Mais les fonctions nécessitant l'IGN ou l'IA ne sont pas disponibles (message explicite).
```

## 5. Règles de gestion

- **RG-02.1** — Pipeline de réponse : **normalisation** (minuscules, accents) → **réponses directes**
  (offline) → **cache Redis 24 h** → **appel Mistral** (prioritaire) → **repli Claude** si Mistral
  indisponible.
- **RG-02.2** — **Rate-limiting** : 30 requêtes/minute par IP (cf. RG-T-19).
- **RG-02.3** — **Quota journalier** : 100 questions/jour par `deviceId` (clé Redis à TTL 24 h) ;
  au-delà, code 429 et message explicite.
- **RG-02.4** — **Timeout** d'appel IA : 8 s côté PWA ; en cas d'échec des deux fournisseurs, message
  générique de difficulté technique (le fournisseur utilisé n'est jamais révélé).
- **RG-02.5** — **Anti-injection** : les messages dont le rôle n'est pas `user`/`assistant` sont
  rejetés ; détection de motifs d'injection (FR/EN, Base64, leetspeak, marqueurs de rôle).
- **RG-02.6** — En cas d'injection détectée, l'appareil est **bloqué 24 h** (clé `mat:mel:blocked:{deviceId}`).
- **RG-02.7** — Le **contexte externe** injecté dans le prompt (agenda, pages web) est **neutralisé**
  (anti-injection indirecte) avant transmission à l'IA.
- **RG-02.8** — Les réponses sont **sans valeur juridique** et renvoient à la mairie pour toute
  décision (cf. RG-T-13/RG-T-14).
- **RG-02.9** — L'assistant peut être **désactivé** par l'administrateur (`melEnabled`), avec un
  message personnalisé (`melDisabledMessage`).
- **RG-02.10** — La **journalisation des questions** est désactivée par défaut ; si activée, rétention
  90 jours (cf. RG-T-10).

## 6. Données manipulées

- **Arbre MEL (Redis `mat:mel:tree:data`)** : catégories `{ label, ico, needZone, openChatDirectly,
  questions[] }` ; question `{ id, label, ico, topic, prompt, directAnswer (texte + liens) }`.
- **Quotas / blocages** : `mat:mel:quotas:{deviceId}:{date}` (TTL 24 h), `mat:mel:blocked:{deviceId}` (TTL 24 h).
- **Cache réponses** : clé dédiée (TTL 24 h).
- **Journal (optionnel)** : `mat:mel:questions:{date}` (TTL 90 j) — contenu potentiellement
  personnel (⚠️ AIPD requise avant activation).
- **Statistiques IA** : `mat:ia:stats` (tokens, coûts par fournisseur) ; catégories MEL.

## 7. Intégrations & dépendances

- **Mistral AI** (prioritaire) / **Anthropic Claude** (repli) : génération des réponses.
- **IGN (Apicarto / api-adresse)** : géocodage et zone PLU.
- Route : `POST /mel`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : réponses directes + cache uniquement ; zones PLU indisponibles.
- **IA indisponible** : repli Mistral→Claude, puis message générique.
- **Quota/rate-limit atteint** : 429 + message ; pas de blocage permanent (réinitialisation à 24 h).

## 9. Exigences de conformité spécifiques

- **IA Act** : transparence (assistant identifié), non haut-risque, mesures anti-injection /
  anti-hallucination (cf. RG-T-12 à RG-T-14, et `docs/note-conformite-MEL.md` du backend).
- **RGPD** : anonymat (RG-T-5) ; journalisation off par défaut (RG-T-10) ; IP utilisée seulement
  pour le contrôle de quota.
