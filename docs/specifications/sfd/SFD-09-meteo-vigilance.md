# SFD-09 — Météo & vigilance

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Météo & vigilance**

## 1. Objectif

Informer les habitants de la **météo locale** (prévisions) et des **vigilances Météo-France** du
Loiret, avec **publication automatique** (Facebook + push) en cas d'alerte significative.

## 2. Acteurs concernés

- **Citoyen** : consulte la météo et les vigilances ; s'abonne aux alertes (cf. [SFD-08](SFD-08-notifications-push.md)).
- **Système** : interroge périodiquement la vigilance, publie/notifie selon les seuils.

## 3. User stories

- **US-09.1** — En tant que citoyen, je veux voir la météo locale (température, conditions,
  prévisions horaires) afin d'organiser ma journée.
- **US-09.2** — En tant que citoyen, je veux être informé des vigilances Météo-France (niveau,
  phénomène, période) afin d'anticiper les risques.
- **US-09.3** — En tant que citoyen abonné, je veux recevoir une notification en cas d'alerte météo
  afin d'être prévenu sans ouvrir l'application.

## 4. Critères d'acceptation (Gherkin)

### US-09.1
```
Étant donné la tuile/overlay météo
Quand je la consulte
Alors la température actuelle, les conditions, les prévisions horaires et journalières s'affichent
Et, en cas d'indisponibilité de la source, l'application indique « information indisponible » (pas de fausse valeur).
```

### US-09.2
```
Étant donné une vigilance active sur le Loiret
Quand je consulte la météo
Alors le niveau (vert/jaune/orange/rouge), le phénomène et la période de validité sont affichés.
```

### US-09.3
```
Étant donné que je suis abonné aux alertes météo avec un niveau minimal
Quand une vigilance atteint ce niveau
Alors je reçois une notification push (urgence haute)
Et je ne reçois pas de doublon pour la même alerte dans les 12 heures.
```

## 5. Règles de gestion

- **RG-09.1** — Les **prévisions** proviennent d'**Open-Meteo** pour des coordonnées **fixes** de la
  commune (pas de géolocalisation du citoyen) ; cache **30 minutes** (mémoire + Redis), avec
  possibilité de servir une valeur périmée si la source échoue (`stale`).
- **RG-09.2** — Les **vigilances** proviennent de **Météo-France** (département 45) ; la période
  retenue est l'actuelle, ou la prochaine si elle débute sous **36 h**.
- **RG-09.3** — **Auto-publication Facebook** si `AUTO_POST_WEATHER_ALERTS` est actif **et** niveau
  **≥ `AUTO_POST_MIN_LEVEL`** (défaut **3 = orange**).
- **RG-09.4** — **Notification push** si niveau **≥ `AUTO_PUSH_WEATHER_MIN_LEVEL`** (défaut
  **2 = jaune**), filtrée selon le **niveau minimal** choisi par chaque abonné.
- **RG-09.5** — **Déduplication 12 h** : pas de nouvel envoi pour une alerte de **même niveau et même
  phénomène** dans les 12 heures (`mat:weather:last`).
- **RG-09.6** — La vérification de vigilance est **planifiée** (toutes les ~15 minutes), avec un
  premier contrôle ~30 s après le démarrage du backend.
- **RG-09.7** — Le texte de vigilance est **nettoyé** (masquage d'adresses, neutralisation
  d'injection) avant toute réutilisation.

## 6. Données manipulées

- **Cache prévisions** : `mat:meteo:cache` (TTL 30 min).
- **Dernière alerte** : `mat:weather:last` (+ `pushedAt`), `mat:weather:last:push` (TTL 12 h).
- **Abonnés météo** : `mat:subs:meteo` (avec `minLevel`).

## 7. Intégrations & dépendances

- **Open-Meteo** (prévisions), **Météo-France** (vigilances), **Facebook** (auto-post),
  **Web Push** (alertes).
- Routes : `GET /meteo/commune`, `GET /meteo/forecast`, `GET /meteo/alertes/check`.

## 8. Cas limites & mode dégradé

- **Source indisponible** : affichage « information indisponible » (RG-T-3) ; pas de fausse vigilance.
- **Cache périmé** : valeur `stale` servie en dernier recours.
- **Quota Redis** : la lecture continue via le cache mémoire.

## 9. Exigences de conformité spécifiques

- **RGPD** : aucune géolocalisation du citoyen (coordonnées communales fixes) ; abonnement météo
  anonyme (RG-T-5).
