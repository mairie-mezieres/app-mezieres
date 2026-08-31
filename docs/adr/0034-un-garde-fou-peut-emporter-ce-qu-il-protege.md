# ADR-0034 — Un garde-fou peut emporter ce qu'il était censé protéger

- **Statut** : accepté
- **Date** : 31 août 2026
- **Version** : v4.102
- **Concerne** : `js/mat-pwa-notif.js`, `service-worker.js`, `scripts/check-notify-relink.js`

## Contexte

Quand un habitant dépose un signalement, une demande ou un bug, l'application
génère un `notifyToken` (UUID), le range en `localStorage` sous
`mat:notify:signal:*` / `mat:notify:idea:*`, et l'écrit dans la carte Trello sous
la forme `MAT-REF: {uuid}`. C'est ce token qui permet à la mairie de lui répondre
par notification — le seul canal de retour dont il dispose, puisqu'aucune adresse
mail n'est demandée.

Les navigateurs font tourner l'endpoint push de temps à autre (quelques semaines,
parfois moins). Le backend est conçu pour encaisser cette rotation sans perdre le
lien : sur une réponse 410/404, `lib/push-notify.js` **ne supprime pas** le token,
il met seulement `entry.sub = null` — en comptant explicitement sur le frontend
pour le re-raccorder au chargement suivant. Le `CLAUDE.md` du backend le dit noir
sur blanc : « Le frontend le re-lie au prochain chargement via
`_registerPendingNotifyTokens()` ».

Ce re-raccordement n'avait jamais lieu.

## Le problème

Deux trous indépendants, avec la même conséquence.

### 1. Le garde-fou `mat_push_active` sortait avant le re-raccordement

```js
if (sub) {
  // Ne ré-inscrire aux alertes générales que si l'utilisateur a explicitement opté
  // (évite d'inscrire les abonnements "réponse uniquement" créés via les formulaires)
  if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;   // ← sortie ici
  …
  _registerPendingNotifyTokens(sub);                    // ← jamais atteint
}
```

Le commentaire dit la vérité sur l'intention : ne pas abonner aux actualités
communales quelqu'un qui n'a jamais demandé que la réponse à son signalement. Le
garde-fou est juste. Mais `mat_push_active` n'est posé que par `togglePush()` (menu
« Notifications ») et par le prompt post-installation. **Un habitant qui a activé
les notifications depuis le formulaire ne l'a jamais** — c'est la définition même
d'un abonnement « réponse uniquement ».

Le garde-fou filtrait donc exactement la population qu'il désignait, et emportait
au passage la seule opération dont elle dépendait. Placer `_registerPendingNotifyTokens`
après ce `return`, c'est ne jamais l'exécuter pour les seuls abonnements qui ont
des tokens à raccorder.

### 2. Le service worker re-synchronisait tout, sauf les tokens

Le handler `pushsubscriptionchange` rappelait `/push/subscribe`,
`/push/subscribe/dechets` et `/push/subscribe/meteo` — jamais
`/notify/register-token`. Ce n'était pas un oubli d'inattention : un service worker
**n'a pas accès au `localStorage`**, où vivent les tokens. Le mécanisme pour
franchir cette frontière existait déjà (les préférences de canal transitent par le
Cache API sous `mat-push-prefs`), mais n'avait pas été étendu aux tokens.

C'est le cas le plus fréquent, et le plus silencieux : la rotation d'endpoint
survient typiquement **sans onglet ouvert**, donc sans que le point 1 ait la moindre
occasion de s'exécuter.

### Pourquoi personne ne l'a vu

Rien ne se manifeste. L'habitant ne reçoit simplement plus de réponse — indiscernable
d'une mairie qui n'a pas encore traité son dossier. Côté mairie, le webhook Trello
journalise `{skipped: true, reason: "subscription expired"}` : un message exact, qui
décrit un abonnement expiré et *pas* une chaîne de re-raccordement rompue. Il se lit
comme un fonctionnement normal.

## Décision

1. **Le re-raccordement des tokens passe avant le garde-fou.** Seule la
   ré-inscription aux canaux généraux (actus, déchets, météo) reste derrière
   `PUSH_ACTIVE_KEY`. Les deux opérations n'ont ni le même objet ni la même
   population : les mêler dans un seul `return` était l'erreur.
2. **Le client dépose la liste des tokens dans le Cache API** sous
   `mat-notify-tokens`, et le handler `pushsubscriptionchange` la relit pour
   rappeler `/notify/register-token`. Même mécanisme que `mat-push-prefs`.
3. **Repli local dans `_registerNotifyTokensSafe`.** `_registerPendingNotifyTokens`
   vit dans `mat-actus.js`, alors que `mat-pwa-notif.js` est injecté par
   `mat-boot.js` : il ne peut pas tenir sa présence pour acquise (ADR-0032). Le
   `typeof … === 'function'` qui l'entourait sautait l'opération **en silence**.

## Ce qui n'a pas été fait

Quand `getSubscription()` ne rend **rien** et que `mat_push_active` est absent, on
ne se réabonne pas d'office, même si des tokens sont en attente. Ce cas ne se
distingue pas de celui d'un habitant qui a délibérément coupé ses notifications
(`togglePush` désabonne et retire le drapeau) : le réabonner de force ressusciterait
des notifications qu'il a refusées. Le point 2 couvre la rotation d'endpoint, qui
est le cas réel.

## Vérification

`node scripts/check-notify-relink.js`, lancé par la CI. Un test de bout en bout est
impossible : le service worker est bloqué sous Playwright (profil vierge, ADR-0006)
et `pushsubscriptionchange` est déclenché par le navigateur, des semaines après
l'abonnement — aucun test ne peut le provoquer. Le contrôle est donc statique et
verrouille trois invariants : l'ordre appel/garde-fou, la présence de
`/notify/register-token` dans le handler, et l'identité de la clé de cache des deux
côtés.

### Le contrôle a d'abord verdi à tort — deux fois

Conformément à la leçon de l'ADR-0030 (« un contrôle qui ne mesure rien ne rougit
pas, il verdit »), le script a été **saboté** avant d'être adopté. Deux des trois
sabotages sont passés au vert :

- `indexOf("_registerNotifyTokensSafe(sub)")` tombait sur la **déclaration**
  `function _registerNotifyTokensSafe(sub) {`, en haut du fichier, donc toujours
  avant le garde-fou. Le contrôle mesurait la position de la fonction, jamais celle
  de son appel. Corrigé en cherchant le point-virgule de l'appel.
- `'mat-notify-tokens-v2'.includes('mat-notify-tokens')` vaut `true` : renommer la
  clé d'un seul côté — précisément la panne redoutée — passait le contrôle. Corrigé
  en cherchant la clé **entre guillemets**.

Les quatre sabotages rougissent désormais. Un garde-fou qu'on n'a pas vu échouer
n'est pas un garde-fou.

## Conséquences

- Un habitant dont l'endpoint a tourné reçoit de nouveau les réponses de la mairie,
  y compris quand la rotation a eu lieu application fermée.
- Aucun changement backend : la chaîne Trello → webhook → `sendPushToToken` était
  correcte. Le token perdu l'était côté navigateur.
- Les habitants déjà coupés sont récupérés automatiquement au premier lancement de
  la v4.102 : leur entrée Redis a un TTL de 365 jours et a survécu avec `sub = null`.

## Références

- ADR-0006 — le service worker est bloqué sous Playwright
- ADR-0030 — un contrôle qui ne mesure rien verdit
- ADR-0032 — un script injecté ne peut pas tenir ses dépendances pour acquises
- `docs/guide-technique.md` §8 — « Notifications citoyens »
- `chatbot-mairie-mezieres/CLAUDE.md` — « Résilience endpoint »
