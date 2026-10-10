# Release cloud AFWAJ â€” procÃ©dure propriÃ©taire

Cette procÃ©dure prÃ©pare une dÃ©monstration fictive, pas un service de soins rÃ©el. Aucun push, dÃ©ploiement, reset TiDB ou build EAS n'est exÃ©cutÃ© par ce document. Les URLs existantes sont conservÃ©es et les services mis Ã  jour en place.

## 1. PrÃ©requis et commit

AccÃ¨s propriÃ©taire Ã  Docker Hub `5eef`, Render, Cloudflare Pages, TiDB Cloud et Expo/EAS ; Docker opÃ©rationnel, Node et lockfiles du dÃ©pÃ´t. Sauvegarde TiDB vÃ©rifiÃ©e avant migration. Fournir les secrets par les interfaces sÃ©curisÃ©es, jamais dans Git ou les rapports.

Le HEAD au dÃ©but de la prÃ©paration est `ad77546d60348577b9095cf230d5c6802a9c32b1`. Il **ne reprÃ©sente pas** les changements AFWAJ locaux. AprÃ¨s revue, le propriÃ©taire doit crÃ©er le commit final sur `startup-2026`, lancer la CI, puis reconstruire depuis ce commit. Ne pas attribuer Ã  l'ancien SHA une image contenant les modifications non commitÃ©es.

```powershell
git status --short --branch
git diff --check
# AprÃ¨s commit propriÃ©taire et CI verte seulement :
if (git status --porcelain) { throw 'Le worktree doit correspondre au commit validÃ©' }
$sha = (git rev-parse HEAD).Trim()
docker build --pull --build-arg "APP_VERSION=$sha" `
  -f Dockerfile.api-demo -t yazoo-api-demo:afwaj-final .
if ($LASTEXITCODE) { throw 'Build en Ã©chec' }
# Refaire health, parcours API et Trivy sur cette image avant publication.
docker tag yazoo-api-demo:afwaj-final "5eef/yazoo-api-demo:$sha"
docker push "5eef/yazoo-api-demo:$sha"
```

Consigner le SHA complet et le digest retournÃ© par Docker Hub dans la fiche de cutover. Render utilise `docker.io/5eef/yazoo-api-demo:<FULL_SHA>`, jamais `latest`. La construction locale de prÃ©paration utilise exactement `docker build --pull -f Dockerfile.api-demo -t yazoo-api-demo:afwaj-final .`.

## 2. Render

Service existant **yazoo-showcase**, image externe ci-dessus, plan **Free**, port **8080**, health path **/health/live**, aucun disque persistant. Garder l'entrypoint et CMD de l'image. Le compte Docker Hub privÃ©, si applicable, est un credential serveur Render.

Configuration non secrÃ¨te :

```dotenv
PORT=8080
APP_ENV=production
APP_DEBUG=false
APP_FORCE_HTTPS=true
APP_URL=https://yazoo-showcase.pages.dev
FRONTEND_URL=https://yazoo-showcase.pages.dev
YAZOO_DEPLOYMENT_PROFILE=showcase
YAZOO_RUN_MIGRATIONS=true
YAZOO_RUN_PRODUCTION_PREFLIGHT=true
YAZOO_REQUIRE_EXPECTED_DATABASE=true
YAZOO_RUNTIME_OPTIMIZE=true
YAZOO_RUN_SHOWCASE_BOOTSTRAP=true
YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=true
YAZOO_SHOWCASE_APP_HOST=yazoo-showcase.pages.dev
YAZOO_SHOWCASE_IMAGES_PATH=/opt/yazoo-showcase-images
YAZOO_SHOWCASE_UPLOADS_ENABLED=false
YAZOO_REQUIRE_PERSISTENT_STORAGE=false
QUEUE_CONNECTION=sync
CACHE_STORE=database
SESSION_DRIVER=database
SESSION_ENCRYPT=true
YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE=database
YAZOO_RUN_QUEUE_WORKER=false
YAZOO_RUN_SCHEDULER=false
YAZOO_REQUIRE_SCHEDULER_HEARTBEAT=false
YAZOO_REQUIRE_REVERB_HEALTH=false
YAZOO_FULLTEXT_SEARCH_ENABLED=false
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
PUBLIC_STORAGE_URL=/storage
PRIVATE_STORAGE_PATH=/var/www/html/storage/app/private
MEDIA_STORAGE_DRIVER=filesystem
MEDIA_FILESYSTEM_DISK=public
MEDIA_SCAN_ENABLED=false
MEDIA_SCAN_REQUIRED_IN_PRODUCTION=false
MEDIA_MONGODB_ENABLED=false
MEDIA_BACKUP_ENABLED=false
CMI_ENABLED=false
SMS_DRIVER=disabled
MAIL_MAILER=log
ADMIN_BOOTSTRAP_ENABLED=false
ADMIN_MFA_ENFORCED=true
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=yazoo-showcase.pages.dev,yazoo-showcase.onrender.com
CORS_ALLOWED_ORIGINS=https://yazoo-showcase.pages.dev,https://yazoo-showcase.onrender.com
TRUSTED_PROXIES=REMOTE_ADDR
DB_CONNECTION=mysql
MYSQL_ATTR_SSL_CA=/etc/ssl/cert.pem
```

ComplÃ©ter les informations lÃ©gales rÃ©elles applicables ou explicitement dÃ©monstratives du template `backend/.env.showcase.example` : `LEGAL_ENTITY_NAME`, `LEGAL_STATUS`, `LEGAL_ADDRESS`, `LEGAL_ICE`, `PRIVACY_CONTACT_EMAIL`, `DATA_CONTROLLER_NAME`, `CONTACT_RECIPIENT`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, rÃ©tention et dÃ©lai de rÃ©ponse. Le preflight reste actif et refuse les placeholders obligatoires ; aucune conformitÃ© juridique n'est revendiquÃ©e.

Secrets Ã  fournir manuellement : `APP_KEY` (clÃ© Laravel forte, stable entre redÃ©ploiements), `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `YAZOO_SHOWCASE_CONFIRMATION`, `YAZOO_SHOWCASE_PASSWORD` (au moins 20 caractÃ¨res), `YAZOO_SHOWCASE_MFA_SECRET` (Base32 32â€“64 caractÃ¨res), `YAZOO_SHOWCASE_MFA_RECOVERY_CODES` (8 codes hexadÃ©cimaux distincts de 10 caractÃ¨res). Garder les codes MFA hors du dossier jury.

Configurer Ã©galement les garde-fous Ã  partir de la **mÃªme cible TiDB validÃ©e** : `YAZOO_EXPECTED_DB_HOST`, `YAZOO_EXPECTED_DB_PORT`, `YAZOO_EXPECTED_DB_NAME`, `YAZOO_SHOWCASE_DATABASE_HOST`, `YAZOO_SHOWCASE_DATABASE_NAME`. `YAZOO_PROTECTED_DB_NAMES` doit protÃ©ger les autres bases rÃ©elles, sans inclure le showcase autorisÃ©. Ne pas utiliser la base systÃ¨me TiDB. Utilisateur DB limitÃ© au schÃ©ma showcase, TLS avec CA systÃ¨me. Le port TiDB vient de la console propriÃ©taire ; le template illustre 4000.

Le filesystem Render Free est Ã©phÃ©mÃ¨re. Au dÃ©marrage, migrations contrÃ´lÃ©es, bootstrap protÃ©gÃ©, restauration des 21 images et des deux petits MP4 versionnÃ©s, puis preflight sont exÃ©cutÃ©s. Les mÃ©dias fictifs survivent ainsi aux redÃ©marrages ; les uploads utilisateurs restent interdits. Ne pas vider le cache database : il contient les markers de bootstrap.

## 3. StratÃ©gie database : option B, upgrade conservateur v1 â†’ v2

Choix : rÃ©utiliser l'upgrade transactionnel existant, sans rÃ©initialisation automatique. Avant cutover, sauvegarder TiDB et vÃ©rifier humainement que le schÃ©ma ne contient que des donnÃ©es fictives. Ne jamais exÃ©cuter ces Ã©tapes sur une vraie base mÃ©tier.

Le marker database cache `yazoo_showcase_bootstrap_v1=complete` n'empÃªche plus AFWAJ : si v2 est absent, la commande exige exactement 20 utilisateurs, 3 posts, 0 story, 0 follow, ajoute AFWAJ puis contrÃ´le tous les counts avant de poser `yazoo_showcase_bootstrap_v2=complete`. Toute divergence refuse l'upgrade. V2 prÃ©sent : aucune rÃ©Ã©criture du dataset ni des passwords. Le prÃ©contrÃ´le de cible reste obligatoire mÃªme si le marker existe.

Sur une base showcase vide : bootstrap complet. Comptes hors allowlist : refus. La transaction d'upgrade prÃ©serve les credentials et ne supprime aucune donnÃ©e ; les copies de mÃ©dias versionnÃ©s sont idempotentes. Le rÃ©sultat attendu : 20 utilisateurs, 3 vÃ©tÃ©rinaires DEMO Sefrou/FÃ¨s/MeknÃ¨s, 10 services, 12 disponibilitÃ©s, 3 RDV, 5 conversations/10 messages, 5 posts dont 2 vidÃ©os Reels, 2 Stories image/vidÃ©o, 6 likes, 4 commentaires, 3 follows.

Dans un shell opÃ©rateur **dÃ©jÃ  configurÃ© sur la cible showcase autorisÃ©e** :

```sh
php artisan yazoo:bootstrap-showcase --images=/opt/yazoo-showcase-images --confirmation="$YAZOO_SHOWCASE_CONFIRMATION" --dry-run
php artisan yazoo:bootstrap-showcase --images=/opt/yazoo-showcase-images --confirmation="$YAZOO_SHOWCASE_CONFIRMATION"
php artisan yazoo:ensure-showcase-media --images=/opt/yazoo-showcase-images
php artisan yazoo:sync-showcase-credentials --confirmation="$YAZOO_SHOWCASE_CONFIRMATION"
php artisan yazoo:preflight-production
```

Un dry-run valide la configuration et les mÃ©dias, pas l'admissibilitÃ© complÃ¨te de l'upgrade historique. Si les counts v1 diffÃ¨rent, **arrÃªter**, conserver la sauvegarde et prÃ©parer sÃ©parÃ©ment un nouveau schÃ©ma showcase vide avec validation propriÃ©taire. Aucun `migrate:fresh`, drop de base, suppression de marker ou reset n'est autorisÃ© automatiquement. Render Free ne propose pas de shell ni SSH : lancer ponctuellement la mÃªme image depuis le poste opÃ©rateur avec un env-file local ignorÃ©, `--entrypoint php ... artisan ...`, puis supprimer uniquement le container ponctuel. Ne jamais copier un env-file dans l'image.

## 4. Credentials jury et local

Compte jury : **client.fes@yazoo.test**, non-admin. Password fourni sÃ©parÃ©ment ; mÃªme valeur privÃ©e `YAZOO_SHOWCASE_PASSWORD` dans `.env` local et Environment Secret Render. Ne jamais le passer dans un argument CLI, une URL, un fichier versionnÃ© ou une capture.

Historique local : MarketplaceTestSeeder dÃ©rive des mots de passe dÃ©terministes de la ville (`ascii/lower` + suffixe numÃ©rique), DemoContentSeeder utilise un mot de passe de fixture. Ce ne sont pas les credentials jury. Le bootstrap showcase les remplace pour les comptes non-admin. Le marker interdit une rÃ©Ã©criture ultÃ©rieure : utiliser la nouvelle commande pour synchroniser le password sans reseed.

`yazoo:sync-showcase-credentials` exige `APP_ENV=production` **et** `YAZOO_DEPLOYMENT_PROFILE=showcase`, l'activation showcase, HTTPS/host exact, driver MySQL/host/base exacts, confirmation explicite, password â‰¥20 caractÃ¨res, configuration MFA valide et marker v2. `YAZOO_DEPLOYMENT_PROFILE=production` est refusÃ©. Le profil showcase peut tourner localement dans un container isolÃ© ; ne pas relÃ¢cher ces garde-fous pour une base de dÃ©veloppement gÃ©nÃ©rale. Sur le poste hÃ´te, conserver MySQL 3306, MariaDB 3307 et MongoDB 27017.

La synchronisation prend seulement l'allowlist des fixtures non-admin avec nom DEMO et bio fictive, ne crÃ©e aucun compte, ne touche ni admins, ni timestamps, ni tokens, ni donnÃ©es sociales. Une seconde exÃ©cution avec le mÃªme secret ne rÃ©Ã©crit aucun hash. Ne jamais renommer un compte rÃ©el pour le faire entrer dans cette allowlist.

Nouveau bootstrap : les deux admins reÃ§oivent des passwords alÃ©atoires forts non divulguÃ©s, indÃ©pendants du jury ; le MFA propriÃ©taire existant est conservÃ©. Aucun compte admin n'est donnÃ© au jury. **Base historique v1/v2** : l'upgrade et la synchronisation conservent les admins ; si leur password historique Ã©tait celui du jury, le propriÃ©taire doit le remplacer sÃ©parÃ©ment via une procÃ©dure privÃ©e de gestion admin avant ouverture publique, et contrÃ´ler MFA/tokens actifs. Ne pas supposer que la synchronisation jury effectue cette rotation. Aucun password admin utilisable n'est Ã©crit dans ce runbook.

## 5. Cloudflare Pages

Mettre Ã  jour le projet existant **yazoo-showcase**. Root `frontend`, build `npm ci && npm run build`, output `dist`, production branch `startup-2026` aprÃ¨s CI verte du commit final (ou branche finale explicitement validÃ©e). Aucun merge main automatique.

```dotenv
VITE_APP_NAME=YaZoo
VITE_SITE_URL=https://yazoo-showcase.pages.dev
VITE_API_URL=/api
VITE_STORAGE_URL=/storage
VITE_GOOGLE_AUTH_ENABLED=false
VITE_REALTIME_ENABLED=false
VITE_MONITORING_ENABLED=false
```

Secret **serveur Pages Functions**, jamais prÃ©fixÃ© VITE : `BACKEND_ORIGIN=https://yazoo-showcase.onrender.com`. Aucun credential DB, APP_KEY ou password showcase dans les variables frontend. Les routes `/api/*`, `/sanctum/*`, `/storage/*`, `/broadcasting/*`, `/demo-backend-status` sont dirigÃ©es vers Functions par `_routes.json`. Le proxy conserve Authorization, Accept-Language, Content-Type et Retry-After ; les tests incluent les rÃ©ponses Sanctum 200/401 sans cookies. Le navigateur reste same-origin.

## 6. Mobile / EAS Preview

API unique : `EXPO_PUBLIC_API_URL=https://yazoo-showcase.pages.dev/api`. Pas d'IP LAN, localhost ni Render direct dans l'APK distribuÃ©. Expo Go est rÃ©servÃ© Ã  la QA propriÃ©taire ; aucun test appareil effectuÃ© pour cette release.

Depuis `mobile`, aprÃ¨s authentification propriÃ©taire :

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest project:info
# Seulement si aucun projet associÃ© :
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_API_URL `
  --value https://yazoo-showcase.pages.dev/api --visibility plaintext
# Si la variable existe dÃ©jÃ , la mettre Ã  jour via EAS dashboard/env:update.
npx.cmd eas-cli@latest build --platform android --profile preview
```

`preview` utilise l'environnement preview, APK interne et credentialsSource remote ; production est AAB. `app.config.ts` valide l'API HTTPS distribuÃ©e. API URL est publique, contrairement aux clÃ©s de signature. Aucun credential EAS/keystore Ã  commiter. Inscrire la vraie URL APK dans AFWAJ_DEMO_GUIDE, puis gÃ©nÃ©rer le QR Ã  partir de cette URL ; aucun faux QR.

## 7. Recette post-dÃ©ploiement et cutover

Avant annonce : `/health/live` et `/health/ready` Render 200, `/demo-backend-status` Pages opÃ©rationnel, Web login jury PASS et mobile login mÃªme compte/password PASS. VÃ©rifier mÃªmes vÃ©tÃ©rinaires, Feed, Stories/Reels et mÃ©dias. Sur Web crÃ©er un message fictif et le retrouver sur Android ; sur Android rÃ©pondre et retrouver la rÃ©ponse Web. RÃ©server un crÃ©neau fictif et vÃ©rifier le mÃªme RDV dans les deux clients. Ces vÃ©rifications cloud croisÃ©es restent Ã  faire aprÃ¨s dÃ©ploiement ; les mocks ne les remplacent pas.

Parcours et limites : voir AFWAJ_DEMO_GUIDE. Les crÃ©neaux libres sont calculÃ©s au bootstrap, les Stories dÃ©mo expirent le 1 janvier 2027 ; prÃ©parer une nouvelle version contrÃ´lÃ©e du dataset si la dÃ©monstration est reportÃ©e, sans effacer les markers en production.

## 8. Cold start et limites Free

Pages sert le frontend immÃ©diatement ; Render Free peut dormir. Un Ã©chec transitoire backend est traduit par le proxy en 503 `DEMO_BACKEND_WAKING`, `Retry-After: 4`. Web/mobile affichent un message localisÃ© et RÃ©essayer. Attendre quelques secondes et relancer un GET/health de faÃ§on bornÃ©e. Aucun POST automatique, aucune boucle de retry infinie. RÃ©chauffer `/health/live`, puis `/health/ready` avant passage jury. Ne pas promettre un SLA ou une disponibilitÃ© continue.

## 9. Rollback et anciens services

Avant cutover, noter le digest/image prÃ©cÃ©dent, le commit Pages prÃ©cÃ©dent et disposer d'une sauvegarde TiDB restaurable. En cas d'Ã©chec : arrÃªter l'annonce, repointer Render sur l'image immutable prÃ©cÃ©dente et Pages sur le dÃ©ploiement prÃ©cÃ©dent. **Une ancienne image peut Ãªtre incompatible avec un schÃ©ma migrÃ©** : tester cette compatibilitÃ© ou restaurer la sauvegarde vers un schÃ©ma sÃ©parÃ©, puis changer la cible sous contrÃ´le propriÃ©taire. Garder APP_KEY et secrets cohÃ©rents ; ne pas restaurer une sauvegarde par-dessus une base rÃ©elle.

Aucun inventaire de compte distant authentifiÃ© n'a Ã©tÃ© effectuÃ© : aucun doublon distant confirmÃ©. Garder `yazoo-showcase.onrender.com` et `yazoo-showcase.pages.dev` et les mettre Ã  jour en place. Ne supprimer d'Ã©ventuels doublons qu'aprÃ¨s tous les parcours croisÃ©s PASS, contrÃ´le DNS/config/mobile/docs et validation humaine. Ne supprimer aucun volume Docker.

## 10. VÃ©rification et responsabilitÃ©s

Les rÃ©sultats locaux de prÃ©paration sont consignÃ©s dans AFWAJ_DEMO_REPORT et le rapport de mission. Un rÃ©sultat local ne prouve pas la CI distante du futur commit ni la santÃ© du cloud. `npm audit` complet conserve les rÃ©siduels tooling documentÃ©s dans DEPENDENCY_SECURITY_AFWAJ_2026 ; ne pas les dÃ©clarer corrigÃ©s et ne pas dÃ©sactiver les gates. Le script historique `validate-release-guards.mjs` vise un workflow Azure retirÃ© ; les guards actifs CI sont `validate-startup-release-guards.mjs`, `scripts/tests/release-policy.test.mjs` et `validate-showcase-deployment.mjs` exÃ©cutÃ©s depuis la racine.

Actions humaines : revue/commit/CI, secrets et cible TiDB, sauvegarde/upgrade, rotation privÃ©e des admins historiques si nÃ©cessaire, publication image, mise Ã  jour Render/Pages, EAS/QA appareil, lien APK/QR, recette croisÃ©e. Dossier AFWAJ, identitÃ© du porteur, piÃ¨ces administratives/budget, disponibilitÃ© juridique OMPIC, dÃ©marches CNDP et consentement de vrais professionnels restent des responsabilitÃ©s propriÃ©taire ; aucune traction, partenaire, validation AFWAJ, marque dÃ©posÃ©e ou publication Play Store n'est inventÃ©e.

Références opérateur vérifiées : [EAS variables](https://docs.expo.dev/eas/environment-variables/manage/), [EAS CLI](https://docs.expo.dev/eas/cli/), [Render Free](https://render.com/docs/free), [Render shell](https://render.com/docs/ssh), [images Render](https://render.com/docs/deploying-an-image).
