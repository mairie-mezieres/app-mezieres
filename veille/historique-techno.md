## 2026-10-05
- Chrome 154.0.8037.97/.98 en canal stable (1er oct 2026) — https://chromereleases.googleblog.com/2026/10/stable-channel-update-for-desktop.html
- Cyberattaque Atexo et Docaposte (région Hauts-de-France), données de 700 000 personnes revendiquées (3 oct 2026) — https://france3-regions.franceinfo.fr/hauts-de-france/nord-0/la-region-hauts-de-france-victime-d-une-cyberattaque-des-noms-prenoms-adresses-electroniques-et-potentiellement-des-rib-parmi-les-donnees-volees-3427614.html
- Avis CERT-FR du 2 oct 2026 dont Fortinet FortiMail CERTFR-2026-AVI-1257 — https://www.cert.ssi.gouv.fr/avis/
- [reco] Mettre à jour Chrome vers 154.0.8037.97+ sur les postes d'administration MAT
- [reco] Vérifier qu'aucun prestataire n'utilise un FortiMail vulnérable
- [reco] Recenser les données confiées aux prestataires de MAT et leur plan de crise

## 2026-09-28
- Chrome 153.0.8010.47/.48, 42 correctifs dont 3 failles critiques use-after-free (17 sept 2026) — https://cybersecuritynews.com/google-chrome-fixes-42-flaws/
- Claude Opus 5.5 en disponibilité générale, contexte 1M tokens, coût -40% vs Opus 5 (22 sept 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Numspot et Mistral AI lancent une IA managée sur cloud souverain (15 sept 2026) — https://numspot.com/2026/09/15/numspot-mistral-proposent-la-premiere-offre-ia-managee-francaise-sur-infrastructure-cloud-souveraine/
- Conférence nationale du handicap 2026 : seulement 12% des 250 démarches essentielles totalement conformes RGAA (4 sept 2026) — https://collectifhandicap54.org/2026/09/04/conference-nationale-du-handicap-2026-entre-ambitions-renouvelees-et-persistance-des-inegalites-territoriales/
- Alerte CERT-FR CERTFR-2026-ALE-011 : failles critiques Citrix NetScaler ADC/Gateway, RCE non authentifiée activement exploitée (28 sept 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-011/
- Bulletin CERT-FR CERTFR-2026-ACT-040 : Cisco ISE, Oracle WebLogic, Apple macOS activement exploitées (21 sept 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-040/
- Bulletin CERT-FR CERTFR-2026-ACT-041 : Check Point Security Management, F5 BIG-IP, WordPress activement exploitées (28 sept 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-041/
- Cyberattaque mairie de Mortagne-au-Perche (Orne), rançongiciel, serveur principal et serveur de sauvegarde chiffrés (18 sept 2026) — https://frenchbreaches.com/alertes/mairie-de-mortagne-au-perche-muhiffjbw9vo6wzaqt
- [reco] Mettre à jour Chrome vers 153.0.8010.47+ sur les postes d'administration MAT et vérifier la PWA
- [reco] Revérifier que la sauvegarde du backend/Redis de MAT est isolée du réseau de production (cas Mortagne-au-Perche)
- [reco] Évaluer Claude Opus 5.5 comme piste d'évolution du fallback IA du chatbot
- [reco] Vérifier qu'aucun prestataire de la mairie n'utilise un boîtier Citrix NetScaler vulnérable (CERTFR-ALE-011)
- [reco] Se renseigner sur l'offre IA managée souveraine Numspot × Mistral

## 2026-09-21
- GitHub Actions : runner Ubuntu 26.04 en disponibilité générale, bascule ubuntu-latest 19 oct-19 nov 2026 (17 sept 2026) — https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration/
- Render.com : services Workflows décrits dans les Blueprints (16 sept 2026) — https://render.com/changelog
- API Anthropic Messages : bêta de compaction de conversation à la demande, compact-2026-09-04 (14-15 sept 2026) — https://platform.claude.com/docs/en/build-with-claude/compaction
- Mistral OCR 4.1 en disponibilité générale (31 août 2026) — https://docs.mistral.ai/models/ocr-4-1
- iOS/iPadOS 26.7, plus de 80 correctifs de sécurité (14 sept 2026) — https://www.macrumors.com/2026/09/14/apple-releases-ios-26-7/
- Décret n° 2026-816 du 24 août 2026 modifiant le décret n° 2019-768 (accessibilité numérique, cité par la mention d'accessibilité de MAT) (JO 26 août 2026) — https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054746617
- Bulletin CERT-FR CERTFR-2026-ACT-039 : Siemens, SAP, Ivanti, Xen, Citrix Workspace, Cisco, Chrome, Adobe, Postfix (14 sept 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-039/
- Cyberattaque mairie d'Espelette (64), hameçonnage par facture PDF piégée, messagerie compromise (11 sept 2026) — https://www.cyberattaque.org/cyberattaque-a-la-mairie-despelette-un-faux-pdf-infecte-la-messagerie/
- [reco] Recouper la mention/déclaration d'accessibilité de MAT avec le décret n° 2026-816
- [reco] Relayer le cas d'Espelette (hameçonnage facture PDF) auprès de la mairie
- [reco] Tester la PWA MAT sur iOS/iPadOS 26.7
- [reco] Anticiper la bascule ubuntu-latest vers Ubuntu 26.04 sur les workflows GitHub Actions
- [reco] Suivre la bêta de compaction de conversation de l'API Messages Anthropic pour le fallback Claude

## 2026-09-14
- Chrome 153.0.8010.36/.37, 7e zero-day V8 actif de 2026, CVE-2026-87491, 230 correctifs (8 sept 2026) — https://thehackernews.com/2026/09/chrome-v8-zero-day-exploited-in-wild.html
- Mistral AI : levée de 3 Md€ en série D, valorisation >21 Md€, menée par Samsung (8 sept 2026) — https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/
- Consultation citoyenne « Vieillir en France, aujourd'hui et demain » (lancée 25 août, jusqu'au 20 sept 2026) — https://www.pour-les-personnes-agees.gouv.fr/actualites/participez-a-la-consultation-citoyenne-vieillir-en-france-aujourd-hui-et-demain
- Alerte CERT-FR CERTFR-2026-ALE-010 : faille critique Metabase, injection SQL non authentifiée CVE-2026-72898 (10 sept 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-010/
- Bulletin CERT-FR CERTFR-2026-ACT-038 : JFrog Artifactory, Firefox/Thunderbird, HPE Aruba, Cisco NX-OS/IOS XR (7 sept 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-038/
- Cyberattaque mairie du Tampon (La Réunion), services perturbés (9 sept 2026) — https://www.cyberattaque.org/le-tampon-une-cyberattaque-frappe-la-mairie-et-perturbe-fortement-les-services-municipaux/
- Commune de Joigny (Yonne) : 268 795 tentatives d'intrusion bloquées en une semaine, sans incident (9 sept 2026) — https://actu.orange.fr/societe/fait-divers/yonne-cette-commune-a-subi-269-000-cyberattaques-en-une-semaine-magic-CNT000002rQMbg.html
- [reco] Mettre à jour Chrome vers 153.0.8010.36+ sur les postes d'administration MAT (CVE-2026-87491)
- [reco] Vérifier/patcher tout outil Metabase utilisé par la mairie ou un prestataire (CERT-FR ALE-010)
- [reco] Relire les mesures de défense du backend MAT à la lumière du cas de Joigny
- [reco] Relayer la consultation citoyenne « Vieillir en France » auprès des séniors avant le 20 septembre
- [reco] Suivre l'impact de la levée de fonds Mistral sur les tarifs/capacités de l'API du chatbot MAT

## 2026-09-07
- Chrome 152.0.7977.82/.83, zero-day V8 activement exploité CVE-2026-85046, ajouté au KEV CISA (3-4 sept 2026) — https://thehackernews.com/2026/09/google-releases-chrome-update-to-patch.html
- GitHub Actions : permission vulnerability-alerts, API de dépréciation des runners (3 sept 2026) — https://github.blog/changelog/2026-09-03-github-actions-early-september-2026-updates/
- Playwright 1.63.0 : verrous nommés, reporter perfetto, --add-reporter (4 sept 2026) — https://github.com/microsoft/playwright/releases/tag/v1.63.0
- Anthropic : lancement Claude Fable 5.1 (GA) et Claude Mythos 5.1 (accès restreint), -75% coût lecture cache (1er sept 2026) — https://www.anthropic.com/claude-fable-and-mythos-5-1
- Render.com : télémétrie CLI activée par défaut (v2.26.0+), nouveau plan de calcul flex pour Workflows (1er sept 2026) — https://render.com/changelog
- Gazette des communes : Forum du numérique consacré à l'IA en collectivités, 17 sept 2026 à Paris — https://evenements.infopro-digital.com/gazette-des-communes/numerique-et-smart-city-T2723
- Cyberattaque Association des Maires de France (AMF) : injection SQL, 114 000 entrées dont mots de passe en clair (4 sept 2026) — https://www.cyberattaque.org/association-des-maires-de-france-114-000-lignes-en-fuite-apres-une-cyberattaque/
- Cyberattaque Ville de Libercourt, 817 Go revendiqués par le groupe Kairos (2 sept 2026) — https://www.cyberattaque.org/ville-de-libercourt-817-go-de-donnees-revendiquesapres-une-cyberattaque/
- Alerte CERT-FR CERTFR-2026-ALE-009 : failles critiques SonicWall SMA1000, SSRF non authentifiée + RCE (2 sept 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-009/
- Bulletin CERT-FR CERTFR-2026-ACT-037 : Papercut, Metabase, Keycloak, Cisco IOS XE (31 août 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-037/
- [reco] Vérifier que les postes d'administration MAT tournent sur Chrome 152.0.7977.82/.83 (CVE-2026-85046)
- [reco] Vérifier/patcher tout boîtier SonicWall SMA1000 utilisé par un prestataire de la mairie (CERT-FR ALE-009)
- [reco] Auditer le stockage des mots de passe côté backend/Redis de MAT suite à la fuite AMF
- [reco] Mettre à jour Playwright vers 1.63.0
- [reco] Vérifier le comportement de télémétrie du CLI Render (activée par défaut depuis v2.26.0)

## 2026-08-31
- Chrome 152 (152.0.7977.64/.65), 327 correctifs dont CVE-2026-79282 (évasion bac à sable ANGLE, critique) (26 août 2026) — https://www.malwarebytes.com/blog/bugs/2026/08/update-chrome-before-you-browse-again
- Sentry SDK JS v11 : dataCollection remplace sendDefaultPii, collecte davantage par défaut (~28 août 2026) — https://blog.sentry.io/datacollection-control-panel/
- Anthropic : prix Claude Sonnet 5 maintenu à 2$/10$ par MTok, hausse au 1er sept annulée (10 août 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Anthropic : SDK Python v1.0, ruptures de compatibilité (httpx→httpx2, retrait Text Completions) (20 août 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Mistral AI : lancement d'Agentic Search, recherche documentaire agentique (20 août 2026) — https://mistral.ai/news/agentic-search/
- Mistral/AI Act : entrée en application de l'article 50 (transparence), résidence des données critère d'achat public (2 août 2026) — https://www.digitalapplied.com/blog/mistral-sovereign-ai-eu-compliance-stack-2026
- Render.com : nouveaux plans de calcul, IDs reformatés en specs (26 août 2026) — https://render.com/changelog
- Render.com : incident de déploiement ~1h06 (20 août 2026) — https://status.render.com/
- iOS/iPadOS 26.6.1, correctifs de sécurité portés depuis les bêtas iOS/iPadOS 27 (17 août 2026) — https://www.macrumors.com/2026/08/10/apple-releases-ios-26-6-1/
- Bulletin CERT-FR CERTFR-2026-ACT-036 : faille GitLab exploitée CVE-2026-19478, failles critiques SPIP (24 août 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-036/
- Cyberattaque à Gagny (Seine-Saint-Denis), accès non autorisé à des données personnelles d'habitants (10 août 2026) — https://www.cyberattaque.org/cyberattaque-a-gagny-la-ville-confirme-un-acces-non-autorise-a-des-donnees-personnelles/
- [reco] Tester la PWA MAT sur Chrome 152
- [reco] Anticiper le changement de comportement par défaut du SDK Sentry v11 (dataCollection) avant mise à jour
- [reco] Tester la PWA MAT sur iOS/iPadOS 26.6.1
- [reco] Sensibiliser les agents municipaux à la vigilance données personnelles suite au cas Gagny
- [reco] Suivre l'entrée en application de l'article 50 de l'AI Act européen pour l'usage de Mistral AI

## 2026-08-24
- Attaque supply-chain npm keyv/cacheable/flat-cache/file-entry-cache, ver auto-propagé (4 août 2026, relayé CERT-FR ACT-034 le 10 août, MàJ 17 août) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-034/
- Chrome 151 : correctifs critiques d'évasion de bac à sable (18-20 août 2026) — https://www.techtimes.com/articles/324984/20260819/chrome-update-patches-two-sandbox-escape-flaws-codex-security-gets-first-browser-credit.htm
- Playwright 1.62.1, correctif de régressions (30 juillet 2026) — https://github.com/microsoft/playwright/releases/tag/v1.62.1
- Sentry Logs, mise à jour été 2026 (11 août 2026) — https://blog.sentry.io/sentry-logs-summer-2026-roundup/
- Anthropic : retrait de Claude Opus 4.1 (5 août 2026) — https://platform.claude.com/docs/en/about-claude/model-deprecations
- Anthropic : fermeture du Claude API Workbench historique (17 août 2026) — https://www.techtimes.com/articles/324669/20260817/anthropic-kills-claude-workbench-today-saved-prompts-gone-api-pipelines-broken.htm
- Mistral AI : lancement de Shieldstral, modèle de modération open-weight (5 août 2026) — https://siliconangle.com/2026/08/05/mistral-introduces-shieldstral-provide-lightweight-policy-aware-moderation-ai-models/
- Render.com : builds accélérés de ~40 % (changement du 7 août, annoncé le 21 août 2026) — https://render.com/changelog
- Incident de service GitHub.com, Actions/API dégradés 7h47 (17 août 2026) — https://www.githubstatus.com/
- Cyberattaque revendiquée contre la mairie de Rinxent par le groupe Krybit, non confirmée officiellement (2 août 2026) — https://www.cyberattaque.org/mairie-de-rinxent-160-go-de-donnees-revendiques-apres-une-cyberattaque/
- Bulletins CERT-FR CERTFR-2026-ACT-032 à 035 (27 juillet au 17 août 2026) — https://www.cert.ssi.gouv.fr/actualite/
- [reco] Auditer les dépendances npm keyv/cacheable/flat-cache/file-entry-cache du backend et faire tourner les secrets si présentes
- [reco] Tester la PWA MAT sur Chrome 151
- [reco] Mettre à jour Playwright vers 1.62.1
- [reco] Vérifier l'absence de Claude Opus 4.1 dans le code du fallback IA
- [reco] Renforcer la sensibilisation hameçonnage/sauvegardes suite à la revendication Rinxent

## 2026-07-27
- Node.js security release 27 juillet 2026, sévérité HIGH (22.x/24.x/26.x) — https://nodejs.org/en/blog/vulnerability/july-2026-security-releases
- Chrome correctif d'urgence 150.0.7871.181/182, 12 failles haute sévérité (22 juillet 2026) — https://www.malwarebytes.com/blog/bugs/2026/07/chrome-needs-another-whopper-update-to-fix-382-security-fixes
- iOS 26.6 sorti (27 juillet 2026) — https://www.iphon.fr/post/quand-sort-ios-26-6-quelles-nouveautes
- Anthropic Claude Opus 5 lancé, betas mid-conversation tool changes et fallback default (24 juillet 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Render.com : OIDC Anthropic/OpenAI (24 juillet), MCP OAuth (22 juillet), Bun 1.3.14 par défaut (16 juillet 2026) — https://render.com/changelog
- Sentry : Seer GA + support GitLab (21 juillet 2026), Sentry JS 10.66.0 streaming gen_ai spans (16 juillet 2026) — https://sentry.io/changelog/seer-supports-gitlab/
- Campagne d'attaque cPanel/WHM via dépôts GitHub compromis (12-13 juillet 2026) — https://thehackernews.com/2026/07/attackers-weaponize-github-actions.html
- Relance de l'application citoyenne Agora, dispositif « Questions au Gouvernement » (publié 2 juillet 2026) — https://acteurspublics.fr/articles/pour-relancer-la-participation-citoyenne-le-gouvernement-ressort-agora-des-cartons/
- Ransomware sur la mairie de Drancy, attaque constatée le 3 juillet 2026 — https://www.lejournaltoulousain.fr/ile-de-france/seine-saint-denis/cyberattaque-drancy-services-municipaux-perturbes-fuites-donnees-probables-392892/
- Alerte CERT-FR CERTFR-2026-ALE-008 : failles critiques SharePoint activement exploitées (22 juillet 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-008/
- Alerte CERT-FR CERTFR-2026-ALE-007 : failles critiques WordPress, exploitation massive anticipée (20 juillet 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-007/
- Bulletin CERT-FR CERTFR-2026-ACT-031 (20 juillet 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-031/
- [reco] Vérifier immédiatement l'absence de SharePoint et WordPress vulnérables (CERT-FR ALE-007/008)
- [reco] Mettre à jour Node.js vers les versions patchées de la publication du 27 juillet 2026
- [reco] Tester la PWA MAT sur iOS 26.6 et avec le dernier Chrome 150 corrigé
- [reco] S'inspirer du dispositif « Questions au Gouvernement » d'Agora pour le module Idées de MAT
- [reco] Vérifier la procédure de sauvegarde/restauration du backend et Redis à la lumière du cas Drancy

## 2026-07-20
- actions/checkout v7 blocage pwn-request désormais actif au 20 juillet 2026 (échéance repoussée du 16 au 20 juillet) — https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/
- Render.com : outil MCP trigger_deploy (17 juillet 2026) — https://render.com/changelog
- Render.com : OIDC AWS en disponibilité générale pour workspaces Pro+ (15 juillet 2026) — https://render.com/changelog
- Anthropic : Admin API bêta gestion des membres Claude Enterprise (14 juillet 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Anthropic : mode fast Claude Opus 4.7 déprécié, suppression le 24 juillet 2026 (annoncé 25 juin 2026) — https://platform.claude.com/docs/en/release-notes/overview
- Mistral AI : nouveau modèle open-weight en accès anticipé (~6 juillet 2026) — https://www.techtimes.com/articles/319798/20260706/mistral-ai-targets-frontier-gap-open-weight-model-entering-july-early-access.htm
- Chrome 150 (stable 30 juin 2026) : 382 correctifs de sécurité dont 15 critiques — https://www.malwarebytes.com/blog/bugs/2026/07/chrome-needs-another-whopper-update-to-fix-382-security-fixes
- Article Colysée Média : préparer son site communal au RGAA (10 juillet 2026) — https://www.colysee.net/2026/07/10/votre-site-internet-communal-est-il-pret-pour-les-nouvelles-exigences-daccessibilite/
- Alerte CERT-FR CERTFR-2026-ALE-006 : failles critiques SonicWall SMA1000 activement exploitées (15 juillet 2026) — https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-006/
- Bulletin CERT-FR CERTFR-2026-ACT-030 (13 juillet 2026) — https://www.cert.ssi.gouv.fr/actualite/CERTFR-2026-ACT-030
- [reco] Vérifier compatibilité workflows GitHub Actions avec blocage pwn-request désormais actif
- [reco] Vérifier/patcher tout boîtier SonicWall SMA1000 utilisé par un prestataire de la mairie
- [reco] Migrer du mode fast Opus 4.7 vers Opus 4.8 avant le 24 juillet 2026
- [reco] Lire l'article Colysée Média sur la préparation RGAA du site communal
- [reco] Suivre l'annonce du nouveau modèle open-weight Mistral pour option IA souveraine future

## 2026-07-13
- Node.js security release 18 juin 2026 (12 CVE, 2 haute sévérité) — https://nodejs.org/en/blog/vulnerability/june-2026-security-releases
- npm v12 bloque les scripts d'installation par défaut (8 juillet 2026) — https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html
- [reco] Mettre à jour Node.js vers versions patchées (22.23.0/24.17.0/26.3.1)
- [reco] Vérifier compatibilité npm v12 (scripts d'installation bloqués)
- [reco] Passer actions/checkout à v7
