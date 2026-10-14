# ADR-0054 — Veille presse : un lien envoyé ne revient jamais, et c'est le code qui le garantit

- **Date** : 14 octobre 2026
- **Statut** : Accepté
- **Prolonge** : ADR-0027 (la mémoire d'une veille est écrite par du code),
  ADR-0004 (un livrable confié à un agent doit être vérifiable)

## Contexte

Le porteur veut savoir, chaque jour, qui parle de MAT — presse, sites, réseaux — dans
le **mail de stats quotidien** qu'il lit déjà, et **sans recevoir deux fois le même lien**.

Ce mail est produit par le backend (Render, `routes/admin-email.js`). Les veilles
existantes, elles, tournent en GitHub Actions avec un agent Claude Code (quota
d'abonnement, pas de coût API) et une mémoire versionnée dans `veille/`.

## Décision

1. **La recherche tourne en GitHub Actions** (`veille-presse.yml`, chaque jour à
   18 h 40 UTC, avant le mail de 22 h), comme les autres veilles. Pas d'appel API
   facturé depuis le backend, pas de nouvelle clé.
2. **L'agent propose, le code filtre.** L'agent écrit `veille/items-presse.json` ;
   `scripts/veille-presse.js` écarte ce qui est déjà dans `veille/presse-vues.json`,
   nos propres canaux et les doublons. La consigne « ne re-propose pas » donnée à
   l'agent n'est qu'une économie de temps : **la promesse tient dans le filtre**,
   verrouillé en CI par `scripts/check-veille-presse.js`.
3. **La mémoire est une liste d'URL normalisées**, pas un historique daté tronqué :
   la promesse est « jamais », pas « pas dans les 12 dernières semaines ». Elle grossit
   de quelques liens par semaine au plus.
4. **Le backend ne garde qu'une file d'attente** (`mat:veille:presse`), vidée après un
   envoi de mail **réussi**. Ce n'est pas une seconde mémoire : un item n'y entre que
   s'il a déjà passé le filtre.
5. **Ordre des écritures** : la mémoire n'est committée qu'après le `200` du backend.
   Un backend endormi ou un Redis injoignable (`503`) laisse la mémoire intacte, et les
   mêmes items repartent le lendemain — un retard, jamais une perte.

## Pourquoi pas…

- **…une recherche depuis le backend (API Anthropic + `web_search`)** : un coût facturé
  chaque jour, et une mémoire dans Redis, ni relisible ni corrigible à la main.
- **…des flux RSS (Google News) seuls** : gratuits et déterministes, mais aveugles aux
  réseaux sociaux et aux sites non indexés par Google News, et bruités (« MAT » est un
  sigle courant).
- **…une mémoire par domaine** : un même média qui publie un second article doit être
  signalé. La règle porte sur la **page**.

## Pièges

- ⛔ **Un JSON absent fait échouer le run** (rouge). Une recherche qui n'a pas abouti
  ne doit pas se lire comme « personne n'a parlé de MAT ».
- ⛔ `normaliserUrl` vit **en double** (`scripts/veille-presse.js` ici,
  `lib/veille-presse.js` au backend). Les cas de `check-veille-presse.js` et de
  `test/veille-presse.test.js` sont les mêmes : les changer des deux côtés.
- ⚠️ La clé du backend passe en **en-tête** (`X-Cron-Key`), pas en `?key=` : une URL
  finit dans les journaux. La route refuse le paramètre d'URL.
- ⚠️ Les réseaux sociaux sont mal indexés : une publication de groupe privé (ex.
  « Ici c'est Mézières ») n'est **pas** visible. La veille voit le public, pas plus.
