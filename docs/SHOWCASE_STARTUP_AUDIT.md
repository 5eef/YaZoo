# Audit final du démarrage showcase

16 octobre 2026. Rapports préalables lus et conservés : `AUTH_PRESERVATION_REPORT.md` et `AUTH_VALIDATION_REPORT.md`. Cette intervention traite uniquement la persistance du marqueur showcase. Aucune base distante consultée ou modifiée ; aucun déploiement, commit ou push.

## Cause exacte démontrée

`BootstrapShowcase` utilisait uniquement `Cache::store('database')` pour le marqueur `yazoo_showcase_bootstrap_v2=complete`. Un stockage SQL de cache reste un cache : `DatabaseStore::flush()` supprime les entrées de sa table. `cache:clear` avec le store `database` efface donc ce marqueur.

Dans `startup.sh`, `YAZOO_RESET_RUNTIME_STATE=true` provoquait cette purge **avant** le bootstrap. Avec `CACHE_STORE=database`, la base initialisée était ensuite considérée comme dépourvue de preuve d'initialisation. Le refus légitime de seeder une base contenant des utilisateurs faisait retourner le bootstrap en erreur ; `set -e` arrêtait le démarrage. La commande de renouvellement des disponibilités dépendait elle aussi du marqueur effaçable.

La reproduction exécutée sur SQLite en mémoire a donné **74 tests PASS et 1 FAIL** : le nouveau scénario purgeait réellement le cache SQL, puis recevait le refus « La base contient deja des comptes » au lieu du succès attendu. Le code applicatif n'a été modifié qu'après cette reproduction.

`BootstrapDatabase2TestData` utilise déjà la table durable `operation_markers` et ne présente pas ce défaut. `SyncShowcaseCredentials` reste désactivé et absent du démarrage. Ces deux commandes ne sont pas modifiées par cette intervention.

## Correction et fichiers modifiés

| Fichier | Rôle dans cette intervention |
| --- | --- |
| `backend/app/Support/ShowcaseBootstrapState.php` — nouveau | Stocke la preuve v2 dans `operation_markers`, avec la même clé, `completed_at` et une métadonnée de provenance. L'insertion est idempotente grâce à la clé primaire et `insertOrIgnore`. Conserve une lecture de compatibilité du cache historique. |
| `backend/app/Console/Commands/BootstrapShowcase.php` | Consulte d'abord le marqueur durable, après les garde-fous. Promeut un ancien marqueur v2 encore présent sans rejouer les seeders. Enregistre le marqueur durable après réussite de l'initialisation ou de l'ancienne mise à niveau v1, dans leur transaction existante. Précise que la reprise ne réécrit ni comptes ni contenu. |
| `backend/app/Console/Commands/RefreshShowcaseAvailability.php` | Accepte le marqueur durable après purge, avec compatibilité du marqueur historique. Ses garde-fous restent exécutés avant la lecture du marqueur. |
| `backend/startup.sh` | Place `cache:clear` après le bootstrap, afin de préserver l'ancien marqueur avant purge. La purge de queue préexistante conserve sa position avant le bootstrap ; aucune purge supplémentaire ajoutée. |
| `backend/tests/Feature/Marketplace/ShowcaseBootstrapTest.php` | Ajoute six scénarios : purge avec comptes inscrits, migration v2 historique, initialisation partielle, ancien marqueur déjà perdu, mauvaise cible, dry-run. Renforce aussi le scénario v1 avec une purge après mise à niveau. |
| `scripts/validate-showcase-deployment.mjs` | Vérifie l'ordre bootstrap → purge du cache → renouvellement des disponibilités. Les vérifications précédentes sont conservées. |
| `docs/SHOWCASE_STARTUP_AUDIT.md` — nouveau | Présent rapport et plan de transition. |

La table `operation_markers` existe déjà dans la migration `2026_08_17_000000_create_operation_markers_table.php` : clé primaire `key`, timestamp obligatoire `completed_at`, JSON `metadata` nullable. Aucune nouvelle migration de schéma n'est ajoutée.

Les corrections d'authentification précédentes, les inscriptions, le mobile, les logos et les candidatures ne sont pas modifiés. Toutes les modifications Git préexistantes sont conservées.

## Comportements garantis et limites de récupération

- **Premier bootstrap** : le marqueur durable n'est écrit qu'après les contrôles de complétude et la réussite de la transaction. Le miroir cache est conservé pour les anciens lecteurs.
- **Deuxième passage et redémarrage** : le marqueur durable évite toute réexécution du contenu, même avec des utilisateurs inscrits depuis l'initialisation. Il n'est pas réécrit à chaque passage.
- **Purge applicative** : elle efface le miroir historique, pas `operation_markers`. Le bootstrap et le renouvellement des disponibilités restent fonctionnels.
- **Ancien v2 encore présent** : après validation de la cible, seule la preuve de complétion est insérée dans `operation_markers`. Aucun compte ni contenu n'est recréé ou modifié. Les passages suivants ne créent pas de doublon de marqueur.
- **Ancien v1** : la mise à niveau stricte déjà existante est conservée, sans modification des mots de passe ; une fois réussie, sa preuve v2 devient durable. Un jeu v1 modifié reste refusé.
- **Initialisation partielle ou ancien marqueur déjà perdu** : une base non vide ne constitue jamais une preuve. Le bootstrap refuse sans écrire de marqueur ni rejouer les seeders. Aucune récupération automatique fondée sur les emails ou les nombres de lignes.
- **Mauvaise cible** : environnement, activation, confirmation, host applicatif, host MySQL et nom de base restent contrôlés avant toute promotion du marqueur. Le test de mauvaise cible utilise uniquement la connexion SQLite existante, sans connexion distante.
- **Dry-run** : aucune promotion du marqueur historique et aucune insertion de compte.

## Tests réellement exécutés

PHP utilisé : `C:\Users\seef7\.config\herd-lite\bin\php.exe`, version **8.5.11**. Tests exclusivement SQLite `:memory:` avec `APP_ENV=testing`, URL de base vide et chemin de cache de configuration inexistant imposés au processus. Le cache Laravel inspecté ne contient pas de configuration compilée. Aucun cache persistant existant supprimé.

| Validation finale | Résultat |
| --- | --- |
| Tests ciblés auth, seeders, bootstraps et garde-fous | **PASS — 80 tests, 575 assertions** |
| `php artisan test --compact` — suite Laravel complète | **PASS — 472 tests, 2 745 assertions**, code 0, 19,99 secondes |
| `vendor/bin/pint --test` | **PASS**, code 0 |
| Composer `check-platform-reqs` | **PASS** |
| `node scripts/validate-showcase-deployment.mjs` | **PASS — provider-neutral-showcase=ok** |
| `node scripts/validate-startup-release-guards.mjs` | **PASS — startup-release-guards=PASS** |
| Connexion réelle Render/TiDB ou redémarrage du conteneur hébergé | **Non exécutés** |

Les 80 tests ciblés sont inclus dans les 472 tests de la suite complète. Les six nouveaux tests et le scénario v1 renforcé couvrent notamment les hashes inchangés, l'absence de doublons, le cache SQL réellement purgé et le renouvellement idempotent des disponibilités après purge. Un échec intermédiaire du nouveau test de disponibilités venait d'une option d'activation absente de sa fixture ; elle a été explicitement activée dans ce test, sans assouplir le code applicatif.

## Préservation des mots de passe et des données

Le nouveau gestionnaire de marqueur ne lit ni n'écrit la table `users`. La promotion historique écrit seulement une ligne de contrôle de complétion et son miroir de cache. Les tests comparent intégralement les utilisateurs avant/après, hashes et timestamps compris. Aucun mot de passe existant n'est remplacé, aucun compte réinitialisé, aucune donnée métier supprimée.

Les purges exécutées sont uniquement celles du cache de la base SQLite jetable, dans les tests. Aucune commande de purge de queue, de suppression de base ou de seeding n'a été exécutée sur une base persistante.

## Compatibilité Render/TiDB et plan sûr avant déploiement

La solution réutilise des opérations SQL déjà utilisées pour DATABASE #2 : table existante, clé primaire, insertion idempotente et transaction. La validation réelle effectuée reste SQLite ; aucun résultat MySQL/TiDB distant n'est revendiqué.

La transition sur une base déjà hébergée nécessite potentiellement **l'insertion d'une ligne de métadonnées**. Cette opération n'a pas été exécutée. Plan à soumettre à autorisation avant toute intervention distante ou tout déploiement :

1. Vérifier en lecture seule la cible attendue et l'état de la migration existante créant `operation_markers`. Vérifier les permissions nécessaires. Si la table manque, faire examiner et autoriser séparément l'application de cette migration ; ne pas lancer toutes les migrations sans examen des opérations en attente.
2. Vérifier en lecture seule si la ligne durable v2 existe déjà ou si l'ancien marqueur cache v2 est encore exactement `complete`. Préserver cette preuve jusqu'à la première exécution du code corrigé ; empêcher une purge concurrente par un ancien processus pendant la transition. Conserver `YAZOO_RESET_RUNTIME_STATE=false` pour cette première transition est l'option la plus prudente, même si le nouvel ordre protège aussi le cas `true`.
3. Après autorisation du déploiement et de la transition, exécuter le démarrage corrigé sur la cible explicitement autorisée. S'il ne dispose que de l'ancien marqueur v2, le bootstrap enregistre sa preuve durable, sans comptes ni contenu modifiés. Vérifier ensuite la ligne de contrôle en lecture seule. Aucun secret ni hash ne doit être exporté.
4. Si les deux preuves ont déjà disparu, **arrêter le plan de promotion automatique**. Ne pas recréer un marqueur à partir de la seule présence de comptes ou de statistiques. Rechercher une preuve indépendante de complétion, examiner l'état de la base et proposer une éventuelle réparation strictement ciblée, à autoriser séparément. Ne supprimer ni compte ni marqueur pour forcer le bootstrap.
5. Ne pas revenir à un ancien démarrage qui ne connaît que le cache après une purge du miroir. Pour un rollback, conserver une version comprenant la lecture du marqueur durable ou faire examiner un plan de compatibilité spécifique.

`YAZOO_RESET_RUNTIME_STATE` inclut toujours la purge de queue préexistante ; cette fonction n'est pas étendue par le correctif et n'a pas été exécutée ici. La protection du marqueur n'autorise aucune purge de données ou de tâches en production.

Le correctif local est validé. Toute transition de métadonnées hébergées, réparation ciblée ou mise en production reste en attente d'une autorisation explicite. Aucun déploiement effectué.
