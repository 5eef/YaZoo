# Cleanup prudent avant AFWAJ — 10 octobre 2026

Branche `startup-2026`. Audit effectué avant suppression. Le working tree local
et ses changements AFWAJ restent la source de vérité. Aucun commit, push, merge,
tag, déploiement, test téléphone ou ADB pendant cette phase.

## Méthode et périmètre

Mesure logique approximative sous PowerShell : énumération des fichiers avec
`Get-ChildItem -LiteralPath ... -Recurse -Force -File`, somme des longueurs par
dossier et classement décroissant. Les parents incluent leurs descendants :
les lignes du classement ne doivent pas être additionnées. Les tailles ne sont
pas une mesure des blocs NTFS ni de la taille physique du disque Docker Desktop.

Inventaire complet local : `output/cleanup-before.json`. État Git et empreintes
SHA-256 des 1064 fichiers livrables présents avant cleanup conservés dans
`output/cleanup-integrity-before.json`. Les `.env` et clés locales sont contrôlés
par nom, statut Git et empreinte ; leur contenu n’est pas publié.

## Classification avant toute suppression

| Classe | Éléments | Décision |
|---|---|---|
| A — Source indispensable | `.git`, sources, docs, scripts, Dockerfiles, tests, configurations, manifests et lockfiles | Conserver |
| B — Assets démonstration | `docs/logo`, nouveaux logos runtime, médias seed AFWAJ et médias locaux utiles | Conserver |
| C — Dépendances régénérables | frontend/mobile node_modules et backend/vendor | Conserver pour un environnement immédiatement utilisable ; réinstallation vérifiée |
| D — Artifacts régénérables | builds Android, exports dist, coverage, résultats Playwright | Nettoyer après validation, sauf fichiers protégés |
| E — Caches régénérables | caches locaux Gradle/CMake, Expo, Vite, Python | Nettoyer les chemins explicitement audités |
| F — Temporaires | copies intermédiaires de scans de sécurité, index Alpine temporaire, scans Trivy remplacés | Nettoyer ; conserver scans finaux et rapports |
| G — Rôle ou valeur historique incertains | snapshots finaux, preuves QA, scripts/fixtures locaux, sauvegardes, dump SQL de restauration | Conserver, aucune suppression automatique |

`output/brand-before-20261010`, `output/closure/index-final`,
`output/closure/worktree-final`, `output/final-readiness/restore-fixture.sql`,
les captures et preuves QA historiques, les rapports finaux Trivy et les
fixtures médias WebM restent conservés. Aucun nettoyage global de `output/`.

Les `.env` locaux racine/backend/frontend et la sauvegarde de configuration
backend sont ignorés par Git. Les seules entrées `.env*` suivies sont des modèles
`.example`. Le keystore Android de développement est ignoré et conservé.
Les deux `expo-root.pem` générés sous `app/build/intermediates/assets` sont
conservés à leur emplacement ; tous les `.env*` rencontrés dans les copies de
scans sont également exclus des suppressions. Aucune clé ou configuration
locale n’est supprimée.

## Validations avant cleanup

- Frontend : `npm ci`, lint, typecheck, 158 tests, audits i18n/Tailwind et build
  same-origin Pages réussis. Playwright : résultat final ci-dessous.
- Mobile : `npm ci`, `expo install --check`, Expo Doctor 21/21, lint, typecheck,
  49 tests et export Android avec API Cloudflare réussis.
- Backend : `composer install --no-interaction`, validation stricte, audit,
  427 tests/2397 assertions et Pint 447 fichiers réussis dans l’image PHP locale.
- Aucun lockfile modifié. Le contrôle réseau Expo initialement refusé par le
  sandbox (EACCES) a été réexécuté avec accès autorisé et a réussi.
- Avertissements npm : ESLint 9 déprécié et script optionnel `unrs-resolver`
  non approuvé ; aucune approbation globale ajoutée. Les gates restent réussis.

## Exécution contrôlée

Le plan local `output/cleanup-project.ps1` n’agit qu’avec `-Execute`. Chaque
chemin absolu est vérifié dans `C:\project\YaZoo`, les liens de réanalyse sont
exclus, les fichiers suivis par Git sont refusés et les fichiers sensibles
protégés. Les suppressions utilisent uniquement `Remove-Item -LiteralPath` sur
les candidats audités ; aucun dossier parent du projet ni commande Git de
nettoyage. Manifeste détaillé conservé dans `output/cleanup-removed.json`.

Les résultats chiffrés du projet et l’inventaire Docker sont ajoutés après
exécution et contrôle d’intégrité. Aucun volume Docker ne sera supprimé.

## Reproductibilité et nettoyage optionnel propriétaire

Les deux `npm ci` ont été exécutés avec succès avant cleanup, puis les builds
et tests ont passé. `composer install --no-interaction` a également réussi avec
le lockfile actuel dans l’image PHP de validation. Les dépendances restent
installées ; aucun nouveau build n’est nécessaire pour utiliser le code local.
Les fichiers `dist` et les APK/AAB issus des anciennes validations ont été retirés.
L’APK preview signé et son URL restent à produire par le propriétaire via EAS.

Pour recréer les sorties Web, depuis `frontend` :

```powershell
npm.cmd ci
$env:VITE_API_URL='/api'
$env:VITE_STORAGE_URL='/storage'
$env:VITE_SITE_URL='https://yazoo-showcase.pages.dev'
npm.cmd run build
```

Pour recréer les dépendances et contrôler le mobile, depuis `mobile` :

```powershell
npm.cmd ci
npx.cmd expo install --check
npm.cmd run typecheck
$env:EXPO_PUBLIC_API_URL='https://yazoo-showcase.pages.dev/api'
npx.cmd expo export --platform android
```

Backend : `composer install --no-interaction` depuis `backend`, avec PHP et
extensions compatibles avec `composer.lock`. Le contrôle de cette phase a utilisé
l’image locale conservée et un montage du backend :

```powershell
docker run --rm -v C:/project/YaZoo/backend:/var/www/html -w /var/www/html --entrypoint composer yazoo-api:closure install --no-interaction
```

Les caches et artifacts natifs retirés sont régénérables par Gradle. La prochaine
construction native devra aussi reprendre la configuration Expo et les nouveaux
assets de marque ; aucun ancien APK local ne constitue une release AFWAJ signée.
Les dépendances JS pourraient être retirées ultérieurement pour économiser
environ 573 Mo supplémentaires. Ce choix **n’a pas été appliqué** afin de préserver
un environnement immédiatement utilisable ; vendor est également conservé.

Le cache Docker est partagé entre projets et aucun filtre fiable par projet n’a
été établi dans cet audit. Proposition séparée, **à examiner et exécuter uniquement
par le propriétaire s’il accepte de retirer aussi d’anciens caches d’autres
projets du builder sélectionné**, avec confirmation interactive :

```powershell
docker buildx du --builder desktop-linux --verbose
docker buildx prune --builder desktop-linux --filter "until=168h" --reserved-space 4GB
```

Cette proposition conserve les caches utilisés durant les sept derniers jours
et réserve de l’espace de cache ; aucun gain immédiat n’est promis. Elle n’a pas
été exécutée. Les options ont été contrôlées dans l’aide locale et la
[documentation Docker Buildx](https://docs.docker.com/reference/cli/docker/buildx/prune/).
Il ne s’agit pas d’une autorisation de supprimer des volumes ou images d’autres
projets. Toute décision sur les volumes nécessite une validation humaine séparée.

## CLEANUP AVANT / APRES

| Mesure | Go (10^9 octets) | Gio (2^30 octets) |
|---|---:|---:|
| Worktree avec toutes ses dependances avant | 8.133 | 7.574 |
| Worktree apres cleanup, dependances conservees | 0.939 | 0.875 |
| Espace net recupere dans le projet | 7.194 | 6.700 |
| Source suivie par Git, sans historique .git | 0.032 | 0.030 |
| Source livrable actuelle, incluant nouveaux fichiers AFWAJ | 0.036 | 0.034 |
| Estimation optionnelle sans les deux node_modules (non appliquee) | 0.366 | 0.340 |
| Estimation optionnelle sans node_modules ni vendor (non appliquee) | 0.300 | 0.279 |

La taille de `.git` est 29 959 872 octets ; il reste intact. Les estimations optionnelles conservent docs, configurations, preuves et sauvegardes. Le projet reste executable localement avec ses dependances : leur suppression optionnelle n’a pas ete appliquee.

### Top 15 dossiers avant cleanup

| Dossier (parents inclusifs) | Gio |
|---|---:|
| `mobile` | 6.883 |
| `mobile/android` | 6.504 |
| `mobile/android/app` | 6.453 |
| `mobile/android/app/build` | 5.595 |
| `mobile/android/app/build/intermediates` | 5.196 |
| `mobile/android/app/build/intermediates/merged_native_libs` | 2.727 |
| `mobile/android/app/build/intermediates/cxx` | 1.820 |
| `mobile/android/app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs` | 1.732 |
| `mobile/android/app/build/intermediates/merged_native_libs/debug` | 1.732 |
| `mobile/android/app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out/lib` | 1.732 |
| `mobile/android/app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out` | 1.732 |
| `mobile/android/app/build/intermediates/cxx/Debug/2j1g1l5w` | 1.130 |
| `mobile/android/app/build/intermediates/cxx/Debug` | 1.130 |
| `mobile/android/app/build/intermediates/cxx/Debug/2j1g1l5w/obj` | 1.130 |
| `mobile/android/app/build/intermediates/merged_native_libs/release` | 0.995 |

### Suppressions projet effectuees

Les chemins avec PEM ou .env ont ete nettoyes partiellement : ces fichiers et leurs repertoires parents restent en place. Les 683 entrees ciblees sont detaillees dans `output/cleanup-removed.json` ; le plan initial complet est `output/cleanup-plan-initial.json`. Une suppression partielle de fichier lors du premier refus sandbox explique que le manifeste de reprise ne suffise pas seul a sommer tous les octets : les tailles ci-dessous viennent du plan initial, et le gain net est mesure independamment avant/apres.

| Chemin audite | Classe | Mio retires environ | Raison | Regeneration |
|---|---|---:|---|---|
| `mobile/android/app/build` | D | 5728.88 | Android build artifacts | Gradle assemble/bundle |
| `mobile/android/app/.cxx` | E | 878.62 | Android CMake cache | Gradle assemble/bundle |
| `mobile/android/build` | D | 0.16 | Android project build artifacts | Gradle |
| `mobile/android/.gradle` | E | 51.46 | Project-local Gradle cache | Gradle |
| `frontend/dist` | D | 3.98 | Validated Web build output | npm ci; npm run build |
| `mobile/dist` | D | 4.63 | Validated Android JS export | npm ci; EXPO_PUBLIC_API_URL; npx expo export --platform android |
| `frontend/coverage` | D | 12.43 | Test coverage output | npm test -- --coverage |
| `frontend/test-results` | D | 0.00 | Browser test artifacts | npm run test:e2e |
| `mobile/.expo` | E | 0.91 | Local Expo workspace cache | npx expo start |
| `output/__pycache__` | E | 0.01 | Python bytecode cache | Python script execution |
| `output/brand-source-scan` | F | 34.37 | Duplicate security scan working copy | Recreate scan from source worktree |
| `output/afwaj-source-scan` | F | 30.61 | Duplicate security scan working copy | Recreate scan from source worktree |
| `output/closure/worktree-scan` | F | 30.42 | Duplicate intermediate security scan | Recreate scan from source worktree |
| `output/closure/index-scan` | F | 30.41 | Duplicate intermediate index security scan | Recreate scan from Git index |
| `output/final-readiness/source-scan` | F | 30.32 | Duplicate intermediate security scan | Recreate scan from source worktree |
| `output/final-readiness/index-scan` | F | 30.00 | Duplicate intermediate index security scan | Recreate scan from Git index |
| `output/afwaj-apkindex.gz` | F | 0.50 | Temporary Alpine advisory package index | Download package index |
| `output/afwaj-trivy-api-demo.json` | F | 0.17 | Intermediate scan superseded by final scan | Trivy scan |
| `output/afwaj-trivy-frontend.json` | F | 0.16 | Intermediate scan superseded by final scan | Trivy scan |

Aucun fichier suivi par Git supprime. Les 1064 fichiers livrables de depart et les 7 fichiers locaux proteges sont identiques par SHA-256 apres cleanup. Les logos originaux/runtime et les deux MP4 AFWAJ sont notamment conserves. L’index reste vide et `git diff --check` passe. Seul ce nouveau rapport est ajoute par la phase cleanup. Playwright final : **101 tests PASS** ; total des suites principales : **735 tests PASS**. Aucun build n’a ete relance apres suppression des artifacts.

## DOCKER AVANT / APRES

| Ressource | Avant | Apres |
|---|---:|---:|
| Conteneurs actifs | 16 | 1 |
| Conteneurs arretes YaZoo | 8 | 5 |
| Images YaZoo taguees | 11 | 5 |
| Volumes Docker, tous projets | 10 | 10 |
| Reseaux Docker, tous projets | 7 | 7 |

Images YaZoo initiales : 2.976 Go nominaux, couches partagees incluses. Sept volumes sont attribuables aux services/outils YaZoo (Redis, Trivy et cinq volumes anonymes Mongo/MySQL/Redis de verification) ; les trois autres appartiennent aux bases de developpement. **Volumes supprimes : 0. Reseaux supprimes : 0. Cache supprime : 0.**

### Ressources Docker supprimees

| Ressource | Type | Taille indicative | Raison / regeneration |
|---|---|---:|---|
| `yazoo-final-api-complete` | container | 0.21 Mo | Stopped temporary API/Web validation, no volume or unique source/data layer; Dockerfile et smoke/revue locale |
| `yazoo-final-web` | container | 0.08 Mo | Stopped temporary API/Web validation, no volume or unique source/data layer; Dockerfile et smoke/revue locale |
| `yazoo-final-api` | container | 0.21 Mo | Stopped temporary API/Web validation, no volume or unique source/data layer; Dockerfile et smoke/revue locale |
| `yazoo-api:afwaj-baseline` | image | 394.87 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |
| `yazoo-frontend:afwaj-baseline` | image | 113.20 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |
| `yazoo-web:closure` | image | 113.20 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |
| `yazoo-api:final` | image | 394.84 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |
| `yazoo-web:final` | image | 112.54 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |
| `yazoo-frontend:final` | image | 112.54 Mo | Older reproducible YaZoo image superseded by preserved AFWAJ images; Dockerfile et smoke/revue locale |

Les trois conteneurs supprimes etaient arretes, sans montages ni donnees uniques : uniquement caches nginx, logs et repertoires storage vides. Les images supprimees n’etaient plus utilisees par aucun conteneur. Aucun `-f`, `-v` ni prune global utilise.

### Ressources conservees et limites

- Actif : `yazoo-redis-1`, meme ID avant/apres, sain.
- Bases arretees conservees : `yazoo-closure-mongo`, `yazoo-final-restore`, `yazoo-final-redis`, `yazoo-final-mysql`, `dev-mongodb`, `dev-mysql`.
- Inconnu/protection : `yazoo-closure-verify` (119,49 Mo de couche modifiee, source et .env internes), conserve sans exposer sa configuration.
- Images de revue conservees : `yazoo-api:afwaj-local`, `yazoo-api-demo:afwaj-local`, `yazoo-frontend:afwaj-local`. Elles datent du 9 octobre ; l’image frontend precede l’integration du nouveau logo du 10 octobre. Ne pas la presenter comme une nouvelle image de cette identite. Reconstruire depuis le worktree valide lors de la prochaine preparation de release.
- `yazoo-api:closure` conserve pour les gates PHP, `yazoo-startup-local:latest` conserve faute de preuve suffisante de son role historique. Toutes les images hors YaZoo, dont Trivy dangling, sont conservees.
- `yazoo-final-audit` conserve car encore reference par les conteneurs de bases arretes ; les reseaux Compose et ceux des autres projets restent intacts. Aucun reseau temporaire YaZoo sans conteneur reference n’a ete retenu pour suppression.
- Les dix volumes ont exactement les memes noms avant/apres. `yazoo-trivy-cache` (1,457 Go, sans conteneur attache) est un candidat a revue humaine uniquement. Les volumes anonymes restent lies aux bases de verification ; leur utilite doit etre decidee par le proprietaire.

### Espace Docker et cache

Six images retirees : 1.241 Go nominaux ; couches inscriptibles des trois conteneurs retirees : 495 616 octets. `docker system df` passe de 5,044 a 4,586 Go pour les images, et de 120,2 a 119,7 Mo pour les conteneurs. Ce ne sont pas des mesures de place physique rendue a Windows : des couches restent partagees avec le cache et le disque virtuel Docker Desktop peut rester alloue. Aucun gain physique Docker Desktop garanti.

**DOCKER BUILD CACHE : 5,713 Go**, 272 entrees, conserve. Avant : 1,492 Go partages / 4,221 Go prives ; apres : 1,023 Go partages / 4,690 Go prives. Les suppressions d’images changent la repartition, pas le total du cache. Les tailles `system df` et `builder du` ne doivent pas etre additionnees.

Inventaires detailles conserves dans `output/cleanup-docker-before.json`, `cleanup-docker-after.json`, `cleanup-docker-containers.json`, `cleanup-docker-images.json`, `cleanup-docker-networks.json` et `cleanup-docker-removed.json`. Les variables d’environnement des conteneurs n’ont pas ete imprimees dans ces inventaires.
