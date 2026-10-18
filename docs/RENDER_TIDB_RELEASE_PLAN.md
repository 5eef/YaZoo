# YaZoo — plan de release contrôlée Render / TiDB

Date : 17 octobre 2026. Dépôt : `5eef/YaZoo`. **État : BLOCKED pour publication ; préparation locale terminée.** Aucune opération de publication n'est autorisée par ce document.

## État établi et limites de preuve

Informations fournies par le propriétaire : base Render/TiDB `yazoo_showcase_afwaj`, `DB_DATABASE` et `YAZOO_SHOWCASE_DATABASE_NAME` alignés sur ce nom, 20 comptes dont `veterinaire.agadir@yazoo.test` et `client.fes@yazoo.test`. Ancien marqueur actif : clé SQL `yazoo_cache_yazoo_showcase_bootstrap_v2`, valeur `s:8:"complete";`. Ligne durable v2 absente. Ces informations n'ont pas été relues sur la base distante pendant cette mission.

Les variables annoncées sont `YAZOO_RUN_SHOWCASE_BOOTSTRAP=true`, `YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=true`, `YAZOO_RUN_MIGRATIONS=true`, `YAZOO_RUNTIME_OPTIMIZE=true`. `YAZOO_RESET_RUNTIME_STATE` n'est pas visible dans Render : le script utilise `false` si elle est effectivement absente. Vérifier aussi les éventuels groupes de variables et overrides, sans les modifier.

Audit local et lecture GitHub : branche locale `startup-2026`, HEAD `3602ef610e14b8b2878b4935e308a455d5085995`. L'API GitHub renvoie le même SHA pour cette branche et `main` comme branche par défaut du dépôt. Les correctifs sont **non commités** : ce SHA n'identifie donc pas leur contenu et ne doit pas être utilisé pour publier leur image.

Les rapports `AUTH_PRESERVATION_REPORT.md`, `AUTH_VALIDATION_REPORT.md` et `SHOWCASE_STARTUP_AUDIT.md` restent conservés comme historique. Le présent plan remplace leurs hypothèses de cible et leurs anciennes consignes de rollback lorsqu'elles contredisent la préservation des mots de passe ou du marqueur durable.

## 1. Liste exacte des fichiers à publier

Manifeste **différentiel** de 25 chemins, à appliquer à un checkout complet du socle Git revu ; il ne s'agit pas de copier seulement ces fichiers pour construire l'application. Les fichiers inchangés du socle, dont les Dockerfiles, workflows et migrations existantes, restent nécessaires à la construction.

```text
backend/app/Console/Commands/BootstrapReleaseAdmin.php
backend/app/Console/Commands/BootstrapShowcase.php
backend/app/Console/Commands/RefreshShowcaseAvailability.php
backend/app/Console/Commands/SyncShowcaseCredentials.php
backend/app/Support/ShowcaseBootstrapState.php
backend/database/seeders/DemoContentSeeder.php
backend/database/seeders/MarketplaceTestSeeder.php
backend/phpunit.xml
backend/startup.sh
backend/tests/TestCase.php
backend/tests/Feature/Auth/AuthApiTest.php
backend/tests/Feature/Marketplace/Database2TestDataBootstrapTest.php
backend/tests/Feature/Marketplace/MarketplaceDemoSeederTest.php
backend/tests/Feature/Marketplace/ShowcaseBootstrapTest.php
backend/tests/Feature/ReleaseAdminBootstrapTest.php
backend/tests/Unit/Support/ShowcaseBootstrapGuardTest.php
frontend/src/pages/LoginPage.jsx
frontend/src/pages/LoginPage.test.jsx
frontend/e2e/cold-start.spec.js
frontend/e2e/auth-isolated.spec.js
scripts/validate-showcase-deployment.mjs
docs/AUTH_PRESERVATION_REPORT.md
docs/AUTH_VALIDATION_REPORT.md
docs/SHOWCASE_STARTUP_AUDIT.md
docs/RENDER_TIDB_RELEASE_PLAN.md
```

Les fichiers nouveaux non suivis à ne pas oublier sont `ShowcaseBootstrapState.php`, `auth-isolated.spec.js` et les quatre rapports. L'absence du gestionnaire de marqueur dans une release partielle ferait échouer la résolution des dépendances Laravel.

Cette mission ajoute uniquement trois simulations dans deux fichiers de tests existants et crée ce plan. Aucun code applicatif, workflow, Dockerfile, secret ou paramètre de base n'est modifié par cette mission. Les simulations supplémentaires vérifient la clé SQL et la sérialisation exactes annoncées, l'acceptation du nom AFWAJ et le refus de l'ancien nom.

Après autorisation distincte, préparer un checkout propre avec ce seul manifeste, relire son diff et le résultat des contrôles de secrets avant tout commit. Ne pas utiliser `git add -A`, ni le worktree mélangé comme source d'une image publique. Aucun index, commit, branche ou tag n'a été modifié ici.

## 2. Modifications à exclure

Conserver sur disque et hors de cette release toutes les modifications indépendantes actuelles sous `mobile/`, y compris les nouveaux `src/auth/logout.ts`, `src/auth/validation.ts`, `src/components/auth/PasswordInput.tsx` et `tests/auth-password-logout.test.mjs`. Les changements mobiles déjà contenus dans le socle HEAD ne sont pas annulés ; seule leur modification locale supplémentaire est exclue.

Exclure la suppression locale de `docs/logo/YaZoo logo.png`, l'ajout de `docs/logo/YaZoo logo romove background.png`, et tout `docs/CANDIDATURES_2026/`. Ne rien restaurer ni supprimer pour réaliser cette exclusion.

Exclure aussi `.env*` contenant des valeurs réelles, fichiers personnels, sauvegardes/dumps, cookies, logs, sorties `output/`, rapports de navigateur, credentials locaux et artefacts générés `frontend/dist/`. Les documents `RELEASE_FILES.txt` et les anciens runbooks ne constituent pas le manifeste de cette release : ils incluent d'autres périmètres historiques.

`.dockerignore` exclut notamment les environnements réels, `.git`, caches, logs, stockage local et dumps. Cette protection ne remplace pas la revue du checkout et du contexte de build. Aucun scanner de secrets complet n'a été relancé ici ; les contrôles CI requis doivent être verts sur le futur SHA.

## 3. Migrations en attente ou inconnues

Le dépôt contient **64 migrations**. Aucune migration n'est ajoutée ou modifiée par les correctifs de cette release. Cela **ne prouve pas** qu'aucune migration n'attend sur TiDB : la table distante `migrations` n'a pas été consultée.

Points à examiner dans l'inventaire distant avant tout démarrage de la nouvelle image :

| Migration existante | Motif d'examen |
| --- | --- |
| `2026_08_17_000000_create_operation_markers_table` | Table indispensable au marqueur durable ; schéma attendu : `key` primaire, `completed_at` obligatoire, `metadata` JSON nullable. L'absence annoncée de la ligne ne suffit pas à attester le schéma. |
| `2026_10_07_000000_create_pilot_daily_counters_table` | Dernière migration du dépôt ; état distant inconnu, pas présumé en attente sur la seule base de sa date. |
| `2026_07_25_000100_require_marketplace_moderation_by_default` | Son `up()` change des colonnes et met à jour des statuts métier. |
| `2026_07_27_000200_prevent_duplicate_pending_professional_verifications` | Son `up()` met à jour des demandes et peut rejeter des doublons. |
| `2026_08_02_000200_preserve_marketplace_transaction_history` | Ajout de colonnes et remplacement d'une contrainte étrangère. |
| `2026_08_02_000300_expand_reservation_payment_status` | Modification de colonne. |
| Les deux migrations FULLTEXT du 3 mai 2026 | Contrôle de l'option FULLTEXT et des capacités de la cible avant une éventuelle exécution. |

Le script appelle `yazoo:migrate-production` **avant** la transition du marqueur. Cette commande exécute toutes les migrations en attente, sous verrou et garde-fou de cible ; ce n'est pas une migration limitée à `operation_markers`. Les migrations `up()` ci-dessus ne doivent pas être confondues avec des suppressions présentes seulement dans les `down()`.

Préparer une lecture autorisée de `SELECT migration, batch FROM migrations ORDER BY migration`, puis comparer aux 64 noms du checkout final. Vérifier le schéma d'`operation_markers` en lecture seule. Consigner la liste exacte des opérations potentielles avant autorisation. Ne pas lancer `migrate`, `migrate:rollback`, `migrate:fresh`, `db:wipe`, `db:seed` ou un bootstrap de contenu pour obtenir cet inventaire.

**NO-GO tant que l'inventaire manque.** Avec `YAZOO_RUN_MIGRATIONS=true`, un simple démarrage peut déclencher des écritures non encore autorisées. Cette mission n'a exécuté aucune migration distante, aucun UPDATE ou DELETE sur TiDB.

## 4. Configuration Render nécessaire et mécanisme de publication

### Mécanisme démontré par le dépôt

`.github/workflows/dockerhub-publish.yml` est déclenché uniquement par `workflow_dispatch`. Il appelle la CI réutilisable, construit `Dockerfile.api-demo` en `linux/amd64`, scanne l'image chargée avec Trivy, puis pousse `5eef/yazoo-api-demo:<SHA_COMPLET>` et enregistre son digest. Il refuse un tag SHA déjà existant ou une réponse registre ambiguë. Il ne contient aucune bascule Render.

La CI active s'exécute sur PR, push `main`/`startup-2026` et appel réutilisable. Elle inclut PHP 8.4, tests, constructions et smoke tests Docker, scans et jobs mobiles. Les workflows Azure de déploiement sont archivés ; `scripts/deploy-database2-release-manually.ps1` cible Azure, pas le service Render showcase.

Les runbooks `DEMO_DEPLOYMENT_FREE.md`, `AFWAJ_DEPLOYMENT_FINAL.md` et `SHOWCASE_DEPLOYMENT_RUNBOOK.md` décrivent Render comme consommateur d'une **image externe Docker Hub**. C'est la chaîne prévue et documentée, corroborée par le workflow. Le type de source réellement configuré aujourd'hui dans le compte Render, son tag, son digest et son deploy ID **ne sont pas attestés par cet audit**. Une question a été adressée au propriétaire ; en l'absence de réponse, ils restent à relever. Un `git push` n'est donc pas une procédure de publication backend démontrée.

`Dockerfile.api-demo` contient uniquement Laravel et ses médias, pas le build frontend. Il embarque `backend/startup.sh`, utilise PHP 8.4 et Composer avec références d'images épinglées, définit `APP_VERSION` au build et expose le port 8080. L'entrypoint prépare le filesystem puis passe à `www-data`. Le runtime utilise MySQL ; les résultats PHP 8.5/SQLite locaux ne remplacent pas le test de cette image PHP 8.4.

### Variables à contrôler, sans modification automatique

| Paramètre | Valeur ou condition à vérifier |
| --- | --- |
| `DB_DATABASE` | `yazoo_showcase_afwaj`, confirmé par le propriétaire. |
| `YAZOO_SHOWCASE_DATABASE_NAME` | `yazoo_showcase_afwaj`, confirmé. |
| `YAZOO_EXPECTED_DB_NAME` | Doit être exactement `yazoo_showcase_afwaj` ; non fourni, donc non vérifié. |
| `YAZOO_REQUIRE_EXPECTED_DATABASE` | Doit rester actif pour le garde-fou des migrations. |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT` | MySQL, endpoint et port TiDB réellement utilisés, avec TLS valide ; jamais les ports locaux. |
| `YAZOO_EXPECTED_DB_HOST/PORT` | Doivent correspondre à la connexion réelle. |
| `YAZOO_SHOWCASE_DATABASE_HOST` | Doit correspondre au host de connexion. |
| `DB_URL` | Vérifier l'absence d'override contradictoire ; ne pas afficher sa valeur si elle contient des credentials. |
| `APP_ENV`, `YAZOO_DEPLOYMENT_PROFILE` | `production` et `showcase`. |
| `APP_URL`, `YAZOO_SHOWCASE_APP_HOST` | URL HTTPS et host autorisé du service réel. |
| `YAZOO_SHOWCASE_CONFIRMATION` | Conserver la valeur privée existante, cohérente entre configuration et commande ; ne pas la journaliser. |
| `YAZOO_RUN_SHOWCASE_BOOTSTRAP`, `YAZOO_SHOWCASE_BOOTSTRAP_ENABLED`, `YAZOO_RUN_MIGRATIONS`, `YAZOO_RUNTIME_OPTIMIZE` | Tous annoncés `true` ; garder ce constat séparé de l'autorisation d'exécuter des migrations. |
| `YAZOO_RESET_RUNTIME_STATE` | Absente selon les variables visibles ; ne pas l'ajouter ni l'activer. Par défaut le script ne purge ni cache ni queue. |
| `CACHE_PREFIX` | Le préfixe effectif doit rester `yazoo_cache_` pour retrouver la clé annoncée. Vérifier le défaut calculé depuis `APP_NAME` si la variable est absente. |
| Store de cache SQL | Vérifier table, connexion et éventuels `DB_CACHE_*` : le marqueur historique doit être lu dans le stockage SQL attendu, sans override vers une autre base. |
| `APP_KEY`, credentials DB, secret showcase et MFA | Conserver les valeurs existantes, sans rotation. Leur validité est contrôlée avant la reprise ; aucune valeur n'est reproduite dans ce plan. |
| TLS et options d'exploitation | Préserver les réglages TLS, cookies/CORS/Sanctum, R2, queue, scheduler, FULLTEXT et preflight déjà approuvés ; ne pas appliquer aveuglément un fichier d'exemple. |

Le garde-fou showcase compare exactement le nom de base configuré au nom autorisé ; il n'est pas codé en dur sur l'ancien nom. Les deux nouveaux tests AFWAJ confirment l'acceptation du bon nom et le refus de `yazoo_showcase`, sans connexion réseau. Cela ne vérifie pas les autres variables Render inconnues.

### Références encore obsolètes

Ne pas les copier sur Render :

- `backend/.env.showcase.example` : lignes `DB_DATABASE`, `YAZOO_EXPECTED_DB_NAME`, `YAZOO_SHOWCASE_DATABASE_NAME` encore sur `yazoo_showcase`.
- `scripts/validate-showcase-deployment.mjs` : assertions de conformité de cet **exemple** encore sur l'ancien nom ; son succès ne certifie pas la configuration AFWAJ réelle.
- `docs/DEMO_DEPLOYMENT_FREE.md` : nom et procédure de création d'une base vide historiques.
- `docs/TIDB_SHOWCASE_COMPATIBILITY.md` : procédure sur base vide `yazoo_showcase`, inadaptée à la base actuelle.
- `docs/AFWAJ_DEMO_GUIDE.md` : ancien nom et variables correspondantes.
- `docs/COMMERCIAL_ARCHITECTURE.md` : description historique du nom de base.

Aucun de ces fichiers n'est modifié automatiquement. Le présent plan documente la cible confirmée, sans renommer de base ni changer de variable.

### Cloudflare

`frontend/wrangler.toml` décrit le projet `yazoo-showcase` et le répertoire `dist`. Les Functions sous `frontend/functions/` servent de proxy same-origin ; `_routes.json` route notamment `/api`, `/sanctum` et `/storage`. Les tests de proxy font partie de la suite frontend exécutée.

Les runbooks évoquent un Direct Upload Pages et une branche de production `startup-2026` lors d'une opération antérieure. Le mode, la branche, le deployment ID et les bindings actuels restent à confirmer dans le compte. La branche GitHub par défaut `main` ne permet pas de les déduire. Conserver `VITE_API_URL=/api`, le chemin storage same-origin et le binding serveur `BACKEND_ORIGIN` approuvés ; aucun secret DB ou serveur dans des variables `VITE_*`.

## 5. Sauvegarde avant déploiement

Procédure future à autoriser ; aucune sauvegarde distante n'a été lancée ici :

1. Relever les références Render et Pages actuelles, le digest backend exact et leurs paramètres non sensibles. Préparer une fenêtre empêchant les écritures concurrentes non maîtrisées pendant la prise de référence et la transition.
2. Obtenir une sauvegarde cohérente et chiffrée de la base existante par le mécanisme autorisé par son opérateur. Inclure comptes, hashes, contenu métier, table `migrations`, marqueurs et cache historique ; les dumps sont des données sensibles à stocker hors Git et hors des rapports.
3. Enregistrer seulement un identifiant de sauvegarde, son contrôle d'intégrité et ses dates dans la fiche opérateur. Vérifier sa restauration dans une base jetable distincte. Ne jamais restaurer sur TiDB existant pendant cette mission ou pour tester la sauvegarde.
4. Capturer une référence chiffrée des comptes et un moyen de comparer les hashes sans les afficher. Relever les compteurs et le marqueur historique actif. Les 20 comptes annoncés sont une référence datée ; ne jamais supprimer des inscriptions ultérieures pour retrouver ce nombre.
5. Préserver `APP_KEY` et les secrets existants dans leur gestionnaire sécurisé, sans export dans ce plan. Sauvegarder les références des objets métier si R2 est utilisé ; le stockage objet n'est pas la sauvegarde SQL.

Sans preuve de sauvegarde restaurable et références de retour sûres, NO-GO.

## 6. Procédure de déploiement après autorisations distinctes

1. Lever les inconnues Render, Cloudflare et migrations. Faire approuver le manifeste et les écritures techniques de transition. Aucune autorisation antérieure citée dans un ancien runbook ne remplace les interdictions de cette mission.
2. Seulement après autorisation de commit/push : produire un SHA propre avec le manifeste exact et sans fichiers exclus. Vérifier CI, tests, politique de dépendances, secrets et scans sur ce SHA. Ne pas réutiliser le SHA HEAD actuel pour des sources modifiées.
3. Sur un moteur Docker disponible, construire en `linux/amd64` depuis ce checkout propre avec `Dockerfile.api-demo` et `APP_VERSION=<NOUVEAU_SHA_COMPLET>`. Tester l'image exacte, ses extensions, entrypoint, santé, utilisateur effectif, médias et deux démarrages. Exécuter `scripts/tests/showcase-startup.py` uniquement sur les ressources jetables qu'il crée. Vérifier aussi la transition du marqueur dans un environnement isolé. Scanner l'image et conserver les preuves.
4. Après autorisation de publication de registre, déclencher le workflow manuel de la branche revue. Consigner SHA, tag et digest publiés. Le workflow n'effectue pas le cutover Render.
5. Après autorisation de bascule Render, appliquer l'image immuable validée au service **existant**, sans changer de base ou de secrets. Si le service est en réalité connecté à GitHub plutôt qu'à une image externe, arrêter et faire approuver la procédure correspondant à cette source ; ne pas improviser un push supposé suffisant.
6. Le démarrage passe par les migrations contrôlées déjà examinées, puis le bootstrap. Avec l'ancien v2 reconnu, le bootstrap ne lance aucun seeder : il insère la preuve durable et actualise le miroir du cache. Toute migration ou erreur de guard inattendue impose l'arrêt de la procédure, jamais un reset.
7. Attention aux écritures préexistantes du démarrage : le renouvellement des disponibilités peut ajouter des créneaux fictifs et mettre à jour son indicateur cache. Autoriser explicitement ces écritures normales avec la transition ; ne pas décrire tout le démarrage comme une opération SQL strictement en lecture seule. Ne pas exécuter de seeding TiDB.
8. Vérifier le backend avant une publication frontend distincte. Pour Pages, utiliser le mode effectivement confirmé et le build du même SHA, avec Functions et bindings conservés. Publier vers le projet et la branche réellement autorisés, pas par déduction de `main`.

Le build frontend local a réussi sans `VITE_SITE_URL` ; les pages SEO statiques ont été ignorées. Le build de publication devra utiliser l'origine publique approuvée. Ce plan n'a modifié aucune variable Render ou Cloudflare.

## 7. Validation du marqueur

La simulation SQLite ajoute exactement 20 utilisateurs avec les deux emails fournis, insère directement la clé `yazoo_cache_yazoo_showcase_bootstrap_v2` avec la valeur `s:8:"complete";` et une expiration future, puis invoque le bootstrap corrigé. Laravel reconnaît `complete`, enregistre `operation_markers.key=yazoo_showcase_bootstrap_v2`, conserve les 20 comptes intégralement et ne crée aucun contenu. Une purge du cache SQL et une nouvelle invocation réussissent sans doublon. Les mots de passe ne sont jamais modifiés pour réaliser cette simulation.

Au premier démarrage réel futur, l'ordre est : validation des garde-fous de cible → lecture du marqueur historique avec son préfixe → insertion idempotente du marqueur durable → sortie avant tout seeder. Une éventuelle purge configurée intervient après cette promotion. Les redémarrages suivants lisent la preuve durable, indépendamment du cache applicatif.

Lectures SQL de contrôle proposées pour une session opérateur autorisée, **non exécutées ici**. Les noms de tables doivent correspondre aux réglages réellement vérifiés :

```sql
SELECT DATABASE();
SELECT migration, batch FROM migrations ORDER BY migration;
SELECT `key`, expiration, (`value` = 's:8:"complete";') AS legacy_complete
FROM cache WHERE `key` = 'yazoo_cache_yazoo_showcase_bootstrap_v2';
SELECT `key`, completed_at, metadata
FROM operation_markers WHERE `key` = 'yazoo_showcase_bootstrap_v2';
SELECT COUNT(*) AS users_count FROM users;
```

Après promotion, attendre exactement une ligne durable avec `completed_at` renseigné et provenance `legacy-cache-v2`. Comparer les comptes et hashes à la référence dans l'outil sécurisé, en ne publiant que le résultat d'égalité. La promotion écrit une ligne technique et utilise `Cache::forever` pour son miroir : ce dernier peut faire un upsert de l'entrée cache. Aucune de ces écritures distantes n'a été exécutée pendant la préparation.

Si le cache ne renvoie plus `complete` et que la preuve durable est absente, **NO-GO**. Ne pas fabriquer de preuve d'après les 20 comptes, ne pas remettre la base à zéro, ne pas remplacer les mots de passe. Examiner séparément une reprise ciblée et la faire autoriser. Ne pas tester `cache:clear` en production pour démontrer le correctif : cette propriété est déjà testée sur la base jetable.

## 8. Validations exécutées et tests réels après publication

| Contrôle exécuté pendant cette préparation | Résultat réel |
| --- | --- |
| Suite Laravel complète, PHP Herd Lite 8.5.11, SQLite en mémoire | **PASS — 475 tests, 2 760 assertions** |
| Sous-ensemble auth/seeders/bootstraps/guards | **PASS — 83 tests, 590 assertions**, inclus dans les 475 |
| Pint complet et exigences Composer | **PASS** |
| Frontend lint et typecheck | **PASS** |
| Vitest | **PASS — 208 tests, 55 fichiers** |
| Build frontend et contrôle légal | **PASS**, SEO statique ignoré faute d'origine locale configurée |
| Playwright Chromium auth mobile FR/AR/EN + réveil | **PASS — 4 tests**, API entièrement simulée, aucun backend distant testé |
| Validateurs showcase et startup actifs | **PASS** |
| Politique de release active `scripts/tests/release-policy.test.mjs` | **PASS — 2 tests** |
| Audit statique Dockerfile/contexte | Chemins, startup, base épinglée et 21 images présents ; ce n'est pas une validation du conteneur |
| Build, smoke et scan de l'image Docker finale | **BLOCKED** : client Docker disponible, moteur Docker Desktop Linux absent, vérification hors bac à sable également échouée |
| `scripts/validate-release-guards.mjs` historique Azure | **FAIL** : attend `.github/workflows/deploy.yml`, désormais archivé. Non appelé par la CI active ; ne pas restaurer ce workflow pour le faire passer |

Aucun test automatisé n'utilise TiDB ou un autre backend distant. Le chemin de configuration Laravel compilée a été neutralisé pour les processus de test et aucune configuration compilée n'était présente. Les tests PHP isolent la base et les stockages externes. Aucun environnement applicatif n'a été réécrit.

Après publication, tests réels à autoriser séparément : contrôler version et santé, marqueur durable, absence d'erreurs de guard, médias et proxy Pages, cookies HttpOnly/Secure/SameSite et CSRF/Sanctum, navigation et erreurs cohérentes. Tester une connexion et déconnexion du vétérinaire et du client avec leurs vrais identifiants autorisés, sans les modifier ni les mettre dans les logs. Leur accès Render n'est pas déclaré réparé ici.

Un parcours réel d'inscription doit utiliser une identité de validation explicitement autorisée, choisir son propre mot de passe et vérifier connexion/déconnexion/reconnexion. Il crée une donnée persistante et nécessite donc cette autorisation supplémentaire ; aucun compte ne doit ensuite être supprimé sans nouvelle autorisation. La conservation après redémarrage est déjà validée localement. Si un redémarrage réel est approuvé, vérifier de nouveau la connexion sans purge volontaire du cache, ni reset.

## 9. Rollback compatible avec le marqueur durable

Les anciens runbooks proposant de reprendre simplement l'image précédente ne suffisent plus. Une ancienne image peut lire seulement le cache et appeler `sync-showcase-credentials`, ce qui est incompatible avec la préservation des mots de passe, même si le miroir cache existe encore.

Préparer avant cutover une image de repli **déjà testée** qui conserve la lecture du marqueur durable, les hashes existants, l'interdiction de reseed sur base non vide et l'absence de synchronisation des credentials. Son digest doit être relevé et revu ; aucun digest antérieur n'est certifié sûr par cette mission. Un correctif compatible vers l'avant est préférable à une image qui réintroduit les chemins de réécriture.

Si le frontend est seul en cause, revenir au déploiement Pages précédent uniquement s'il reste compatible avec le backend corrigé, en gardant ce backend. Pour le backend, utiliser seulement l'image de repli sûre enregistrée et les mêmes APP_KEY/base/secrets. Ne pas effacer `operation_markers` ou le cache pour rendre une ancienne image acceptable. Ne pas restaurer la base, exécuter `migrate:rollback` ou tourner les mots de passe comme rollback applicatif. Une restauration de données resterait une opération distincte, à examiner et autoriser séparément.

## 10. Risques résiduels et décision GO / NO-GO

**GO technique local** pour les correctifs et la simulation exacte du marqueur. Aucun changement applicatif supplémentaire n'a été nécessaire pendant cette préparation.

**NO-GO pour publication** jusqu'à validation des points suivants :

1. Source Render réelle, image/digest/deploy ID courants, configuration effective complète et cible attendue AFWAJ attestés. Les deux noms de base fournis sont corrects, mais ne certifient pas tous les autres garde-fous.
2. Inventaire complet des migrations distantes, schéma `operation_markers`, sauvegarde restaurable et autorisation des éventuelles écritures de démarrage obtenus avant de lancer l'image.
3. SHA de release propre approuvé, CI verte sur ce SHA et image PHP 8.4 construite, testée et scannée. Docker est actuellement indisponible localement et aucun artefact immuable nouveau n'existe.
4. Repli backend compatible avec **mots de passe et marqueur durable** identifié et testé, plus référence Pages de repli.
5. Mode/branche/bindings Pages confirmés et autorisations explicites de publication et des tests réels obtenues.

À ce stade, aucune variable Render, aucune base distante, aucun mot de passe ni compte réel n'a été modifié. Aucun seeding TiDB, migration distante, UPDATE ou DELETE TiDB, commit, push, workflow de publication ou déploiement exécuté. Tous les fichiers indépendants restent préservés.

**BLOCKED** — plan prêt à revue, publication bloquée par les preuves opérationnelles manquantes et la validation Docker non exécutée.
