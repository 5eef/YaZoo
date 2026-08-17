# Plan de déploiement Azure YaZoo — release DATABASE #2

> **Status:** Approved

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

## Critères de validation

- [ ] CI backend/frontend verte.
- [ ] Pint vert.
- [ ] Analyse statique exécutée ou blocage documenté.
- [ ] Docker Compose valide et images construites.
- [ ] Processus durables des images exécutés non-root.
- [ ] DATABASE #1 prouvée protégée.
- [ ] DATABASE #2 locale migrée sans commande destructive.
- [ ] Concurrence MySQL réelle verte.
- [ ] DATABASE #2 Azure créée/accessible sans modifier DATABASE #1.
- [ ] Variables de cible GitHub/Azure exactes.
- [ ] Health checks, API, auth et parcours critiques vérifiés.
- [ ] Plan de rollback documenté avec tags réels.

Le plan passe à `Validated` uniquement après validation locale, validation Azure
read-only et preuve de l'accès DATABASE #2. Il ne passe à `Deployed` qu'après
les vérifications post-déploiement réelles.
