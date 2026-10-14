# YaZoo — état de release au 14 octobre 2026

## 1. Dépôt et périmètre

Branche locale `startup-2026`, HEAD `15af09af532b0b2bfa2f030766405ba0ca75abf4`. Cinq commits devant `origin/main` selon les références actualisées. `origin/startup-2026` est un commit devant HEAD : `b5a89072905af7f590db4a6b1318f2ba865a4cb0` (patches dépendances Expo, mobile/package.json et lockfile). Les CI/CodeQL de ce commit distant sont réussies ; elles ne couvrent pas les changements locaux.

Toutes les modifications préexistantes sont conservées. Logos intentionnels inchangés : suppression de `docs/logo/YaZoo logo.png`, nouveau `docs/logo/YaZoo logo romove background.png`. **Exclus du commit technique et de son inventaire.** Aucun commit, staging, merge, push, publication d'image, modification de compte cloud ou migration publique réalisé.

Inventaire exact proposé : [RELEASE_FILES.txt](RELEASE_FILES.txt), à approuver avant staging/commit. Il comprend les corrections vétérinaire précédentes, tests/fixtures/scripts de reproduction, workflows renforcés, durcissement paiement et les documents de cette mission. Les fixtures de test sont du code publiable, jamais des données à importer sur TiDB. Aucun nouvel environnement, secret, capture, log ou backup dans cet inventaire. Les preuves locales sont dans `output/release-*` (ignoré) et les deux logs PHPUnit dans backend/storage/logs (ignoré).

Aucune migration ni modification de dépendance dans le delta local de cette release. Aucun changement de port MySQL/MariaDB/MongoDB. Le commit mobile distant doit être intégré de manière revue sans réécriture d'historique ; aucun fast-forward/merge automatique.

## 2. Corrections et causes

- Corrections précédentes conservées : fiche publique et champs professionnels, destination après login/register et créneau, polling de conversation, readiness, badges DEMO, liens social/professionnel, verrous SQL vétérinaire/client.
- Disponibilités : le démarrage seul ne maintenait pas un conteneur actif plus de 14 jours. Tâche quotidienne facultative à 04:45 Casablanca via OperationsSchedule ; confirmation dans configuration serveur, garde de cible et marqueur bootstrap conservés. Succès daté dans cache DB et logs réduits succès/échec. Aucun GET mutateur, nouveau worker obligatoire, créneau supprimé ou rendez-vous modifié. Sur Free sans scheduler fiable : rappel hebdomadaire + restart contrôlé autorisé, procédure dans SHOWCASE_DEPLOYMENT_RUNBOOK.md. La disponibilité quotidienne automatique n'est pas revendiquée.
- CI concurrence : parent et worker n'acceptaient que `yazoo_vet_test`, alors que CI utilise `yazoo_concurrency`. Allowlist limitée à ces deux bases éphémères ; worker exige aussi APP_ENV=testing. Les 4 cas passent sur le nom CI, avec refus des tests ignorés.
- CI publication : parcours full-stack réel ajouté, construction et scan de l'image showcase ajoutés, architecture amd64 explicite ; publication sérialisée par SHA et refus du tag SHA déjà existant ou du registre indéterminé. Ces nouveaux workflows doivent encore être exécutés sur GitHub après commit autorisé.
- Paiement préparatoire : une signature valide n'imposait pas la concordance du montant/devise avant transition paid. PaymentService vérifie désormais présence, format décimal sans notation scientifique/arrondi excessif, valeur et devise exacte sous verrou. Tests de callbacks signés incompatibles, incomplets et mal formés ; aucun PSP activé. Kit officiel CMI, capture vs autorisation, remboursements et réconciliation restent bloquants pour un paiement commercial réel.

## 3. Résultats réellement exécutés dans cette session

| Contrôle | Résultat |
| --- | --- |
| Laravel final PHP 8.4.24, SQLite mémoire, réseau Docker désactivé, environnement neutre, limite 512M | **461 tests, 2 691 assertions, réussis** |
| Paiement/disponibilités ciblés après correction | 34 tests, 175 assertions, réussis (recouvrent la suite complète) |
| Concurrence vétérinaire MySQL 8.4 jetable, nom de DB CI | **4 tests, 22 assertions, réussis, aucun ignoré** |
| Intégration réservation/paiement MySQL jetable | 1 test, 11 assertions, réussi |
| Pint final | 458 fichiers contrôlés, réussi |
| Composer validate --strict / audit | Valide ; aucun avis de vulnérabilité trouvé |
| Frontend lint / TypeScript | Réussis |
| Audit i18n | 2 028 clés FR/AR/EN, réussi |
| Vitest | **199 tests, 54 fichiers, réussis** |
| Playwright général | **101 réussis, 37 explicitement ignorés** (fixture réelle absente pour ce passage) |
| Playwright full-stack séparé, fixture propre sur port 5173 | **37 réussis** : parcours réservation/message/réception + 36 configurations de fiche |
| Build avec variables showcase same-origin | Réussi, 13 pages SEO statiques ; audit Tailwind 187 classes réussi |
| Mobile tests / lint / TypeScript | **63 tests réussis**, lint et TypeScript réussis ; aucun build natif ou QA appareil supplémentaire |
| npm audit frontend complet | **5 HIGH, 0 CRITICAL**, risque tooling braces et propagation aux parents ; runtime zéro via politique existante |
| npm audit mobile complet | **19 HIGH, 0 CRITICAL**, tooling documenté ; graphe Android frais non réexporté pendant cette session |
| Politique dépendances frontend | Réussie avec résidu tooling affiché, pas un npm audit PASS |
| Gitleaks manifeste technique final | **52 chemins**, aucun secret détecté ; extraction locale en lecture seule, documents/workflows inclus |
| Guards release/provider-neutral/headers locaux | Réussis ; 2 tests politique release réussis |
| Syntaxe startup et production-preflight-gate | Réussies |
| git diff --check | Réussi ; seuls avertissements LF/CRLF, sans normalisation globale |

La première tentative full-stack avec port Vite aléatoire échouait sur l'origine CORS attendue ; le passage final utilise le port 5173 documenté et passe. Le premier passage concurrence avait un cas ignoré à cause du nom de base ; les quatre passent après correction. Le premier contrôle workflow a refusé `|| true` dans le nettoyage du serveur ; nettoyage corrigé, guard inchangé et contrôle final réussi. Ne pas cumuler les passages ni masquer ces causes.

## 4. Image candidate locale

`yazoo-api-demo:release-candidate`, APP_VERSION=`local-release-candidate`, architecture amd64, taille locale non compressée **619 682 402 octets**. Image ID `sha256:fa08752bb86685a6281a111b4a36ba7517bc88ec0856ea7707ff73c823253649`. Trivy 0.75.0, base téléchargée pendant l'audit, **zéro HIGH/CRITICAL** sur cet ImageID exact. Cela ne prouve pas l'absence de toute vulnérabilité ni un scan LOW/MEDIUM.

Extensions pdo_mysql/intl/bcmath/zip/redis/mongodb/pcntl présentes, PHP 8.4.24, .env/.git absents. Processus startup, PHP-FPM et Nginx sous uid 82 (www-data). Démarrage complet showcase sur **MySQL Docker éphémère exclusivement** : migrations déjà appliquées, bootstrap, 21 médias, sync credentials, 99 créneaux ajoutés, preflight réussi, santé live/ready OK. Deuxième démarrage : preflight réussi, **0 créneau ajouté**, santé OK ; commande répétée sous www-data : 0 ajouté. Tests de conservation du rendez-vous confirmé dans la suite Laravel et de contention dans MySQL.

Le test image utilise filesystem avec uploads désactivés : le détail `media_storage=not_ready` n'empêche pas la readiness showcase quand le stockage persistant n'est pas requis. Il ne prouve pas une opération R2. Le root constaté lors d'un premier `docker exec` était le processus opérateur par défaut ; la liste des processus serveur est bien non-root et le second contrôle CLI s'exécute explicitement sous www-data.

Cette candidate provient du worktree et **ne doit pas être publiée sous le SHA HEAD**. Après commit et intégration approuvés, reconstruire depuis un checkout propre du SHA complet, refaire smoke/scan et publier seulement ce nouvel artefact. Aucun digest Docker Hub nouveau. Le digest de rollback Render actuel doit être relevé dans le compte.

## 5. Déploiement public observé — lectures uniquement

| Composant | Préparation / preuve | Limite |
| --- | --- | --- |
| GitHub | Lecture distante et fetch réussis, CI/CodeQL b5a8907 vertes | Changements locaux non publiés ; commit/push soumis à accord |
| Docker | Candidate construite, testée, scannée localement | Nouveau SHA/digest de release et push après accord |
| Render | live/ready 200, version 15af09a ; premier live timeout à froid | Image/digest configurés, variables et logs publics du compte non inspectés |
| Cloudflare | Statut 200 ready, deep link 200 HTML, fiche publique 200 JSON | API compte refuse la lecture avec auth locale ; branche de prod, variables, deployment ID non confirmés |
| TiDB | Connexion SQL OK au moment de readiness | Schéma/migrations, TLS effectif, sauvegarde et intégrité directe non vérifiés ; aucune écriture distante |
| R2 | Readiness publique r2 ready de configuration | Aucun upload/read privé/remplacement/delete/persistance autorisé ; non vérifié de bout en bout |

Fiche publique `/api/marketplace/public/veterinarians/1` : contrat ancien, **champ availability absent**, badge `verified_veterinarian` encore présent sur profil DEMO. Les corrections locales ne sont pas certifiées en ligne. Trois images via Pages : HTTP 200 image/png, 353 171 / 503 254 / 571 369 octets. La tentative initiale `/api/marketplace/veterinarians/1` utilisait une route incorrecte ; c'est la route `/marketplace/public/...` qui est évaluée ci-dessus. Aucun compte public connecté et aucune réservation, message, inscription ou transaction publique créé.

## 6. Préparation commerciale et risques

Voir [COMMERCIAL_READINESS_AUDIT.md](COMMERCIAL_READINESS_AUDIT.md) pour le tableau des 14 domaines et sources officielles, [COMMERCIAL_ARCHITECTURE.md](COMMERCIAL_ARCHITECTURE.md), [PRODUCTION_SECURITY_CHECKLIST.md](PRODUCTION_SECURITY_CHECKLIST.md), [BACKUP_RECOVERY_PLAN.md](BACKUP_RECOVERY_PLAN.md) et [COMMERCIAL_LAUNCH_ROADMAP.md](COMMERCIAL_LAUNCH_ROADMAP.md).

- P0 lancement commercial : restauration cloud non prouvée, environnements commerciaux non provisionnés/validés, conformité administrative et professionnelle non attestée ; paiement officiel incomplet si requis. Contrôle montant/devise corrigé localement, CMI toujours OFF. Aucun autre nouveau P0 confirmé dans le périmètre testé ; pas de déclaration exhaustive sur tout le dépôt.
- P1 showcase : corrections non déployées, parcours public réservation/message non validé, renouvellement opérationnel à effectuer sans garantie scheduler Free, branche Pages/digest Render non confirmés, tests R2 réels non autorisés. P1 commercial : disponibilité, notifications/recovery, support/modération/monitoring et risque tooling.
- P2 : charge/performance non mesurée, accessibilité et QA appareil complètes, rétention historique/agrégats et optimisation d'image selon mesures.

## 7. Prochaine décision propriétaire

Approuver le manifeste pour un commit technique local, **hors logos**, et décider l'intégration locale revue du commit mobile distant (sans rebase/force push). Fournir l'accès Cloudflare/Render par connexion sécurisée pour lecture de leurs paramètres ; jamais de secrets dans le chat. Autorisations distinctes ensuite : push/publication Docker Hub, cutover public avec références de rollback, et périmètre de tests créant des données fictives. Aucun paiement réel ni lancement commercial inclus.

**A — Showcase : ORANGE**, base locale validée et image candidate testée ; version publique encore ancienne, critères de publication/post-déploiement non satisfaits. **B — Commercial : ROUGE**, bases techniques présentes mais bloqueurs d'exploitation, données, droit et éventuellement paiement non levés. Ces statuts restent indépendants.

## Reprise de publication autorisée — 14 octobre 2026

Le propriétaire autorise maintenant commit/push sur startup-2026, publication exclusivement vers 5eef/yazoo-api-demo et mise à jour des services showcase existants. Les demandes d'accord des sections historiques ci-dessus sont satisfaites dans ce périmètre. Aucun secret, plan payant, donnée réelle ni logo ne peut être modifié.

Le commit Expo b5a89072905af7f590db4a6b1318f2ba865a4cb0 est intégré par fast-forward, sans perte du travail local. Contrôles rejoués : Laravel 461 tests / 2691 assertions ; Pint 458 fichiers ; Composer validate/audit ; React lint/typecheck/i18n, 199 tests, build same-origin et 187 classes Tailwind ; Playwright général 101 réussis / 37 ignorés puis full-stack réel 37 réussis ; MySQL concurrence/réservation 5 tests / 33 assertions ; mobile lint/typecheck/63 tests et export Android avec source maps. Politique runtime passée ; résidus tooling visibles : frontend 5 HIGH, mobile 19 HIGH, aucun CRITICAL.

Le premier parcours messagerie a révélé plusieurs ouvertures directes simultanées qui effaçaient le brouillon. Garde par destinataire ajoutée dans MessagesPage ; le parcours réel vérifie maintenant une seule requête d'ouverture, l'envoi, la persistance et la réception. Les 37 cas passent après correction sur une nouvelle fixture propre.

Le workflow de publication est limité au dépôt Docker autorisé, linux/amd64, tag SHA complet immuable ; il scanne désormais l'image exacte chargée avant docker push et enregistre le digest. Aucun alias latest ni autre dépôt Docker n'est publié.

Cloudflare relu dans le compte après validation Wrangler : production startup-2026, source Git absente (Direct Upload), sortie dist ; ancien deployment 83e6275f-071e-4bc9-8cad-e9e1fb5284d1 au SHA 15af09af532b0b2bfa2f030766405ba0ca75abf4. Variable serveur BACKEND_ORIGIN présente. Render : aucun accès API/CLI disponible ; image/digest, variables, logs et migrations du compte doivent encore être vérifiés. Ne pas basculer la production frontend avant le backend compatible.

Sondes publiques rejouées : premier live Render timeout 45 s, deuxième HTTP 200 ; readiness et toutes les routes Pages demandées HTTP 200 après réveil. Version toujours 15af09af532b0b2bfa2f030766405ba0ca75abf4 ; availability absent du contrat public. Cela étaye un démarrage à froid pendant cette observation, sans démontrer la cause de tous les 503 historiques. Aucune écriture distante effectuée.
