# Référentiel de spécifications techniques détaillées (STD) — MAT

Ce dossier décrit le **contrat technique réel** de l'API backend de MAT
(dépôt `chatbot-mairie-mezieres`, Node.js / Express) : pour chaque endpoint, la **méthode et
le chemin**, l'**authentification**, les **paramètres et règles de validation**, les **codes HTTP**,
les **messages d'erreur exacts**, les **limites** (rate-limiting, quotas, TTL, timeouts, plafonds)
et les **effets de bord**.

> 📌 **Document vivant — reflet du code à la date de rédaction.** La STD documente le comportement
> **réellement codé** (et non un contrat cible). Toute évolution d'une route doit s'accompagner
> d'une mise à jour du document de domaine concerné.

## Articulation avec le reste de la documentation

| Niveau | Question | Référentiel |
|--------|----------|-------------|
| Fonctionnel (MOA) | *Quoi* + règles de gestion | [Spécifications fonctionnelles (SFD)](../specifications/README.md) |
| Architecture | *Comment ça s'assemble* | [Architecture applicative](../architecture.md) |
| **Technique (STD)** | **Contrat précis de chaque endpoint** | **Ce dossier** |

Voir aussi le [guide technique](../guide-technique.md) (déploiement, variables d'environnement).

## Structure du référentiel

| Réf. | Domaine | SFD lié |
|------|---------|---------|
| [STD-00](STD-00-conventions-transverses.md) | Conventions transverses (auth, format d'erreur, rate-limiting, mode dégradé, timeouts, CORS, en-têtes) | SFG |
| [STD-01](STD-01-assistant-mel.md) | Assistant MEL & génération de parcours | [SFD-02](../specifications/sfd/SFD-02-assistant-mel.md) |
| [STD-02](STD-02-actualites-publication.md) | Actualités, webhook Facebook & publication multi-canal | [SFD-01](../specifications/sfd/SFD-01-actualites.md) |
| [STD-03](STD-03-signalements-demandes.md) | Signalements, demandes & webhook Trello | [SFD-03](../specifications/sfd/SFD-03-signalements.md) · [SFD-12](../specifications/sfd/SFD-12-contact-demandes.md) |
| [STD-04](STD-04-contributions-citoyennes.md) | Idées, photos, sondages, réactions & RSVP | [SFD-04](../specifications/sfd/SFD-04-idees-citoyennes.md) · [SFD-05](../specifications/sfd/SFD-05-photos-communautaires.md) · [SFD-06](../specifications/sfd/SFD-06-sondages.md) · [SFD-07](../specifications/sfd/SFD-07-agenda-evenements.md) |
| [STD-05](STD-05-notifications-push.md) | Notifications push & tokens de suivi | [SFD-08](../specifications/sfd/SFD-08-notifications-push.md) |
| [STD-06](STD-06-meteo-vigilance.md) | Météo, vigilance & rappels déchets | [SFD-09](../specifications/sfd/SFD-09-meteo-vigilance.md) · [SFD-10](../specifications/sfd/SFD-10-dechets-collecte.md) |
| [STD-07](STD-07-services-pratiques.md) | Services pratiques (carburant, PLU/géo, entreprises, documents, bannière, mascotte) | [SFD-11](../specifications/sfd/SFD-11-services-pratiques.md) |
| [STD-08](STD-08-administration.md) | Administration (auth, réglages, tableau de bord, arbre MEL, purge) | [SFD-14](../specifications/sfd/SFD-14-administration-backoffice.md) |
| [STD-09](STD-09-supervision-exploitation.md) | Supervision, diagnostic, statistiques & crons | [SFD-15](../specifications/sfd/SFD-15-supervision-conformite.md) |
| [Catalogue](STD-catalogue-erreurs.md) | **Catalogue consolidé des messages d'erreur** (verbatim, par domaine) | — |

## Conventions de rédaction

Chaque document de domaine décrit ses endpoints avec le même gabarit :

1. **Tableau des routes** : méthode, chemin, authentification, rate-limit.
2. **Par endpoint** : entrée & validation, réponse en succès, **codes d'erreur** (tableau
   `code | message verbatim | condition`), limites, effets de bord.
3. **Renvois** vers la SFD et l'architecture.

### Notations

- **Auth** : `—` (public) · `x-admin-token` (back-office) · `CRON_SECRET` (tâches planifiées) ·
  `HMAC` (signature de webhook).
- Les **messages d'erreur** sont cités **tels quels** (copie exacte de la chaîne renvoyée, structure
  JSON `{ error: "…" }` comprise). `<e.message>` désigne un message d'exception interpolé.
- Les **règles techniques transverses** sont numérotées `RT-x` dans [STD-00](STD-00-conventions-transverses.md).

---

*Backend `chatbot-mairie-mezieres` (Render) — Application MAT, commune de Mézières-lez-Cléry — Licence MIT*
