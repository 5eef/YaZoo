# Plan de deploiement Azure YaZoo - reinitialisation showcase

> **Status:** Validated

Generated: 2026-08-09T18:20:00+01:00

---

## 1. Project Overview

**Goal:** remettre a zero la base Azure `yazoo`, appliquer les migrations du
depot courant et installer un jeu de comptes/contenus fictifs permettant de
presenter YaZoo a des investisseurs.

**Path:** MODIFY - maintenance destructive bornee d'une application Azure
existante.

**Autorisation destructive recue le 2026-08-09:** suppression definitive de la
base `yazoo` sur `yazoo-mysql-0c2b09`, application cible `yazoo-api`, medias a
conserver.

**Hors cible:** serveur MySQL, autres bases systeme, Web App frontend `yazoo`,
plan App Service, Redis, Key Vault, Application Insights et contenu de
`/home/site/yazoo-storage`.

## 2. Requirements

| Attribute | Value |
| --- | --- |
| Classification | Showcase / demonstration publique controlee |
| Scale | Small |
| Budget | Cost-optimized, aucune nouvelle ressource permanente |
| Subscription | Azure for Students (`0c2b0918-f196-4a63-a235-1d7674aff317`) |
| App location | Germany West Central, ressource existante |
| Database location | Sweden Central, serveur existant |
| Resource group | `yazoo-rg` |
| API | `yazoo-api` |
| Database server | `yazoo-mysql-0c2b09` |
| Database | `yazoo` |
| Media policy | Conserver tous les fichiers persistants existants |
| Source images | `C:\Users\seef7\OneDrive\Desktop\imgs` (21 PNG valides) |
| External payments | CMI/SMS/OAuth reels exclus sans secrets sandbox et autorisation separee |

## 3. Current State Verified

| Item | Observation |
| --- | --- |
| Git branch | `fix/free-production-readiness` |
| Git HEAD | `1bf8d99ccfe8d1bdff05b0c886ea1c781f0a5a63` |
| Laravel migrations | 62 fichiers; derniere migration `2026_08_08_000100_track_account_deletion_purge.php` |
| Web App | `yazoo-api`, Running, HTTPS only |
| Current image | `5eef/yazoo-api:latest` (mutable; a conserver pour rollback court) |
| App database setting | `DB_DATABASE=yazoo` |
| Persistent storage | `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true` |
| Migration startup flag | actuellement `YAZOO_RUN_MIGRATIONS=true`; sera remis a `false` apres bootstrap |
| MySQL | Ready, MySQL 8.0.21, Standard_B1ms, 32 GiB, auto-grow |
| Azure backups | 7 jours, geo-redondance desactivee |
| User databases | `yazoo` uniquement |
| MySQL network | acces public active; seule la regle Azure-services `0.0.0.0` existe |

Les deux fichiers utilisateur non suivis restent hors cible et ne seront ni
modifies ni supprimes :

- `AUDIT_PROFESSIONNEL_COMPLET_YAZOO_2026-08-02.md`
- `backend/storage/framework/manual-backend.ps1`

## 4. Components Detected

| Component | Type | Technology | Path |
| --- | --- | --- | --- |
| API | Containerized API | Laravel 12 / PHP 8.4 / Nginx | `backend/` |
| Frontend | SPA | React / Vite | `frontend/` |
| Runtime | Supervised multi-process container | PHP-FPM, Nginx, queue, scheduler | `backend/startup.sh` |
| Demo marketplace | Transactional/idempotent seeder | Laravel | `backend/database/seeders/MarketplaceTestSeeder.php` |
| Demo social | Seeder | Laravel | `backend/database/seeders/DemoContentSeeder.php` |
| Deployment | Imperative IaC | Azure CLI / PowerShell / Docker | `deploy/` |

No Copilot SDK, Azure Functions, Aspire, Terraform or Bicep change is involved.

## 5. Recipe Selection

**Selected:** AZCLI.

**Rationale:** YaZoo utilise deja Azure CLI, Docker Hub et App Service. Le
workflow imperatif permet de nommer chaque cible, de faire un dry-run, de creer
la sauvegarde avant suppression et de nettoyer la regle reseau temporaire meme
en cas d'echec.

## 6. Architecture and Safety Design

### Permanent resources

Aucune nouvelle ressource Azure permanente. La base `yazoo` est supprimee puis
recreee sur le meme serveur. `yazoo-api` reste sur le plan B1 existant.

### Immutable deployment image

1. Construire l'image normale depuis `backend/Dockerfile`.
2. Construire une couche showcase distincte qui copie les 21 images via un
   contexte Docker externe; les images ne sont pas ajoutees au depot Git.
3. Publier un tag unique `5eef/yazoo-api:showcase-YYYYMMDD-HHMMSS-1bf8d99`,
   refuser tout ecrasement puis deployer le digest `sha256` resolu.
4. Garder la valeur de l'image precedente pour rollback de l'application.

Le build complet reste le chemin par defaut. Si le client BuildKit complet est
bloque mais qu'une image de base locale vient d'etre construite et validee avec
le meme lockfile, `-ExistingValidatedBaseImage` peut la reutiliser. La couche
showcase recopie explicitement tous les fichiers runtime modifies, regenere
l'autoload et relance la decouverte des packages avant ses tests conteneur.

### Production showcase bootstrap guard

Le seeder local existant reste refuse en production par defaut. Une execution
showcase exige simultanement :

- une option de commande explicite;
- `YAZOO_SHOWCASE_BOOTSTRAP_ENABLED=true`;
- l'environnement `production`;
- l'hote applicatif exact `yazoo-api.azurewebsites.net`;
- le serveur exact `yazoo-mysql-0c2b09.mysql.database.azure.com`;
- la base exacte `yazoo`;
- MySQL comme pilote;
- le dossier d'images integre en lecture seule;
- un mot de passe showcase fort fourni par secret, jamais journalise.
- un secret TOTP et huit codes de recuperation generes localement, transmis
  temporairement puis retires des App Settings apres le bootstrap.

Apres succes, `YAZOO_SHOWCASE_BOOTSTRAP_ENABLED`,
`YAZOO_RUN_SHOWCASE_BOOTSTRAP` et `YAZOO_RUN_MIGRATIONS` sont remis a `false`,
puis l'application est redemarree et revalidee.

Le compte administrateur showcase est marque MFA confirme avant le preflight.
Le secret TOTP et les codes de recuperation ne sont conserves que dans le
fichier local de credentials protege par ACL.

### Backup and rollback

1. Detecter l'IP publique actuelle.
2. Creer une regle pare-feu MySQL temporaire limitee a cette IP `/32`.
3. Arreter `yazoo-api` pour figer les ecritures.
4. Creer un dump logique complet avec transaction coherente dans
   `%LOCALAPPDATA%\Temp`, hors du depot, permissions Windows limitees au compte
   courant; ne jamais afficher son contenu.
5. Verifier uniquement l'existence, la taille non nulle et le code retour.
6. Configurer l'image et les drapeaux de bootstrap pendant que l'application est
   arretee, afin de prouver les droits App Service avant le DROP.
7. Supprimer/recreer `yazoo` seulement apres cette preuve.
8. Vider uniquement le cache applicatif et les files Laravel via leurs
   connexions configurees; ne jamais executer `FLUSHALL` sur Redis.
9. En cas d'echec avant suppression, redemarrer l'image precedente.
10. En cas d'echec apres suppression, restaurer le dump dans `yazoo`; le PITR
   Azure de 7 jours reste un second recours qui cree un serveur temporaire
   facturable.
11. Supprimer la regle pare-feu temporaire dans un bloc de nettoyage, meme en cas
   d'echec. Le dump n'est jamais supprime sans nouvelle confirmation.

### Media preservation

Le script ne lance aucune commande de suppression dans `/home/site` ou
`/home/site/yazoo-storage`. Les nouveaux fichiers showcase utilisent des chemins
dedies/idempotents. Les anciens fichiers sans ligne SQL correspondante pourront
devenir orphelins, mais restent conserves conformement a l'autorisation.

## 7. Provisioning Limit Checklist

| Resource Type | Number to Deploy | Total After Deployment | Limit / Quota | Notes |
| --- | ---: | ---: | --- | --- |
| `Microsoft.Web/sites` | 0 | 2 existantes | Limite du plan existant | Pas de nouvelle Web App |
| `Microsoft.DBforMySQL/flexibleServers` | 0 | 1 | SKU existant | Pas de nouveau serveur |
| Base utilisateur MySQL | remplacement 1 pour 1 | 1 | stockage partage 32 GiB | Aucun cout fixe additionnel |
| App Service instances | 0 | 1 B1 | plan existant | Pas de scale-up |
| Key Vaults | 0 | 1 existant | ressource existante | Aucun nouveau coffre |

**Status:** aucune capacite Azure supplementaire n'est provisionnee. Le seul
cout potentiel de rollback serait un serveur PITR temporaire, qui ne sera pas
cree sans une nouvelle autorisation.

## 8. Execution Checklist

### Phase 1: Planning

- [x] Analyser le depot et les migrations.
- [x] Confirmer abonnement, regions et ressources existantes.
- [x] Verifier l'etat du serveur, la retention de sauvegarde et la cible DB.
- [x] Recevoir la confirmation destructive exacte.
- [x] Definir le perimetre de conservation des medias.
- [x] Obtenir l'approbation du present plan complet (2026-08-09).

### Phase 2: Preparation locale

- [x] Ajouter le bootstrap showcase strictement garde.
- [x] Rendre le contenu social relancable sans duplication ou corruption.
- [x] Ajouter le Dockerfile showcase utilisant un contexte d'images externe.
- [x] Ajouter le script de reset avec dry-run par defaut, cibles exactes,
  nettoyage reseau et codes de sortie explicites.
- [x] Ajouter les tests des gardes et de l'idempotence; le chemin de restauration
  est valide statiquement et reste a exercer sur une base jetable.
- [x] Executer tests backend/frontend, audits, build Docker et scan de secrets.
- [x] Mettre le plan a `Ready for Validation`.

### Phase 3: Azure validation

- [x] Invoquer `azure-validate`.
- [x] Azure CLI installee et fonctionnelle.
- [x] Authentification et abonnement exact.
- [x] Compilation Bicep: N/A, aucun template Bicep dans cette recette AZCLI.
- [x] Validation ARM/Bicep: N/A, aucune ressource permanente provisionnee.
- [x] Preview: dry-run du script PowerShell sans mutation.
- [x] Docker build et bootstrap dry-run.
- [x] Azure Policy et roles disponibles pour les operations bornees.
- [x] Valider le dry-run, l'acces Docker local, l'image immutable et les permissions
  Azure sans mutation destructive.
- [x] Valider l'acces a la configuration du mot de passe DB sans l'afficher.
- [x] Valider les commandes dump/restore sur MySQL jetable; la connexion Azure
  reste un gate bloquant execute avant le DROP.
- [x] Enregistrer les preuves et passer le plan a `Validated` uniquement si tout
  passe.

### Phase 4: Deployment and reset

- [ ] Invoquer `azure-deploy`.
- [ ] Construire/publier l'image immutable.
- [ ] Creer la regle MySQL temporaire `/32`.
- [ ] Arreter `yazoo-api`.
- [ ] Sauvegarder `yazoo` et verifier la sauvegarde.
- [ ] Supprimer puis recreer seulement la base `yazoo`.
- [ ] Demarrer l'image showcase avec migrations et bootstrap actives.
- [ ] Purger cache et files Laravel sans `FLUSHALL` Redis.
- [ ] Desactiver les trois drapeaux one-shot et redemarrer.
- [ ] Verifier migrations, comptes, contenus et endpoint de sante.
- [ ] Tester login, profil, post, commentaire, like, annonce, service,
  reservation et paiement manuel sans fournisseur externe.
- [ ] Supprimer la regle pare-feu temporaire.
- [ ] Conserver le dump jusqu'a une confirmation ulterieure.
- [ ] Passer le plan a `Deployed` et reporter l'URL HTTPS.

## 9. Validation Proof

Cette section doit etre finalisee par `azure-validate`. Les preuves locales de
preparation sont enregistrees ci-dessous; aucun succes Azure n'est encore
revendique.

| Check | Command Run | Result | Timestamp |
| --- | --- | --- | --- |
| Backend suite | `php artisan test --compact` | PASS - 366 tests, 2019 assertions | 2026-08-09 18:00 +01:00 |
| Composer manifest | `composer validate --strict` | PASS | 2026-08-09 17:01 +01:00 |
| Composer security | `composer audit --locked` | PASS - 0 advisory | 2026-08-09 17:02 +01:00 |
| Frontend lint/typecheck/tests/build | `npm run lint`, `npm run typecheck`, `npm run test -- --run`, `npm run build` | PASS - 128 tests | 2026-08-09 17:04 +01:00 |
| npm security | `npm audit` | PASS - 0 vulnerability | 2026-08-09 17:04 +01:00 |
| Compose | `docker compose config --quiet` | PASS | 2026-08-09 17:04 +01:00 |
| Backend Docker build | `docker build ... backend/Dockerfile` | PASS | 2026-08-09 17:00 +01:00 |
| Showcase Docker build | `docker build --build-context showcase_images=...` | PASS - exactly 21 PNG | 2026-08-09 17:01 +01:00 |
| Container bootstrap dry-run | `docker run ... yazoo:bootstrap-azure-showcase --dry-run` | PASS - 21 images, no DB write | 2026-08-09 17:01 +01:00 |
| Secret diff scan | local masked scan | PASS - 0 unsafe assignment | 2026-08-09 17:04 +01:00 |
| Azure CLI/auth | `az account show` | PASS - Azure for Students, abonnement exact, Enabled | 2026-08-09 17:05 +01:00 |
| Existing targets | `az webapp show`, `az mysql flexible-server show/db list` | PASS - API Running, MySQL Ready, base `yazoo` unique | 2026-08-09 17:05 +01:00 |
| Current API health | `curl https://yazoo-api.azurewebsites.net/health/live` | PASS - HTTP 200 | 2026-08-09 17:07 +01:00 |
| App target settings | masked `az webapp config appsettings list --query ...` | PASS - URL, DB host/name exact; DB credentials configured | 2026-08-09 17:06 +01:00 |
| Azure Policy | ARM REST policy assignment query | PASS - allowed regions include Germany West Central and Sweden Central | 2026-08-09 17:09 +01:00 |
| RBAC at resource group | ARM REST role assignment/definition queries | PASS - Owner and User Access Administrator assignments exist; effective mutations remain gated before DROP | 2026-08-09 17:10 +01:00 |
| Script syntax/preview | PowerShell parser + `azure-showcase-reset.ps1` without `-Execute` | PASS - no mutation/file creation | 2026-08-09 17:08 +01:00 |
| MySQL rollback | disposable `mysql:8.4.10` dump, DROP/CREATE, restore, probe | PASS - `1:preserved` restored | 2026-08-09 17:12 +01:00 |
| First deployment attempt | guarded PowerShell script | SAFE FAIL before push or Azure mutation: expected missing Docker manifest was promoted to a terminating native error; manifest probe corrected | 2026-08-09 18:00 +01:00 |
| Live Azure DB connection/dump | guarded deployment step | NOT RUN - remains a mandatory pre-DROP gate | 2026-08-09 18:00 +01:00 |

**Validated by:** azure-validate workflow

**Validation timestamp:** 2026-08-09 17:12 +01:00

## 10. Files Planned

| File | Purpose | Status |
| --- | --- | --- |
| `.azure/deployment-plan.md` | Source de verite du reset | Ready for Validation |
| `backend/app/Console/Commands/BootstrapAzureShowcase.php` | Orchestration idempotente et rotation du mot de passe demo | Complete |
| `backend/app/Support/ShowcaseBootstrapGuard.php` | Validation exacte de la cible production | Complete |
| `backend/database/seeders/MarketplaceTestSeeder.php` | Autorisation production bornee sans affaiblir le mode local | Complete |
| `backend/config/operations.php` | Configuration cache-compatible des gardes | Complete |
| `backend/startup.sh` | Bootstrap et nettoyage runtime one-shot | Complete |
| `backend/.env.example` | Variables documentees sans valeur sensible | Complete |
| `backend/Dockerfile.showcase` | Couche de 21 images externe au depot | Complete |
| `backend/tests/Feature/Marketplace/AzureShowcaseBootstrapTest.php` | Idempotence, mot de passe, refus d'une base non vide | Complete |
| `backend/tests/Unit/Support/ShowcaseBootstrapGuardTest.php` | Matrice des gardes de cible | Complete |
| `deploy/azure-showcase-reset.ps1` | Backup, reset, deploy, rollback et cleanup | Complete |

## 11. Explicit Exclusions

- Aucun push GitHub, merge ou PR.
- Aucune suppression de media.
- Aucune suppression du serveur MySQL, Web App, plan, Redis ou Key Vault.
- Aucune rotation d'un secret existant.
- Aucun paiement CMI, SMS, SMTP ou OAuth reel.
- Aucun test destructif sur MySQL local 3306 ou MariaDB 3307.
- Aucun effacement du dump de sauvegarde sans confirmation.

## 12. Approval Gate

L'autorisation de supprimer `yazoo` et l'approbation du plan complet ont ete
recues le 2026-08-09. La suppression reste conditionnee a la reussite de la
preparation locale et de `azure-validate`.
