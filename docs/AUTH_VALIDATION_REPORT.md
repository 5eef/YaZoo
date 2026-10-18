# Validation finale de l'authentification

Date : 16 octobre 2026. Ce rapport complète `docs/AUTH_PRESERVATION_REPORT.md`, lu et conservé. Les anciens blocages PHP sont levés pour cette validation locale.

## Environnement PHP et isolation

Trois exécutables PHP ont été trouvés lors de la recherche des installations sur le volume C: :

| Exécutable | Version | Utilisation |
| --- | --- | --- |
| `C:\Users\seef7\.config\herd-lite\bin\php.exe` | **8.5.11** | Tous les tests Laravel et les contrôles Composer/Pint de cette intervention. |
| `C:\xampp\php\php.exe` | 8.2.12 | Incompatible ; non utilisé pour les tests. Version relevée dans les métadonnées du fichier. |
| `C:\xampp\php\windowsXamppPhp\php.exe` | 8.2.12 | Incompatible ; uniquement interrogé pendant l'inventaire. |

Herd Lite possède `pdo_sqlite` et `sqlite3`. Composer 2.10.3 fonctionne avec ce PHP et `check-platform-reqs` valide toutes les exigences installées. Aucune installation, réinstallation ou mise à jour de dépendances n'a été effectuée.

Avant les tests, `backend/bootstrap/cache` contenait uniquement `.gitignore`, `packages.php` et `services.php`, sans cache de configuration. Aucun cache existant n'a été supprimé. Les commandes ont également utilisé un chemin `APP_CONFIG_CACHE` local inexistant, uniquement dans leur processus, pour empêcher le chargement d'une configuration persistante.

Les processus de test imposaient `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` et des URL de base vides. `phpunit.xml` force ces réglages, y compris désormais `DB_URL`. Le garde-fou de `Tests\TestCase` refuse `RefreshDatabase` si l'environnement, la connexion, la base ou l'URL SQLite ne respectent pas cette isolation. Il s'exécute avant les migrations des tests.

Les tests n'héritent plus des options Reverb ou R2 locales : documents sur disque privé local, profil local, contrôles Reverb et uploads showcase désactivés par défaut, credentials et endpoint R2 vides. Les tests spécialisés configurent eux-mêmes leurs valeurs fictives. Aucun changement de configuration de production n'en résulte.

## Causes confirmées et régressions

Les chemins de remplacement de hashes décrits dans le rapport précédent sont confirmés par la lecture du code et les tests de conservation : seeder marketplace, bootstrap showcase, synchronisation au démarrage et initialisation de l'administrateur. Les corrections précédentes sont conservées ; aucun de ces chemins corrigés ne réécrit désormais un mot de passe existant.

La première exécution ciblée a réellement donné **70 PASS / 2 FAIL** :

1. Le test DATABASE #2 comparait le modèle juste créé par une factory avec une ligne relue depuis SQL. Les colonnes par défaut, l'ordre et le type brut du booléen différaient, sans changement de mot de passe. La référence est désormais elle aussi relue depuis SQL.
2. Le seeder social rejoué tentait de recréer une conversation unique déjà présente. Il s'arrête désormais sans écriture quand son compte d'ancrage `admin@yazoo.ma` existe. Il ne rejoue plus le contenu ni les credentials d'un jeu déjà initialisé.

La première suite complète a donné **457 PASS / 8 FAIL** : santé du serveur (2), documents professionnels (5), politique R2 (1). Les tests héritaient d'options locales pour les services hébergés au lieu de disposer de leurs propres valeurs. L'isolation explicite dans `phpunit.xml` corrige ces huit échecs sans changement des services applicatifs. Les exécutions finales ne présentent plus d'échec.

## Fichiers réellement modifiés pendant cette intervention

Les modifications déjà présentes au début ont été préservées. Cette liste décrit uniquement les ajouts de cette intervention, et non l'ensemble du diff Git préexistant.

| Fichier | Modification de cette intervention |
| --- | --- |
| `backend/database/seeders/DemoContentSeeder.php` | Retour sans écriture lorsque le compte d'ancrage existe ; évite les doublons et l'échec au second passage. |
| `backend/phpunit.xml` | Isolation des paramètres Reverb/R2/documents et neutralisation de `DB_URL`. |
| `backend/tests/TestCase.php` | Refus supplémentaire d'une URL SQLite non vide avant `RefreshDatabase`. |
| `backend/tests/Feature/Marketplace/Database2TestDataBootstrapTest.php` | Correction de la référence SQL du test ; nouveau scénario de marqueur persistant avec utilisateur ajouté après initialisation. |
| `backend/tests/Feature/Marketplace/ShowcaseBootstrapTest.php` | Nouveau parcours inscription, connexion, déconnexion, reconnexion et simulation du redémarrage ; vérification du vétérinaire et conservation intégrale des comptes. |
| `docs/AUTH_VALIDATION_REPORT.md` | Présent rapport. |

Aucun fichier frontend ou mobile, secret, fichier d'environnement applicatif ou lockfile n'a été modifié pendant cette intervention. Aucun commit ni push effectué.

## Résultats finaux réellement exécutés

| Vérification | Statut | Résultat |
| --- | --- | --- |
| Tests Laravel ciblés | **PASS** | **74 tests, 527 assertions**, code 0. Auth API et mobile, cookies/CSRF/Sanctum, inscription, bannissement, seeders, les trois bootstraps, refus de synchronisation et garde-fous de cible. |
| Suite Laravel complète | **PASS** | **466 tests, 2 697 assertions**, code 0, 17,70 secondes. Inclut les 74 tests ciblés ; ne pas additionner ces deux nombres. |
| `vendor/bin/pint --test` | **PASS** | Contrôle complet, code 0 après formatage. |
| Composer `check-platform-reqs` | **PASS** | PHP 8.5.11 et toutes les exigences installées sont compatibles. |
| `node scripts/validate-startup-release-guards.mjs` | **PASS** | `startup-release-guards=PASS`. |
| `node scripts/validate-showcase-deployment.mjs` | **PASS** | `provider-neutral-showcase=ok`. |
| `git diff --check` | **PASS** | Aucun défaut d'espacement ; avertissements Git habituels de conversion CRLF/LF. |
| Connexion réelle Render du vétérinaire | **BLOCKED / non vérifiée** | Aucun identifiant réel autorisé utilisé, aucune intervention distante. |
| Démarrage complet du conteneur Render et tests TiDB réels | **Non exécutés** | Validation locale SQLite et contrôle du script ; aucune exécution contre l'hébergement. |

Les tests frontend et Playwright ne sont pas réexécutés ici, car aucun fichier frontend n'a changé pendant cette intervention. Leurs résultats historiques figurent dans le rapport précédent et ne sont pas présentés comme de nouvelles exécutions.

Commandes Laravel utilisées, avec le chemin explicite de PHP Herd et l'environnement isolé décrit ci-dessus :

```powershell
& C:/Users/seef7/.config/herd-lite/bin/php.exe artisan test --filter='AuthApiTest|MarketplaceDemoSeederTest|ShowcaseBootstrapTest|Database2TestDataBootstrapTest|ReleaseAdminBootstrapTest|ShowcaseBootstrapGuardTest'
& C:/Users/seef7/.config/herd-lite/bin/php.exe artisan test --compact
& C:/Users/seef7/.config/herd-lite/bin/php.exe vendor/bin/pint --test
& C:/Users/seef7/.config/herd-lite/bin/php.exe C:/Users/seef7/.config/herd-lite/bin/composer.phar check-platform-reqs
```

## Inscription, mots de passe et vétérinaire

Le nouveau test vérifie qu'un utilisateur s'inscrit avec son propre mot de passe, se connecte, se déconnecte avec révocation du token actif, puis se reconnecte. Après réexécution du bootstrap showcase terminé, il se reconnecte encore avec le même mot de passe. Celui-ci ne correspond pas au secret de démonstration.

La simulation recharge le gestionnaire de cache tout en conservant son stockage SQL en mémoire, confirme le marqueur `complete`, change uniquement le secret de démonstration dans la configuration du test, puis invoque à nouveau le bootstrap. Le bootstrap retourne succès avec « aucune écriture » malgré la présence de l'utilisateur inscrit. Les comptes sont comparés intégralement avant/après, hashes et timestamps compris.

Le compte `veterinaire.agadir@yazoo.test`, créé exclusivement dans cette base de test jetable, se connecte après cette simulation avec ses credentials initiaux. Son hash n'est pas modifié. Les scénarios marketplace et DATABASE #2 confirment également la préservation d'un compte préexistant avec un mot de passe distinct du mot de passe de démonstration.

Aucun mot de passe de compte local persistant ou hébergé n'a été modifié. Les comptes et données utilisés par les tests sont des fixtures SQLite en mémoire. Aucune donnée réelle ni aucun compte réel supprimé.

## Redémarrage, Render et TiDB

Sur une base initialisée dont le marqueur showcase est conservé, le bootstrap retourne avant le contrôle interdisant une initialisation sur une base contenant des utilisateurs. Les inscriptions ultérieures ne bloquent donc pas ce chemin de redémarrage. DATABASE #2 possède aussi un scénario de marqueur conservé avec compte ajouté après initialisation ; il retourne succès sans changer les comptes.

La suite couvre également la commande de renouvellement des disponibilités utilisée au démarrage, exécutée deux fois sur un jeu fictif isolé, ainsi que la réhydratation des médias. Le validateur du script confirme l'absence de synchronisation automatique des credentials. Le script de démarrage complet n'a pas été lancé avec une configuration Render réelle.

Le correctif ne demande aucune migration TiDB, réinitialisation de base, rotation de mot de passe ou changement de schéma. Aucune base persistante n'a été utilisée pour les tests. Aucune commande `migrate:fresh`, `db:wipe` ou `db:seed` n'a été lancée sur une base persistante. Aucun déploiement effectué.

## Risques et limites avant déploiement

- La conservation des marqueurs est nécessaire. Le marqueur showcase est actuellement dans le cache SQL ; une purge de ce cache, notamment avec `YAZOO_RESET_RUNTIME_STATE=true`, peut le retirer et faire refuser l'initialisation sur une base contenant déjà des utilisateurs. Ce cas n'est pas un redémarrage normal avec marqueur conservé. Aucune purge ni réparation de marqueur n'a été réalisée. Le marqueur DATABASE #2 est stocké dans `operation_markers`.
- Un bootstrap initial interrompu ou une base partiellement initialisée reste un cas de reprise manuelle ciblée. Le seeder social ne reconstruit pas un jeu incomplet si son compte d'ancrage existe déjà. Aucun contournement automatique ni suppression de données.
- Un hash remplacé avant ce correctif n'est pas restauré. La récupération éventuelle du compte vétérinaire hébergé nécessite un diagnostic et une autorisation distincts.
- Les garde-fous de cible restent actifs. Les options, confirmations, secrets de provisionnement et chemins attendus doivent rester cohérents pour le démarrage configuré. Aucun secret n'est affiché dans ce rapport.
- La suite complète passe avec PHP 8.5.11 et SQLite. Cela ne constitue pas une preuve d'exécution du conteneur PHP Render ou d'équivalence des comportements SQL MySQL/TiDB. Les tests MySQL optionnels ne sont pas exécutés, conformément à l'exigence SQLite de cette mission.

## Conclusion

**READY FOR DEPLOYMENT** pour le correctif d'authentification validé localement : exigences Composer satisfaites, 466 tests Laravel réussis, préservation des hashes, parcours d'inscription complet, redémarrage avec marqueurs conservés et contrôle Pint réussis.

Cette conclusion ne vaut ni autorisation de déployer ni validation d'un accès Render existant. Aucune opération de déploiement, de commit, de push ou de réparation distante n'a été effectuée. Les limites concernant les marqueurs, les initialisations partielles et les accès hébergés restent celles documentées ci-dessus.
