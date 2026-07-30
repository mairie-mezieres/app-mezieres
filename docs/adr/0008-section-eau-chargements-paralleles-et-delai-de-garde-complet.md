# ADR-0008 — Section Eau : chargements parallèles et délai de garde couvrant la lecture du corps

- **Date** : 30 juillet 2026
- **Statut** : Accepté

## Contexte

Le 30/07/2026, un habitant signale que la section **💧 Eau** de l'overlay météo
reste indéfiniment sur **« ⚪ Vérification… »** en face de « Restrictions », la
ligne « Nappe » affichant « — » au même moment.

Deux défauts de `js/mat-eau8.js` se combinaient :

1. **Le délai de garde ne couvrait pas la lecture du corps de la réponse.**
   `_eauFetch` armait un `AbortController` à 9 s… puis faisait `clearTimeout()`
   **dès l'arrivée des en-têtes**. Les appelants lisaient ensuite le corps
   (`r.json()` / `r.text()`) **hors de toute garde** : sur un réseau mobile lent,
   une réponse dont le corps n'arrive jamais laissait le `await` en suspens pour
   toujours.
2. **Nappe et restrictions étaient chargées en série.** `_loadEauSection` faisait
   `await _fetchNappe()` *avant* d'attaquer VigiEau. La requête hubeau ramène
   **365 mesures** ; tant qu'elle n'avait pas rendu la main, la requête VigiEau
   n'était **même pas lancée** — d'où les deux lignes bloquées ensemble, sur leur
   valeur initiale, sans le moindre message d'erreur.

L'affichage neutre par défaut (« Vérification… », jamais un faux « Aucune
restriction ») est volontaire ; le bug est qu'on n'en sortait jamais.

## Décision

1. `_eauFetch` **lit le corps lui-même** et renvoie `{status, ok, text}` ou `null`.
   Le minuteur d'abandon n'est désarmé qu'une fois le corps lu : les 9 s couvrent
   désormais **tout** l'échange. Les appelants parsent le JSON eux-mêmes.
2. Les deux chargements deviennent deux fonctions indépendantes lancées **en
   parallèle** (`Promise.all([_loadNappe(), _loadRestrictions()])`), chacune
   rafraîchissant l'affichage quand elle aboutit. Une API lente ou en panne ne
   peut plus en masquer une autre.
3. **Repli sur le backend** : si les deux requêtes à `api.vigieau.gouv.fr`
   échouent depuis le téléphone (réseau mobile, filtrage), on demande son niveau
   au backend (`GET /eau/restrictions`), qui interroge VigiEau depuis Render avec
   la même logique (ADR-0009 du backend). Un niveau `0` venant du serveur n'est
   retenu que si son relevé est **complet** (`complete: true`) — jamais de faux
   vert. Sans réponse exploitable, la ligne affiche « ⚪ Info indisponible ».

## Alternatives écartées

- **Réduire `size=365` sur hubeau** : allègerait la requête nappe mais ne
  corrigerait ni le blocage sans fin, ni le couplage entre les deux lignes. Le
  calcul du pourcentage de remplissage a besoin de l'historique sur un an.
- **Passer entièrement par le backend pour les restrictions** : ajouterait une
  dépendance à la disponibilité de Render (instance gratuite qui s'endort) pour
  une donnée que l'API publique sert très bien. Le backend reste un **repli**.

## Conséquences

**Positives :**
- La ligne « Restrictions » aboutit toujours à un état explicite en moins de 10 s :
  niveau, « Aucune restriction », ou « Info indisponible » (avec log `matLogError`).
- La nappe et les restrictions s'affichent dès que leur propre API répond.
- L'app reste informée du niveau même quand VigiEau est injoignable depuis le
  téléphone.

**Négatives / compromis acceptés :**
- Une requête supplémentaire vers le backend dans le seul cas où les deux appels
  directs ont échoué.

**Points de vigilance :**
- La logique de niveau (« le plus grave des deux requêtes », ADR-0009 du backend)
  est inchangée et reste **dupliquée** frontend/backend : toute évolution doit
  être répercutée des deux côtés.
