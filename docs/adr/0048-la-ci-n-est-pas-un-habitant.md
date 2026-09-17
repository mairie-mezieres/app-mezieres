# ADR-0048 — La CI n'est pas un habitant

- **Statut** : accepté
- **Date** : 17 septembre 2026
- **Version** : aucune — rien de ce qui est servi à l'habitant ne change (tests,
  contrôle de CI, backend, documentation). Pas de bump de cache ni de numéro
  affiché : le numéro de version est le seul signal dont dispose un habitant,
  il ne bouge que quand son app bouge.
- **Concerne** : `tests/e2e/helpers/reseau.js` (nouveau),
  `scripts/check-e2e-reseau.js` (nouveau), six specs E2E,
  `chatbot-mairie-mezieres/lib/stats.js` (`isSyntheticTraffic`),
  `routes/stats-public.js`

## Contexte

Le 17 septembre 2026, le porteur du projet ouvre le mail de statistiques et
s'arrête sur une ligne :

> « Ça m'étonnerait, le nombre de visiteurs. Est-ce que c'est toi qui a
> provoqué ça ? »

Le tableau de bord annonçait jusqu'à **~550 visiteurs uniques dans la journée**
du 16 septembre, sur une ligne de base de 40 à 90, et « Carburant » en tête des
services à **234 ouvertures** — loin devant « Jeu du moment » à 39.

La réponse était oui.

## Le mécanisme

`smoke.spec.js` coupe les appels sortants des tests avec une liste
`EXTERNAL_HOSTS` qui commence par `'onrender.com'`, sous un commentaire sans
ambiguïté : « aucun appel vers la production pendant la CI ».

Cette liste était **recopiée dans quinze specs**. Deux copies avaient perdu
exactement une ligne — la première, `'onrender.com'` — et deux autres specs
n'avaient aucune coupure. Au total **six specs**, soit 34 tests par exécution,
chargeaient `index.html` en laissant passer les appels vers le backend de
production.

L'app y poste `trackAppOpenOncePerDay()` → `/stats/track`. Le comptage des
visiteurs uniques repose sur un `deviceId` tiré de `localStorage` — et
**Playwright part d'un profil vierge à chaque test**. Chaque test s'enregistrait
donc comme un habitant de plus.

Le 16 septembre, **19 exécutions** de la CI (chaque `push` **et** chaque
`pull_request` lance la suite complète) : 19 × 34 ≈ 650 inscriptions, ~550 après
les runs annulés. L'ordre de grandeur colle.

## Ce qui l'a rendu invisible dix-sept jours

⛔ **Les tests étaient verts, parce qu'ils ne mesuraient pas ça.** Le défaut ne
porte pas sur ce que l'app fait : il porte sur ce que **les tests eux-mêmes**
font. Aucun test ne peut l'attraper de l'intérieur.

⛔ **Le chiffre faux était plausible.** Une commune dont l'app décolle, c'est
exactement ce qu'on espère voir. Un chiffre absurde aurait alerté ; un chiffre
flatteur, non. `ETAT_DES_LIEUX.md` sert à monter des dossiers de subvention —
ces visiteurs auraient pu y être cités.

⚠️ **La date le dit.** La ligne de base tient à 40-90/jour jusqu'au 30 août,
puis saute à ~180 le **31 août** : jour exact de la création de
`carburant-fraicheur.spec.js` (commit `12c0cd0`, v4.101). L'omission y était
dès le premier commit.

⚠️ **Un commentaire affirmait la protection qui manquait.**
`prochaine-manifestation.spec.js` écrivait : « `/calendar-proxy` vit sur
onrender.com, que la règle suivante coupe ». La règle suivante ne coupait pas
onrender.com. Une relecture attentive y aurait lu une garantie.

## Décision

1. **Une source unique** : `tests/e2e/helpers/reseau.js` porte la liste et
   `couperReseauExterne(page, avant)`. La liste recopiée est le défaut ; quinze
   copies, c'est quinze occasions d'en perdre une ligne.
   ⚠️ Le crochet `avant` existe parce que **le dernier `page.route` inscrit
   gagne** : une simulation posée après la coupure l'annulerait. Le passer en
   argument évite d'avoir à s'en souvenir.
2. **Un contrôle statique**, `scripts/check-e2e-reseau.js`, lancé par la CI :
   toute spec qui appelle `page.goto` doit couper la production. Il vérifie le
   **comportement**, pas le mécanisme — une spec gardant sa propre liste passe,
   tant que `onrender.com` y est. Exiger le module partagé ferait rougir onze
   specs correctes, et un contrôle qui rougit à tort finit désactivé.
3. **Une seconde ceinture côté backend** : `isSyntheticTraffic(req)`
   (`lib/stats.js`) écarte le trafic de test avant toute écriture. Elle protège
   d'une spec future qui oublierait tout, et d'un robot quelconque.
   ⛔ **Le critère est l'ORIGINE, pas le `User-Agent`.** Playwright utilise les
   descripteurs `devices['Desktop Chrome']` et `devices['Pixel 7']`, qui posent
   un UA de vrai navigateur : « HeadlessChrome » n'y apparaît pas. Ce qui ne
   ment pas, c'est que les tests servent l'app depuis `127.0.0.1:4173`.
   ⚠️ La route répond **200** : un test n'a pas à rougir pour ça, et un 4xx
   ferait diagnostiquer une panne là où il n'y en a pas. Simplement, rien n'est
   écrit.

## Trois pièges rencontrés en écrivant le contrôle

Ils méritent d'être notés : chacun aurait produit un garde-fou décoratif.

- ⛔ **Une mention en commentaire n'est pas une coupure.** La première version du
  script validait une spec délibérément sabotée — un commentaire y racontait
  l'incident en citant `onrender.com`, et `includes()` s'en contentait. Le
  contrôle serait **né vert** (ADR-0030, encore).
- ⛔ **`page.route('**/*', …)` porte les deux délimiteurs d'un commentaire de
  bloc, dans l'ordre.** Un stripper par regex y voyait un bloc ouvert et avalait
  la moitié du fichier, faisant rougir `documents-officiels.spec.js`, qui coupe
  pourtant parfaitement. (Le piège mord aussi qui l'explique : la première
  rédaction de ce commentaire, dans le script, refermait le bloc qu'elle
  décrivait.)
- ⛔ **Le détecteur s'auto-contrôle.** `check-e2e-reseau.js` commence par
  vérifier que sa propre fonction sait dire *non* sur les trois cas qui l'ont
  réellement mis en défaut. Sans quoi il signerait un blanc-seing au dossier
  entier le jour où une refonte casse sa détection.

Et le contrôle a payé immédiatement : lancé pour la première fois, il a trouvé
une **sixième** spec fuyante (`prochaine-manifestation.spec.js`) que la
recherche à la main avait manquée.

## Conséquences

- **L'historique du 31 août au 17 septembre 2026 est pollué** et ne peut pas
  être nettoyé : rien ne distingue après coup un test d'un habitant, et purger
  ces jours effacerait aussi les vrais visiteurs. Les chiffres de cette période
  ne doivent pas être cités hors du projet — dossier de subvention, label,
  presse. Les jours les plus touchés sont ceux à forte activité de dépôt.
- Le comptage **par service** est atteint de la même façon : « Carburant » à 234
  est très majoritairement de la CI.
- ⚠️ Ce qui n'est **pas** atteint : les signalements, idées, sondages et
  demandes, qui passent par des routes que les tests ne sollicitent pas.

## Ce qu'on n'a pas fait

- **Purger les compteurs des jours touchés** : irréversible, et impossible de
  séparer les tests des habitants a posteriori. On préfère un historique
  documenté comme douteux à un historique amputé en silence.
- **Bloquer le réseau au niveau de la configuration Playwright** (un
  `page.route` global dans un `fixture`) : ce serait plus étanche, mais
  invisible depuis la spec — et une spec qui a besoin d'un appel simulé n'aurait
  plus de point d'accroche lisible. Le contrôle statique donne la même garantie
  en restant explicite là où on la lit.
- **Rejeter le trafic synthétique par un 4xx** : voir décision 3.
