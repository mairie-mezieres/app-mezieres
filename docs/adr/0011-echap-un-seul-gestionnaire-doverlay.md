# ADR-0011 — Échap : un seul gestionnaire a le droit de fermer un overlay

- **Date** : 2 août 2026
- **Statut** : Accepté

## Contexte

Le guide d'arrivée (ADR-0010) est le premier écran conçu pour **ouvrir un autre overlay
par-dessus lui** de façon systématique : ses items renvoient vers le calendrier des
collectes, l'annuaire des associations, le conseil municipal… Un test e2e vérifiait donc
qu'Échap ne referme que le dernier overlay et laisse le guide dessous.

Ce test est passé en local et a **échoué en CI**, sur les deux tentatives, uniquement sur
le projet `desktop-chromium`. Après Échap, les **deux** overlays étaient fermés.

En instrumentant `closeOv` et en ralentissant le CPU d'un facteur 8 (`Emulation.setCPUThrottlingRate`),
le mécanisme est apparu immédiatement : une seule frappe produisait deux appels.

```
closeOv(dechets)  ← mat-core.js:236  (gestionnaire clavier des overlays, focus-trap)
closeOv(guide)    ← mat-core.js:572  (gestionnaire « Échap pour fermer overlays & modales »)
```

**Deux écouteurs `keydown` distincts sur `document` fermaient chacun le dernier overlay
de la pile.** Les deux se déclenchent sur une même frappe — `preventDefault()` n'empêche
pas l'autre écouteur de s'exécuter. Et comme `closeOv()` dépile `_ovStack` de façon
**synchrone** (seul le changement visuel passe par la view transition, cf. ADR-0005), le
second écouteur lisait une pile déjà dépilée et fermait l'overlay du **dessous**.

Le bug existait depuis longtemps et n'était pas propre au guide. Il touchait tous les
enchaînements d'overlays de l'app : associations → subvention, actualités → détail
d'article, agenda → fiche événement. Il est resté invisible parce que **fermer « deux
fois » une pile d'un seul overlay ne se voit pas** : le second appel ne trouve plus rien
à fermer. Il fallait une pile de deux pour l'observer, et aucun test ne construisait cette
situation.

## Décision

**Un seul gestionnaire ferme les overlays** : celui du bloc « Accessibilité clavier des
overlays », qui porte déjà le focus-trap Tab et lit `_ovStack`.

Le second gestionnaire conserve uniquement ce qui lui est propre — `mat-modal` et
`trombi-modal`, qui ne sont pas des overlays et ne passent pas par `_ovStack`. Sa branche
`_ovStack` est supprimée.

## Conséquences

**Positives :**
- Échap ferme exactement un overlay, y compris en pile — sur toute l'app, pas seulement
  dans le guide.
- Le comportement du bouton retour Android (`popstate`), qui n'avait lui qu'un seul
  gestionnaire, était déjà correct : les deux entrées se comportent enfin pareil.

**Négatives / compromis acceptés :**
- Aucun. La branche supprimée était strictement redondante.

**Points de vigilance pour les futures évolutions :**
- Ne pas rajouter d'écouteur `keydown` global qui touche `_ovStack`. Un seul point de
  vérité, celui du focus-trap.
- Ce bug est une conséquence directe du découpage de l'ADR-0005 : **l'état est synchrone,
  le visuel est asynchrone.** Tout code qui lit `_ovStack` en réaction à un événement doit
  se souvenir qu'un autre gestionnaire du même événement a pu la modifier avant lui.
- Un test qui n'exerce qu'un seul overlay ne prouve rien sur le comportement en pile.
  C'est exactement ce qui a laissé ce bug en place. Tester la pile.
