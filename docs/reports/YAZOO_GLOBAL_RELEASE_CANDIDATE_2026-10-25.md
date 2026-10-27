# YaZoo Global 2026 — release candidate du 25 octobre

Mission commencée le 25 octobre ; reprise et validations fraîches le **26 octobre 2026** après une longue interruption de l’environnement. Le nom de fichier demandé est conservé.

## État initial et protection des travaux

- Branche initiale : `main`, HEAD officiel `f48e398363a50c24e804b4b2c8920cbaed15b6d6`, confirmé via GitHub.
- Les modifications Global Startup du 25 octobre étaient locales : 18 fichiers suivis modifiés et neuf nouveaux fichiers attribuables à cette mission précédente. Aucun de ces travaux n’a été perdu.
- Les autres fichiers non suivis, dont `docs/CANDIDATURES_2026/`, les rapports historiques et les XML de résultats backend, sont exclus du commit candidat. Un inventaire SHA-256 de **137 fichiers étrangers au périmètre** permet de vérifier leur préservation avant publication.
- Rapports Global Startup, matrice SEO, textes Idea’Wave, scénarios de commissions, architecture canonique et release précédente lus. L’architecture Laravel / React-Vite / Expo reste inchangée.
- Aucun déploiement, migration, suppression de données, activation de paiement, changement DNS, modification de compte administrateur, publication Play ou soumission Idea’Wave.

## Corrections de stabilisation

1. **Langues et sessions.** Le choix de la langue déjà présente dans `/fr`, `/en` ou `/ar` ne recharge plus le document. Cela évite une boucle possible quand la restauration de session réapplique la préférence de langue. Le retour navigateur synchronise la langue d’une URL localisée ; un changement explicite conserve query string et fragment.
2. **En-têtes des Functions.** Les réponses du proxy API/médias et les réponses JSON d’erreur ou de disponibilité imposent `X-Robots-Tag: noindex, nofollow` dans leur code. Cette protection ne dépend pas de `_headers`. Statuts, cookies, flux et requêtes Range restent couverts par les tests existants.
3. **Métadonnées source.** Trois titres du template HTML contenaient des `?` à la place des accents. Ils sont corrigés. Le libellé anglais du bouton arabe, écrasé par un assemblage de dictionnaires, est explicitement « Arabic ».
4. **Preuve de build.** `dist/release.json` expose uniquement le commit et l’état des modifications suivies des applications. Si Git est absent d’une archive ou d’un contexte Docker, la provenance inconnue reste `null` ; un `GITHUB_SHA` valide peut identifier le build. Aucune valeur d’environnement privée n’est publiée. Le build local avant commit ne vaut pas une preuve de release propre.
5. **Contrôles HTTP reproductibles.** `verify-served-seo.mjs` contrôle les réponses du serveur, le contenu sans JS, le montage React après un effet de composant, l’unicité du H1/canonical, OG, JSON-LD, images, sitemap, robots et en-têtes de routes privées et Functions.
6. **Navigation.** Nouveaux E2E d’inscription → Feed, inscription avec liens profonds Messages et Rendez-vous, langue et retour, restauration de session localisée. Les parcours professionnels et `returnTo` sont conservés.
7. **Pitch exact.** Source éditable historique de 20 pages retrouvée ; liste des corrections par page rédigée dans `docs/IDEAWAVE_PITCH_CORRECTIONS_2026-10-25.md`. Sources historiques et PDF/PPTX préservés.
8. **Correctif sécurité d’image révélé par la CI.** Le premier scan distant a bloqué sur deux HIGH `CVE-2026-92392` concernant `curl` et `libcurl` 8.21.0-r0. Le correctif impose au moins 8.23.0-r0 dans les deux images PHP ; dans Nginx, il met à jour ces paquets lorsqu’ils sont installés. La disponibilité de la version corrigée a été vérifiée avec la base PHP épinglée dans un conteneur jetable, sans volume et sans base de données. Aucun filtre, ignore ou seuil Trivy n’a été affaibli. Le nouveau commit doit repasser la CI et ses scans avant toute décision READY.

## Validation locale et tentatives

Les lignes de clôture donnent les résultats finaux. Les anciennes valeurs 243 tests / 81 tests / 54 E2E restent des preuves historiques, pas les résultats de cette stabilisation.

| Contrôle | Portée | État de préparation |
| --- | --- | --- |
| Frontend lint / TypeScript | Source finale | PASS local et CI |
| Unitaires | 245 cas, assertions conservées | PASS local avec deux workers et CI |
| i18n | FR/EN/AR, 2 073 clés | PASS |
| Build et SEO fichiers | Origine HTTPS de démonstration | PASS avant commit ; rebuild propre prévu après commit |
| E2E complet | 336 cas découverts, suites conditionnelles signalées séparément | CI : 267 PASS / 69 SKIP, puis 54 PASS et 15 PASS dans les étapes isolées |
| E2E consolidé final | Source finale, faible concurrence, sans agrégation d’anciens résultats | Local : 60 PASS, puis reprise distincte de 4 cas PASS |
| Mobile | Lint, TypeScript, 81 tests | PASS ; aucun nouveau build natif lancé |
| Backend | Aucun code Laravel modifié ; images corrigées | CI : 525 tests / 4 282 assertions PASS ; images et démarrage testés |

Tentatives conservées : un test i18n dépendait implicitement d’un libellé anglais incorrect ; son scénario français fixe désormais explicitement sa langue. Trois unitaires ont dépassé les 20 secondes pendant l’exécution simultanée de Vitest et Playwright. Le scénario de onze captures de marque a dépassé ses 30 secondes en forte concurrence. Aucun timeout ni assertion n’a été augmenté ou désactivé pour obtenir un résultat positif. Les relances limitent les workers et séparent les charges lourdes.

Les suites full-stack conditionnelles exigent SQLite/S3Mock jetables ; elles ne deviennent pas PASS lorsqu’elles sont ignorées. La CI existante les lance dans ses étapes dédiées. Aucun test local simulé n’est une preuve sur téléphone ou sur la base hébergée.

## SEO, HTTP et pré-rendu

Contrôles réalisés avec **Wrangler 4.151.0 / workerd local**, sur le vrai dossier `dist/` et les Functions existantes. Un upstream HTTP fictif sans base répond sur loopback. Les réponses Functions et les règles `_headers` sont donc réellement exécutées, et pas seulement lues dans un fichier. Ce n’est pas un déploiement Cloudflare.

| URL candidate | HTTP | Sans JavaScript | Après JavaScript | Indexation attendue |
| --- | --- | --- | --- | --- |
| `/` | 200 | Landing FR visible | Un seul H1 et root ; canonical `/fr` avec locale FR | Oui, doublon canonisé |
| `/fr` | 200 | Landing FR visible | Langue FR et canonical `/fr` | Oui |
| `/en` | 200 | Landing EN visible | Langue EN et canonical `/en` | Oui |
| `/ar` | 200 | Landing AR RTL visible | Langue AR et canonical `/ar` | Oui |
| `/about` | 200 | Contenu principal FR visible | Même titre principal, aucun doublon | Oui |
| `/pros` | 200 | Contenu principal FR visible | Même titre principal, aucun doublon | Oui |
| `/partner` | 200 | Contenu principal FR visible | Même titre principal, aucun doublon | Oui |
| `/discover/services` | 200 | Shell SPA et métadonnées ; pas de catalogue sans JS | Catalogue interactif, sans duplication | Non : meta + header |
| `/discover/veterinarians` | 200 | Shell SPA et métadonnées ; pas de catalogue sans JS | Catalogue interactif, sans duplication | Non : meta + header |

Les deux catalogues demeurent volontairement des SPA non indexables. Les sept documents prioritaires contiennent réellement leur texte initial. L’application emploie `createRoot`, et remplace donc le pré-rendu au montage ; elle ne revendique pas une hydratation React. Le test attend l’effet du Footer puis confirme le H1, les canonical et l’absence d’erreur JavaScript.

Les variantes d’accueil ont des hreflang FR/EN/AR réciproques. Les autres routes n’en inventent pas. Les sept documents indexables ont un canonical unique, des descriptions non vides, OG/Twitter cohérents et des images disponibles. Le JSON-LD de l’accueil est WebSite ; aucun Product/Offer/Service ou statut de société n’est inventé. Le texte indexable initial ne contient pas de fiches issues des fixtures. L’aperçu interactif peut afficher des données DEMO signalées par badge ; ses fiches et API restent noindex, ce qui n’équivaut pas à interdire l’indexation de tout texte rendu sur la homepage.

Sitemap servi et XML validé : `/fr`, `/en`, `/ar`, `/about`, `/pros`, `/partner`. Aucune route privée ni fiche DEMO. Robots servi avec le sitemap absolu ; pas de blocage empêchant la lecture de noindex. Les images et preload sont résolus dans le manifeste Vite. Les dix autres entrées institutionnelles/catalogues générées restent des shells à métadonnées et ne sont pas annoncées comme pré-rendues.

Référence de comportement : [Cloudflare `_headers`](https://developers.cloudflare.com/pages/configuration/headers/) limite ses règles aux assets statiques. Les Functions doivent définir leurs propres en-têtes. Les règles réelles seront à revérifier après la publication autorisée de la candidate.

## UX et navigation

FR/EN/AR, RTL, thèmes et largeurs 320 à 1440 px, clavier et Reduce Motion sont inclus dans les E2E. Le parcours communautaire aboutit au Feed. Les services et vétérinaires restent consultables publiquement. Les communautés protégées invitent à se connecter en conservant le contexte. Inscription, login, logout, changement client/professionnel, historique et retour sur pages protégées sont couverts par les suites de navigation et d’isolation.

Aucun score Lighthouse ni Core Web Vitals terrain inventé. Aucun nouveau contrôle sur appareil Android physique ni preuve de notification WSS privée Android en production.

## Versions hébergées observées en lecture seule

| Composant | Commit SHA | Version / déploiement | Tests / preuve | Statut |
| --- | --- | --- | --- | --- |
| GitHub main | `f48e398363a50c24e804b4b2c8920cbaed15b6d6` | Branche officielle inchangée | API GitHub ; CI 40112609121 et CodeQL 40112609250 success | Ancienne release officielle |
| Candidate locale/GitHub | `16628cd994c0350a47c8223fefec5295c44fd713` | Branche de stabilisation séparée | CI et CodeQL PASS ; build local propre à ce SHA | Non déployée |
| Docker Hub | `f48e398363a50c24e804b4b2c8920cbaed15b6d6` | `5eef/yazoo-api-demo`, digest `sha256:1f115b82ec0ae1c293c7ffab85f19891289943baa884bca96e9d8c9455ed43f0` | Manifeste registre lu avec jeton pull anonyme | Pas d’image candidate publiée |
| Render | Même SHA | `dep-dbeeh68ae00c73csvd90`, live, même digest | API Render + health ready : DB, R2, Reverb ok | Ancienne release disponible |
| Cloudflare Pages | Même SHA | Production/main `49a9f7bd-f08f-413c-a7bc-47c8ec86d4be`, success | API projet après renouvellement de session Wrangler ; source ad_hoc | Ancien Web, nouvelles routes SEO non livrées |
| Android EAS | Même SHA | Build `3ac4d7be-18c5-49d9-8c41-1b92f3d746d0`, FINISHED, 0.1.0 / code 1 | build:view puis dernier build:list ; APK local historique SHA-256 vérifié | Ancien APK, aucune candidate construite |

SHA-256 de l’APK historique local : `5c29ebdbc9f851e3226784a431fb213d4bd6b34f7afa4177c06aaad8bd7f0564`. [APK EAS existant](https://expo.dev/artifacts/eas/Cg2dls7xcg2xmteffsw9CpJLbpfXpC6eZNEDJjhpens.apk). Les octets CDN n’ont pas été retéléchargés dans cette mission. Le dernier build listé correspond bien au build consulté, y compris lors de la relecture du 26 octobre. Les tests mobiles de source ne prouvent pas le fonctionnement de cet APK sur un téléphone réel.

L’inspection en lecture seule de l’image publiée au digest indiqué a confirmé `curl-8.21.0-r0` et `libcurl-8.21.0-r0`. Elle reste donc concernée par le correctif curl identifié ; un ancien scan vert n’annule pas une nouvelle alerte. Le correctif candidat n’est pas encore actif sur Render. Une mise à jour de démonstration revue et autorisée devra intégrer l’image corrigée, sans prétendre que l’ancienne image est actuellement conforme au nouveau scan.

Les premières lectures Cloudflare globales ont retourné 403, puis le projet a retourné 401 pour une session expirée. Le client officiel a renouvelé sa session existante et la relecture du projet précis a confirmé le SHA complet. Aucun élargissement de permission ni modification des secrets applicatifs.

Les HTTP publics de l’ancienne release ont aussi été relevés : ils ne doivent pas être confondus avec les résultats du serveur candidat. Les langues de l’accueil et le noindex des Functions de la candidate ne peuvent pas être présentés comme déjà servis en production. Health 200 ne transforme pas Redis/queue/scheduler marqués skipped en contrôles validés, ni Render Free en garantie de disponibilité continue.

## Procédure de mise à jour préparée — non exécutée

1. Relire la PR candidate, ses contrôles et ce rapport. Faire approuver la mise à jour de la démonstration existante. Aucune fusion automatique.
2. Après fusion autorisée, identifier le SHA exact de `main` et exécuter CI/CodeQL à ce SHA. Utiliser un checkout propre ; ne pas empaqueter les fichiers locaux étrangers à la release.
3. Déclencher seulement alors le workflow existant de publication d’image, conserver le tag SHA immuable, les résultats du scan et le digest du registre. Ne pas écraser l’image historique.
4. Préparer Render avec le digest revu. Aucun changement de schéma requis par ce diff : ne lancer ni seed, ni réinitialisation, ni migration destructive. Conserver les flags et secrets existants ; vérifier health, version, DB/R2 et digest actif après la bascule autorisée.
5. Construire le frontend avec les flags du showcase et `VITE_SITE_URL=https://yazoo-showcase.pages.dev`. Vérifier `release.json`, canonical, hreflang, HTML, images et absence de sourceDirty. Publier uniquement vers le projet Pages existant, en enregistrant le SHA exact. Rejouer les contrôles HTTP, y compris API/Functions et fallback privé ; ne pas déduire les headers d’un fichier.
6. Si un nouvel APK est retenu, lancer manuellement EAS preview depuis le même checkout propre et conserver build ID, SHA, version distante, hash et signataire. Aucune publication Play et aucun changement d’infrastructure payante. Tester ensuite sur le téléphone réel.
7. Répéter le parcours jury sur comptes fictifs autorisés : inscription/connexion, Feed/Stories/Reels, catalogue, demande fictive, messagerie/notification, logout et changement de compte. Marquer WSS et téléphone non vérifiés jusqu’à preuve effective. Aucun compte administrateur réel à modifier.
8. Conserver les IDs/digest historiques pour la traçabilité. Ne pas considérer l’ancienne image curl vulnérable comme un repli de sécurité validé : toute reconstruction d’un ancien code doit conserver les correctifs de sécurité et repasser les scans. Tout rollback reste une action opérateur contrôlée, sans rollback SQL automatique ni effacement de médias.

## Candidature Idea’Wave

Les documents du 25 octobre présentent YaZoo comme une startup technologique née au Maroc avec ambition d’écosystème social et commercial international. Communauté prioritaire, services et marketplace complémentaires, pilote proposé Fès–Meknès, commissions hypothétiques de 3/5/8 %, aucune traction, revenu, société ou partenaire réel inventé. Les activités vétérinaires restent séparées de l’hypothèse de commissions.

Le pitch antérieur de **20 pages** est identifié et ses corrections exactes sont documentées ; le deck distinct de 12 diapositives est également distingué. Les nouveaux textes et le script sont préparés. Le PDF final n’a pas été modifié. Un CV public PDF historique est présent dans le kit local ; sa validation et sa mise à jour appartiennent au fondateur. Vidéo personnelle réelle, CV relu, LinkedIn, coordonnées et déclarations, export final du deck et soumission avant le 31 octobre 23 h 59 restent des actions du propriétaire.

## Clôture Git, CI et décision

### Résultats locaux définitifs

- Frontend lint, TypeScript et i18n : PASS ; recontrôlés le 26 octobre. Unitaires : **245/245, 63 fichiers**, PASS avec deux workers, sans augmentation de timeout. Build, 17 entrées HTML, vérificateur SEO et audit Tailwind PASS ; contrôles de politique de release : 3/3 PASS.
- Mobile : lint, TypeScript et **81/81 tests PASS**. Aucun changement depuis cette validation, hormis des documents et tests Web.
- Exécution E2E complète locale : **261 PASS, 6 FAIL, 69 SKIP / 336 cas**, en forte concurrence. Les six échecs concernent captures de marque, deux cas de navigation 320 px, logout 1440 px, lecture vidéo 375 px et chargement landing AR. Ils restent dans le journal ; ce run n’est pas présenté comme PASS.
- Une première reprise a été affectée par l’interruption de l’environnement : durées de plus de vingt heures. Elle ne constitue pas une barrière de release valide.
- Exécution fraîche **consolidée du 26 octobre : 60/60 PASS en 3,1 minutes**, deux workers, incluant les scénarios marque et logout précédemment en échec. Commande : `npm run test:e2e -- global-startup.spec.js global-navigation.spec.js public-smoke.spec.js startup-pilot.spec.js auth-isolated.spec.js logout-isolation.spec.js accessibility.spec.js branding.spec.js --grep-invert 'branding [0-9]' --workers=2`.
- Reprise fraîche des **quatre autres scénarios précis : 4/4 PASS en 51 secondes**, un worker. Aucun scénario ni assertion supprimé ; le test de navigation nomme désormais chaque route avec `test.step` pour rendre un éventuel échec localisable. Ces deux exécutions ne sont pas additionnées pour annoncer un run de 336 PASS. La cause unique de tous les échecs intermittents n’est pas établie ; la validation distante reste une barrière distincte.
- HTTP candidat : **16 lignes de preuve PASS**, couvrant les neuf pages, quatre routes privées et trois Functions, plus les assertions du sitemap et des robots. Les tests utilisent réellement workerd, des fixtures HTTP sans base et Chromium avec/sans JS.
- Non exécutés localement : les **69 cas full-stack conditionnels** du run général, nécessitant leurs fixtures dédiées ; suite Laravel ; build d’un nouvel APK ; téléphone physique ; recette métier hébergée ou WSS privé Android. La CI existante exécute les full-stack dans des étapes séparées ; son résultat sera attaché au SHA candidat.
  Les fichiers conditionnels concernés sont `veterinarian-fullstack.spec.js`, `branding-demo.spec.js`, `logout-fullstack.spec.js`, `social-marketplace-fullstack.spec.js`, `social-media-s3.spec.js` et `social-notifications-fullstack.spec.js`. Les 69 SKIP ne sont jamais comptés comme tests réussis.
- Preuves locales ignorées par Git : `output/rc-unit-serial.log`, `rc-mobile.log`, `rc-build-final.log`, `rc-static-seo-final.json`, `rc-http-final.json`, `rc-e2e-consolidated.log`, `rc-e2e-fresh-20261026.log`, `rc-e2e-recheck-fresh-20261026.log`. Les logs interrompus restent conservés.
- Relecture hébergée le 26 : main, image Docker, déploiement Render et Cloudflare restent à `f48e398`. Render a d’abord dépassé le délai de réveil, puis readiness est revenu à `ok` avec ce SHA, DB/R2/Reverb ok ; le proxy Pages répond ready. Les services skipped restent explicitement non validés.

### HTTP de la version encore hébergée

Les neuf URL ont répondu 200 en lecture seule ; leur HTML initial ne contient aucun H1. Canonical vide pour `/`, `/fr`, `/en`, `/ar`, canonical de route pour les cinq autres. Aucun X-Robots-Tag observé sur ces pages ni sur `/messages` et le statut backend. Cela décrit l’ancienne release, pas un échec du build candidat et pas une prétendue mise en production du nouveau SEO. `/api/auth/me` répond 401 sans compte ; aucune session réelle créée.

Branche publiée : `release/global-rc-20261025` ; [PR brouillon #9](https://github.com/5eef/YaZoo/pull/9), aucune fusion. Premier commit applicatif `2d2bf5aa1e6130c3e289782964515c3c2869114e` : [CodeQL PASS](https://github.com/5eef/YaZoo/actions/runs/40338853434), [première CI](https://github.com/5eef/YaZoo/actions/runs/40338854150) bloquée par Trivy sur curl/libcurl. Mobile et concurrence MySQL ont réussi. Le build local reconstruit de ce commit a un `release.json` au SHA exact, `sourceDirty: false`, et les contrôles HTTP workerd ont réussi. Le correctif de sécurité des trois Dockerfiles fait l’objet d’un commit séparé et d’une nouvelle CI ; son résultat sera consigné avant décision finale.

### Clôture vérifiée du code candidat — 26 octobre 2026

- Commit applicatif et images corrigées : **`16628cd994c0350a47c8223fefec5295c44fd713`**. Le build local de ce SHA et son vérificateur SEO passent, avec `sourceDirty: false`.
- **[CI complète 40342315669 : SUCCESS](https://github.com/5eef/YaZoo/actions/runs/40342315669)** au SHA exact : qualité, concurrence MySQL, mobile, conteneurs et secrets verts.
- **[CodeQL 40342315651 : SUCCESS](https://github.com/5eef/YaZoo/actions/runs/40342315651)** au même SHA.
- Journal qualité de ce run : Laravel **525 tests / 4 282 assertions** ; React **245 tests / 63 fichiers** ; Playwright général **267 PASS / 69 SKIP** ; étapes isolées **54 PASS** puis **15 PASS**. Il s’agit d’étapes distinctes du même run CI, pas d’un résultat artificiel de 336 PASS dans une seule invocation. Les cas conditionnels ignorés dans le smoke général sont exécutés dans leurs étapes dédiées.
- Le job mobile inclut lint, TypeScript, 81 tests, audit selon la politique existante et export JavaScript Android. Cela ne construit ni ne publie un nouvel APK.
- Trivy : **0 HIGH/CRITICAL dans chacune des trois images ciblées**, avec les seuils initiaux. Gitleaks : **no leaks found**. Les quatre cycles de démarrage showcase, les contrôles FPM et le smoke des images non root passent. Cela ne signifie pas zéro vulnérabilité de tout niveau dans tout le projet ; les alertes d’outillage restent soumises à la politique existante.
- Preuves complémentaires ignorées par Git : `output/rc-quality-fixed-ci.log`, `rc-container-fixed-ci.log`, `rc-build-security-commit.log`, `rc-static-seo-security-commit.json`.
- Les **137 fichiers hors périmètre sont inchangés**, vérifiés par empreinte. Aucun `.env`, clé, base, sauvegarde ou répertoire `output/` n’est inclus. Le périmètre final comprend **38 fichiers** par rapport au HEAD initial ; les trois Dockerfiles s’ajoutent aux 35 premiers fichiers validés.
- Une clôture documentaire publie ce rapport après le commit applicatif validé. Elle ne change ni les applications, ni les Dockerfiles, ni les workflows. Les contrôles du dernier HEAD documentaire sont consultables dans [les checks de la PR](https://github.com/5eef/YaZoo/pull/9/checks) ; les preuves figées du code sont les deux runs ci-dessus. Aucune fusion, aucun tag réécrit et aucune image poussée sur Docker Hub.

La candidate est techniquement prête pour une **mise à jour manuelle et autorisée de la démonstration existante**. Les services et l’APK encore hébergés restent à `f48e398`, et l’image actuellement publiée conserve les anciens paquets curl. Le passage effectif à la candidate, la recette Web/API/WSS après livraison, le nouvel APK éventuel et le téléphone physique restent des actions opérateur/propriétaire. Le dossier Idea’Wave reste à finaliser personnellement, notamment la vidéo réelle et le deck exporté ; la préparation technique n’équivaut pas à sa soumission.

### Fichiers inclus dans le candidat

- `.github/workflows/ci.yml`
- `README.md`
- `docs/IDEAWAVE_GLOBAL_2026_CONTENT.md`
- `docs/IDEAWAVE_PITCH_CORRECTIONS_2026-10-25.md`
- `docs/SEO_NOTES.md`
- `docs/YAZOO_COMMISSION_SCENARIOS_2026.md`
- `docs/reports/GLOBAL_STARTUP_2026-10-25.md`
- `docs/reports/GLOBAL_STARTUP_SEO_MATRIX_2026-10-25.md`
- `docs/reports/YAZOO_GLOBAL_RELEASE_CANDIDATE_2026-10-25.md`
- `frontend/e2e/full-demo-responsive.spec.js`
- `frontend/e2e/global-navigation.spec.js`
- `frontend/e2e/global-startup.spec.js`
- `frontend/e2e/public-smoke.spec.js`
- `frontend/functions/_shared/proxy.js`
- `frontend/index.html`
- `frontend/public/_headers`
- `frontend/scripts/generate-static-seo-pages.mjs`
- `frontend/scripts/prerender-entry.jsx`
- `frontend/scripts/verify-served-seo.mjs`
- `frontend/scripts/verify-static-seo.mjs`
- `frontend/src/App.jsx`
- `frontend/src/cloudflare/proxy.test.js`
- `frontend/src/components/marketplace/PublicMarketplaceShowcase.jsx`
- `frontend/src/components/seo/SeoManager.jsx`
- `frontend/src/components/seo/SeoManager.test.jsx`
- `frontend/src/components/seo/seoConfig.js`
- `frontend/src/contexts/I18nContext.jsx`
- `frontend/src/contexts/I18nContext.test.jsx`
- `frontend/src/lib/i18n.js`
- `frontend/src/lib/locales/globalStartup.js`
- `frontend/src/pages/LandingPage.jsx`
- `frontend/src/pages/LandingPage.test.jsx`
- `frontend/src/pages/PublicListingPage.jsx`
- `frontend/vite.config.js`
- `mobile/src/i18n/messages.ts`

- `Dockerfile.api-demo`
- `backend/Dockerfile`
- `frontend/Dockerfile`

**READY FOR DEMO DEPLOYMENT**
