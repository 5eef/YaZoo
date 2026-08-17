# Plan de déploiement Azure YaZoo — release DATABASE #2

> **Status:** Validated

Mise à jour : 2026-08-14 (Africa/Casablanca)

## Objectif et autorisation

Déployer la release YaZoo courante sur les deux App Services existants en
utilisant une seconde base logique dédiée, sans modifier ni migrer la base de
production historique.

- DATABASE #1 protégée : `yazoo` sur
  `yazoo-mysql-0c2b09.mysql.database.azure.com:3306`.
- DATABASE #2 locale de validation : `yazoo_azure_test` sur
  `127.0.0.1:3307` (MariaDB 10.4.32).
- DATABASE #2 Azure cible : `yazoo_azure_test` sur le serveur MySQL Flexible
  Server existant, à créer seulement si elle est absente.
- Ressource Azure facturable supplémentaire : aucune; une base logique sur le
  serveur existant n'ajoute pas de serveur.

La demande utilisateur du 2026-08-14 autorise la création/configuration de
DATABASE #2 et le déploiement. Elle interdit tout `DROP`, `migrate:fresh`,
`db:wipe`, reset showcase ou migration sur DATABASE #1.

## État vérifié avant changement

| Élément | État |
| --- | --- |
| Groupe | `yazoo-rg` |
| Backend | `yazoo-api`, Running, HTTPS only |
| Frontend | `yazoo`, Running, HTTPS only |
| MySQL | `yazoo-mysql-0c2b09`, Ready, MySQL 8.0.21 |
| Base Azure existante | `yazoo` uniquement au contrôle initial |
| DB App Service initiale | `yazoo` (DATABASE #1) |
| Sauvegarde Azure | rétention et PITR à revalider immédiatement avant rollout |
| Déploiement | GitHub Actions + Docker Hub + Azure CLI/OIDC |

## Garde-fous obligatoires

1. `YAZOO_REQUIRE_EXPECTED_DATABASE=true`.
2. `YAZOO_EXPECTED_DB_HOST`, `YAZOO_EXPECTED_DB_PORT` et
   `YAZOO_EXPECTED_DB_NAME` doivent correspondre exactement à la connexion
   Laravel résolue.
3. `YAZOO_PROTECTED_DB_NAMES=yazoo` interdit toute migration sur DATABASE #1.
4. Le preflight de configuration s'exécute avant `yazoo:migrate-production`.
5. Les migrations sont uniquement forward-compatible; aucun rollback SQL
   automatique et aucune commande destructive.
6. Les secrets restent dans Azure App Settings/Key Vault/GitHub Secrets et ne
   sont ni affichés ni versionnés.

## Validation locale DATABASE #2

- Charger une configuration locale non suivie dérivée de
  `backend/.env.database2.example`.
- Vérifier host, port, nom, version et privilèges sans afficher le mot de passe.
- Exécuter `migrate:status`, puis `migrate --force --no-interaction` sous garde.
- Exécuter les tests d'intégration MySQL, dont les transitions rendez-vous et
  suppression de créneau concurrente.
- Ne nettoyer que les fixtures portant un identifiant unique créé par le test.

## Préparation Azure DATABASE #2

1. Revalider l'abonnement, le groupe, le serveur MySQL, les sauvegardes et les
   images actuellement déployées.
2. Vérifier que `yazoo_azure_test` est absente ou, si elle existe, inventorier
   son schéma avant toute migration.
3. Si elle est absente, créer uniquement la base logique `yazoo_azure_test` sur
   le serveur existant; ne jamais supprimer/recréer `yazoo`.
4. Tester la connexion avec le principal déjà configuré, sans révéler ses
   informations d'authentification.
5. Configurer les variables GitHub `AZURE_DATABASE2_HOST`,
   `AZURE_DATABASE2_PORT=3306` et `AZURE_DATABASE2_NAME=yazoo_azure_test`.

## Release

1. Tous les quality gates locaux et DB2 doivent être verts, ou un échec doit
   bloquer le rollout.
2. Construire les images avec un tag SHA Git immuable et produire SBOM/scans.
3. Enregistrer images et paramètres DB précédents pour rollback.
4. Arrêter brièvement le backend avant le switch de connexion afin qu'aucune
   requête de la nouvelle release ne touche DATABASE #1.
5. Configurer DATABASE #2 et les garde-fous, déployer l'image backend, exécuter
   une migration verrouillée, puis désactiver les migrations de démarrage.
6. Vérifier `/health/live`, `/health/ready`, la version et une lecture DB.
7. Déployer le frontend non-root (`WEBSITES_PORT=8080`) et vérifier
   `/version.json` puis les smoke tests.
8. Publier `latest` seulement après réussite complète.

## Rollback

- Conserver le tag backend/frontend précédent et les valeurs non sensibles
  `DB_HOST`, `DB_PORT`, `DB_DATABASE` précédentes.
- En cas d'échec du rollout, remettre les images précédentes et la connexion
  DATABASE #1 précédente avec migrations désactivées.
- Ne jamais annuler automatiquement les migrations DATABASE #2; le code de
  rollback doit être compatible avec le schéma étendu, sinon le rollback est
  bloqué et traité comme incident.
- DATABASE #2 est conservée pour diagnostic. DATABASE #1 reste inchangée.

## Role Assignment Verification

- Status: Verified for the existing non-IaC deployment.
- Static source: `.github/workflows/deploy.yml`; no Bicep/Terraform role
  assignment is present because this release reuses existing resources.
- Deploying identity: `yazoo-github-actions`, federated only for
  `repo:Seef590/YaZoo:environment:production` with the Azure token-exchange
  audience.
- Live least-privilege assignments confirmed:
  - Website Contributor scoped to `yazoo-api`;
  - Website Contributor scoped to `yazoo`;
  - Reader scoped to `yazoo-mysql-0c2b09` for backup/database validation.
- The workflow does not read Key Vault data-plane secrets and therefore does
  not require a Key Vault data role.
- Residual maintainability risk: RBAC is not declared as code. Exporting these
  existing assignments to Bicep is recommended after the release, without
  reprovisioning resources during this corrective rollout.
- Subscription policy observed: `sys.regionrestriction`; the release creates
  no resource and keeps the existing regions.

## Critères de validation

- [x] All validation checks pass.
  - [x] Azure CLI authentifié sur l'abonnement explicitement sélectionné `Azure for Students`.
  - [x] Ressources App Service, MySQL et DATABASE #2 inspectées sans mutation de DATABASE #1.
  - [x] Workflows GitHub validés par Actionlint et par les garde-fous de release.
  - [x] Backend validé par Composer, Pint et PHPUnit.
  - [x] Frontend validé par ESLint, TypeScript, Vitest, Vite et Playwright/axe.
  - [x] Images backend/frontend construites et démarrées réellement en non-root.
  - [x] Migrations et tests d'intégration exécutés sur MySQL 8 jetable, sans commande destructive.
  - [x] Les cinq secrets GitHub du premier administrateur DB2 sont configurés par
    le script garde-fou; son paquet de récupération DPAPI post-écriture est présent.
  - [x] La validation Azure pré-déploiement est terminée.
  - [ ] Le déploiement du SHA corrigé est terminé.
- [ ] CI backend/frontend verte.
- [x] Pint vert.
- [x] Analyse statique exécutée ou blocage documenté.
- [x] Docker Compose valide et images construites.
- [x] Processus durables des images exécutés non-root.
- [x] DATABASE #1 prouvée protégée.
- [x] DATABASE #2 locale migrée sans commande destructive.
- [x] Concurrence MySQL réelle verte.
- [x] DATABASE #2 Azure créée/accessible sans modifier DATABASE #1.
- [x] Variables de cible GitHub/Azure exactes.
- [ ] Health checks, API, auth et parcours critiques vérifiés.
- [ ] Plan de rollback documenté avec tags réels.

Le plan passe à `Validated` uniquement après validation locale, validation Azure
read-only et preuve de l'accès DATABASE #2. Il ne passe à `Deployed` qu'après
les vérifications post-déploiement réelles.

## Section 7: Validation Proof

Horodatage de la preuve locale et Azure : `2026-08-17T12:06:49+01:00`.

| Domaine | Commande/preuve | Résultat |
| --- | --- | --- |
| Composer | `composer validate --strict` | PASS |
| Dépendances PHP | `composer audit` | Réseau Packagist bloqué localement; dernier job GitHub avant correction PASS, à relancer sur le nouveau SHA |
| Format PHP | `vendor/bin/pint --test` | PASS |
| Backend | `php artisan test --compact` | PASS — 383 tests, 2 080 assertions |
| MySQL 8 jetable | `yazoo:migrate-production --force`, puis `migrate:status` | PASS — 60 migrations, cible distincte `127.0.0.1:13316/yazoo_release_validation` |
| Intégration MySQL | PHPUnit des cinq suites DB2/concurrence/bootstrap | PASS — 10 tests, 62 assertions |
| Frontend statique | ESLint, TypeScript, i18n et audit Tailwind | PASS — 1 964 clés identiques FR/AR/EN |
| Frontend tests | Vitest avec couverture | PASS — 38 fichiers, 130 tests |
| Frontend build | `npm run build` | PASS |
| Frontend audit | `npm audit --omit=dev` | PASS — 0 vulnérabilité |
| E2E/accessibilité | Playwright, axe, responsive, RTL, clair/sombre | PASS — 97 tests |
| Workflows | Actionlint et `node scripts/validate-release-guards.mjs` | PASS |
| Images | Builds backend/frontend + démarrage réel | PASS |
| Runtime | `/health/live`, `/version.json`, inspection des processus | PASS — backend `www-data`, frontend UID 101, aucun processus root |
| Démarrage production simulé | migrations → bootstrap admin MFA → preflight → queue/scheduler | PASS; stockage `/home/site` attendu absent uniquement hors Azure |
| Azure App Services | état, HTTPS, health path et images précédentes après rollback | PASS — les deux sites sont Running |
| Azure MySQL | état, version, sauvegarde/PITR et DB2 | PASS — Ready, MySQL 8.0.21, rétention 7 jours, `yazoo_azure_test` en `utf8mb4` |
| OIDC/RBAC | credential fédéré et affectations live | PASS — subject production exact, deux Website Contributor ciblés, Reader MySQL ciblé |
| Secrets admin DB2 | `scripts/configure-release-admin-secrets.ps1 -GenerateCredentials` | PASS — exécution propriétaire terminée; paquet DPAPI créé seulement après l’acceptation des cinq écritures GitHub |
| CI/déploiement corrigé | nouveau commit/SHA | PENDING — interdit avant validation des secrets |

La recette Azure CLI générique attend `infra/main.bicep`, absent de ce dépôt.
La validation a donc utilisé le mécanisme réel existant (GitHub Actions,
Azure CLI/OIDC, Docker Hub et deux App Services) sans inventer ni provisionner
une nouvelle infrastructure.
