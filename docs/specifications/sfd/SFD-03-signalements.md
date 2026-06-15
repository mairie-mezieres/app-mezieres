# SFD-03 — Signalements citoyens

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Signalements**

## 1. Objectif

Permettre à un habitant de **signaler un problème** sur l'espace public (voirie, éclairage,
propreté, etc.), avec localisation et photo optionnelles, d'en **suivre le traitement**, et à la
mairie de gérer ces signalements via Trello avec un retour au citoyen.

## 2. Acteurs concernés

- **Citoyen** : dépose un signalement, suit son état.
- **Administrateur** : traite le signalement et met à jour son statut (cf. [SFD-14](SFD-14-administration-backoffice.md)).
- **Système** : crée la carte Trello, notifie le citoyen aux changements de statut.

## 3. User stories

- **US-03.1** — En tant que citoyen, je veux signaler un problème (catégorie + description) afin
  qu'il soit pris en charge par la mairie.
- **US-03.2** — En tant que citoyen, je veux localiser le problème (GPS automatique ou point sur
  carte) afin que l'intervention soit ciblée.
- **US-03.3** — En tant que citoyen, je veux joindre une photo afin d'illustrer le problème.
- **US-03.4** — En tant que citoyen, je veux être notifié de l'avancement de mon signalement afin
  de savoir qu'il est traité.
- **US-03.5** — En tant que citoyen, je veux retrouver mes signalements et leur état afin d'en
  garder une trace.

## 4. Critères d'acceptation (Gherkin)

### US-03.1
```
Étant donné le formulaire de signalement
Quand je choisis une catégorie et saisis une description puis valide
Alors le signalement est transmis et une carte est créée côté mairie (Trello)
Et une confirmation s'affiche avec un accès au suivi.
```

### US-03.2
```
Étant donné le formulaire de signalement
Quand j'active la localisation GPS ou place un point sur la carte
Alors les coordonnées sont jointes et un lien cartographique est généré pour la mairie
Et si je refuse la localisation, le signalement reste possible sans coordonnées.
```

### US-03.3
```
Étant donné le formulaire de signalement
Quand j'ajoute une photo
Alors elle est compressée puis transmise (taille maîtrisée)
Et un aperçu m'est présenté avant l'envoi.
```

### US-03.4
```
Étant donné un signalement avec notification activée
Quand l'administrateur fait passer son statut (à traiter → en cours → résolu)
Alors je reçois une notification push correspondant au nouveau statut.
```

### US-03.5 (mode dégradé hors-ligne)
```
Étant donné que le réseau est indisponible au moment de l'envoi
Quand le délai d'envoi expire
Alors le signalement est conservé localement et la synchronisation est proposée/retentée
Et il reste visible dans « Suivi ».
```

## 5. Règles de gestion

- **RG-03.1** — Champs : **catégorie et description obligatoires** ; localisation et photo facultatives.
- **RG-03.2** — **Rate-limiting** : 10 requêtes/minute (cf. RG-T-19).
- **RG-03.3** — Limites de taille : description **≤ 5 000 caractères** ; photo **≤ 6 Mo** (corps de
  requête étendu) ; compression côté PWA (max 800 px, qualité 0,7) avec repli à ~80 ko en base64.
- **RG-03.4** — Pour chaque signalement, une **carte Trello** est créée dans la liste correspondant
  au type (signalement / bug / demande) ; la **photo** y est jointe en pièce jointe.
- **RG-03.5** — La description transmise inclut automatiquement des **métadonnées d'appareil**
  (modèle, OS, navigateur, mode PWA) à des fins de diagnostic.
- **RG-03.6** — Le **statut** suit le cycle `pending → in_progress → resolved`, **synchronisé** avec
  le nom de la liste Trello (le déplacement de carte met à jour le statut).
- **RG-03.7** — Si un **jeton de notification** (MAT-REF) est fourni, un **push** est envoyé au
  citoyen à chaque changement de statut.
- **RG-03.8** — La **vue publique** des signalements est **anonymisée** : masquage des numéros de
  téléphone/emails et suppression des métadonnées d'appareil (cf. RG-T-7).
- **RG-03.9** — Détection **anti-doublon** sur titre + photo (cache des 500 dernières soumissions).
- **RG-03.10** — Côté PWA, conservation des **50 derniers** signalements de l'appareil
  (`mat_my_signals_v1`, FIFO) pour le suivi local.
- **RG-03.11** — Le cache serveur `mat:signals` est plafonné à **100** ; la **source de vérité**
  reste **Trello**.

## 6. Données manipulées

- **Signalement (Redis `mat:signals` + Trello)** : `id`, `type`, `cat`, `desc`, `lat`, `lon`,
  `mapsLink`, `hasPhoto`, `photo`, `date`, `dateISO`, `status`, `notifyToken`, `trelloId`, `trelloUrl`.
- **Local** : `mat_my_signals_v1` (suivi), `mat:notify:signal:{id}` (jeton de notification),
  `mat_signal_form_state` (brouillon).
- **Photo (proxy)** : route `GET /api/signalements/photo/{cardId}/{attachId}` (cache 1 h).

## 7. Intégrations & dépendances

- **Trello API** : création de carte + pièce jointe + suivi des listes (statuts) + archivage.
- **Web Push** : notification de changement de statut (cf. [SFD-08](SFD-08-notifications-push.md)).
- **Géolocalisation** (navigateur) + **Leaflet** (carte) + **IGN api-adresse** (géocodage inverse).
- Routes : `POST /signal`, `GET /api/signalements`, `PATCH /admin/signals/{id}`.

## 8. Cas limites & mode dégradé

- **Hors-ligne / timeout (35 s)** : conservation locale + proposition de synchronisation push.
- **Cloudinary/Trello indisponible** : repli sur pièce jointe binaire ; le signalement n'est pas perdu.
- **Quota Redis** : le cache `mat:signals` peut être indisponible, mais Trello reste la source de vérité.

## 9. Exigences de conformité spécifiques

- **RGPD** : signalement **anonyme** (RG-T-5) ; la photo et la localisation sont fournies
  volontairement ; anonymisation de la vue publique (RG-T-7). Conservation alignée sur le besoin de
  traçabilité de la mairie (cf. RG-T-9) — purge possible (cf. [SFD-15](SFD-15-supervision-conformite.md)).
