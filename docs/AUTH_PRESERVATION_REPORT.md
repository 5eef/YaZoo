# Rapport ? authentification et pr?servation des comptes

Validation locale du 16 octobre 2026. Aucun acc?s aux donn?es de production, aucune migration hors tests, aucun d?ploiement.

## A. Cause racine

Le code contenait plusieurs chemins capables de remplacer un hash valide :

- `MarketplaceTestSeeder::seedUsers` comparait le hash existant au mot de passe de d?monstration attendu, puis le rempla?ait si la comparaison ?chouait. Une modification volontaire du mot de passe ?tait donc annul?e au prochain seeding. Seul un administrateur de release particulier b?n?ficiait d'une exception.
- `BootstrapShowcase` appliquait une mise ? jour SQL du mot de passe ? tous les utilisateurs non administrateurs et renouvelait ceux des administrateurs. La liste des emails autoris?s ne prouvait pas qu'un compte existant ?tait encore fictif.
- `SyncShowcaseCredentials`, appel? par `backend/startup.sh`, r?appliquait le mot de passe commun aux comptes marqu?s DEMO lors du d?marrage.
- `BootstrapReleaseAdmin` rempla?ait aussi le mot de passe d'un administrateur existant lors de son initialisation MFA.

Ces chemins expliquent comment une connexion pouvait cesser de fonctionner apr?s un bootstrap ou un red?marrage. Leur ex?cution effective contre la base h?berg?e et l'?tat actuel du compte v?t?rinaire restent inconnus. Aucune connexion Render n'est d?clar?e r?par?e.

C?t? interface, un ancien message OAuth provenant de l'URL pouvait rester affich? en m?me temps qu'une nouvelle erreur de connexion par mot de passe.

## B. Corrections r?alis?es

| Fichier modifi? ou cr?? | R?le |
| --- | --- |
| `backend/database/seeders/MarketplaceTestSeeder.php` | Conserve int?gralement les utilisateurs existants, y compris hashes, bannissements et profils. Utilise `firstOrCreate` pour ?viter une r??criture lors d'une collision de cr?ation. Les credentials fournis ne servent qu'aux nouvelles insertions. |
| `backend/database/seeders/DemoContentSeeder.php` | R?utilise les comptes existants sans les modifier ; accepte les credentials initiaux pour les nouveaux comptes showcase. |
| `backend/app/Console/Commands/BootstrapShowcase.php` | Refuse le bootstrap initial si des utilisateurs existent. Supprime toute r??criture collective des mots de passe ; initialise les credentials ? la cr?ation uniquement. Les administrateurs nouvellement cr??s re?oivent un secret al?atoire distinct. |
| `backend/app/Console/Commands/BootstrapReleaseAdmin.php` | Pr?serve le hash existant lors de l'initialisation MFA. |
| `backend/app/Console/Commands/SyncShowcaseCredentials.php` | D?sactive l'ancienne synchronisation avec un refus explicite, sans acc?s ? la base. |
| `backend/startup.sh` | Supprime l'appel automatique ? cette synchronisation. |
| `scripts/validate-showcase-deployment.mjs` | V?rifie que le d?marrage n'appelle plus la synchronisation. |
| `backend/tests/TestCase.php` | Refuse les tests utilisant `RefreshDatabase` si la configuration effective n'est pas `testing` + SQLite `:memory:`, avant les migrations de test. |
| `backend/tests/Feature/Auth/AuthApiTest.php` | Ajoute la connexion apr?s inscription ; conserve les sc?narios de bons/mauvais identifiants, bannissement, d?connexion, cookies et CSRF/Sanctum d?j? pr?sents. |
| `backend/tests/Feature/Marketplace/MarketplaceDemoSeederTest.php` | Ajoute la comparaison int?grale des comptes avant/apr?s seeding marketplace et social, notamment apr?s un changement de mot de passe. |
| `backend/tests/Feature/Marketplace/Database2TestDataBootstrapTest.php` | V?rifie la conservation des comptes de test, m?me apr?s suppression du marqueur dans la base jetable et changement du secret de configuration. Adapte les attentes pour l'administrateur. |
| `backend/tests/Feature/Marketplace/ShowcaseBootstrapTest.php` | V?rifie le refus sur compte pr?existant autoris?, le refus de synchronisation et la stabilit? des hashes apr?s r?ex?cution avec un autre secret. |
| `backend/tests/Feature/ReleaseAdminBootstrapTest.php` | V?rifie que l'initialisation MFA conserve le hash existant. |
| `frontend/src/pages/LoginPage.jsx` | Bloque la soumission pendant l'envoi ou le r?veil ; masque l'ancien message OAuth pendant la requ?te et lorsqu'une nouvelle erreur existe. |
| `frontend/src/pages/LoginPage.test.jsx` | Tests des erreurs, du chargement, du r?veil, de la navigation, des locales FR/AR/EN, de l'absence de messages concurrents et de la soumission du formulaire d'inscription existant. |
| `frontend/e2e/auth-isolated.spec.js` | Trois sc?narios Chromium ? largeur mobile, FR/AR/EN, avec API intercept?e : erreur, nouvel envoi, bouton d?sactiv? et navigation. |
| `frontend/e2e/cold-start.spec.js` | Adapte le sc?nario obsol?te de page d'accueil pour v?rifier directement la connexion pendant le r?veil du serveur. |
| `docs/AUTH_PRESERVATION_REPORT.md` | Pr?sent rapport. |

Le formulaire de production `RegisterPage.jsx` et le service d'authentification ne sont pas modifi?s. Les changements mobile et les fichiers personnels pr?sents avant cette intervention n'ont pas ?t? modifi?s par ce travail.

## C. Pr?servation des donn?es

Aucun seeder ni bootstrap n'a ?t? ex?cut? sur une base persistante ou h?berg?e. Aucun utilisateur, hash ou contenu m?tier n'a ?t? supprim? ou r?par?. Aucun secret de configuration n'a ?t? lu ou affich?.

Les tests Laravel sont configur?s en SQLite en m?moire ; le nouveau garde-fou v?rifie aussi la configuration effective avant `RefreshDatabase`. Ils n'ont pas d?marr?, faute de runtime compatible. Les tests frontend utilisent des mocks ; tous les appels API des sc?narios Playwright ex?cut?s sont intercept?s. Aucun test destructif n'a touch? TiDB.

Les mises ? jour de hashes existants ont ?t? retir?es des chemins corrig?s. Les comptes marketplace existants conservent aussi leurs ?tats de suspension, bannissement, administration et liaison Google. Les garde-fous existants sur environnement, activation, confirmation et cible de base sont conserv?s. Aucun port local de base n'a chang?.

## D. R?sultats r?ellement ex?cut?s

| Validation finale | Statut | R?sultat r?el |
| --- | --- | --- |
| `php artisan test` via `C:/xampp/php/php.exe` | **BLOCKED** | **0 test Laravel ex?cut?** : Composer exige PHP >= 8.4.1 ; PHP disponible = 8.2.12. `php` n'est pas dans PATH. Docker ne dispose pas d'un daemon actif. Aucun contournement du contr?le Composer. |
| `vendor/bin/pint --test` via PHP XAMPP | **PASS** | Contr?le complet de style, code de sortie 0 apr?s formatage des fichiers modifi?s. Ce contr?le n'est pas un test fonctionnel Laravel. |
| Syntaxe PHP des fichiers modifi?s | **PASS** | 11 fichiers v?rifi?s avec `php -l`. |
| `npm.cmd run lint` | **PASS** | Code de sortie 0. |
| `npm.cmd run typecheck` | **PASS** | Code de sortie 0. |
| `npm.cmd run test -- --run` | **PASS** | **208 tests**, **55 fichiers**, 0 ?chec. |
| `npm.cmd run build` | **PASS** | Compilation et v?rification l?gale r?ussies. G?n?ration SEO statique ignor?e car `VITE_SITE_URL` n'est pas configur? localement. |
| Playwright auth mobile + r?veil | **PASS** | **4 tests Chromium**, 0 ?chec, ex?cution finale termin?e avec code 0 en 13,1 s. API simul?e, pas de validation backend r?elle. |
| `node scripts/validate-showcase-deployment.mjs` | **PASS** | `provider-neutral-showcase=ok`. |
| `node scripts/validate-startup-release-guards.mjs` | **PASS** | `startup-release-guards=PASS`. |

Sous PowerShell, `npm` r?sout initialement vers `npm.ps1`, bloqu? par la politique d'ex?cution ; les commandes ont ?t? ex?cut?es avec `npm.cmd`, sans modifier la politique syst?me.

La premi?re ex?cution Playwright a donn? trois succ?s et un ?chec : l'ancien test de r?veil attendait une carte ? Cold start animal ? que la page d'accueil actuelle n'affiche plus. Ce test a ?t? adapt? au formulaire de connexion puis r?ex?cut? avec succ?s. L'arr?t automatique du serveur Vite par le premier lanceur restait en attente sous Windows ; l'ex?cution finale a r?utilis? le serveur local avec `E2E_SKIP_WEBSERVER=true` et s'est termin?e normalement. Les sessions de serveurs lanc?es pour ces v?rifications ont ?t? interrompues. L'inspection des ?ventuels processus enfants restants est refus?e par les permissions Windows ; leur arr?t complet n'est pas confirm?.

Les sc?narios backend de connexion, inscription, bannissement, cookies, CSRF/Sanctum, seeders et bootstrap restent **? valider sous PHP >= 8.4.1**. Les checks syntaxe/style ne prouvent pas leur r?ussite. Les tests Playwright complets avec Laravel r?el sont **BLOCKED** par ce m?me runtime absent.

## E. D?ploiement

Aucun d?ploiement effectu?, aucune configuration distante modifi?e.

- **Render** : apr?s autorisation et validation Laravel, d?ployer le backend avec le script de d?marrage corrig?. Une modification du secret showcase ne changera plus les comptes existants. Une base partiellement initialis?e contenant des comptes sera refus?e par le bootstrap initial ; ne pas supprimer de comptes ou marqueurs pour forcer son passage. D?sactiver les bootstraps de d?monstration sur une base r?elle. Le bootstrap release-admin ne r?initialise plus le mot de passe d'un administrateur existant.
- **Cloudflare** : publier le build frontend corrig? apr?s autorisation. Aucun changement DNS ou cookie n'est requis par ce patch. Les cookies d'authentification et les contr?les CORS/CSRF restent en place.
- **TiDB** : aucune migration ni modification de donn?es n?cessaire au correctif de code. Aucune rotation collective de mots de passe. Une ?ventuelle r?paration de compte n?cessite une intervention cibl?e et autoris?e s?par?ment.

## F. V?rification s?re du compte v?t?rinaire

Pour `veterinaire.agadir@yazoo.test` :

1. **Base locale isol?e neuve** : ex?cuter les tests sous PHP compatible. Le sc?nario marketplace cr?e les comptes et v?rifie les credentials initiaux puis leur conservation apr?s changement volontaire. Ne jamais rediriger ces tests vers une base distante.
2. **Base locale d?j? utilis?e** : le mot de passe existant est d?sormais conserv?. Le mot de passe initial du seeder ou celui de l'environnement n'est pas une preuve du mot de passe actuel. Tester une seule connexion avec les identifiants connus du propri?taire, sans les mettre dans les logs ni dans une ligne de commande.
3. **Render/TiDB** : avec autorisation et les vrais identifiants fournis par le propri?taire, effectuer une connexion normale depuis le frontend autoris?. V?rifier le statut HTTP, l'absence de message contradictoire, le cookie HttpOnly/Secure/SameSite attendu, `/api/auth/me`, la navigation et la d?connexion. Ne pas exporter le cookie ni le hash. En cas d'?chec, un contr?le cibl? en lecture seule peut v?rifier existence du compte et bannissement/suspension ; il ne doit pas afficher le hash.

Le seeder et le bootstrap ne doivent jamais servir ? tester ou r?initialiser ce compte sur l'environnement h?berg?.

## G. Limites

Le patch emp?che les futures r??critures identifi?es ; il ne restaure pas un hash d?j? remplac?. Une r?paration cibl?e peut rester n?cessaire, via r?cup?ration individuelle ou intervention explicitement autoris?e. Aucune r?paration de donn?es existantes n'a ?t? ex?cut?e.

La validation fonctionnelle Laravel reste bloqu?e par PHP, donc les crit?res backend ne sont pas d?clar?s valid?s. Les tests navigateur valident l'interface avec API simul?e, pas Sanctum r?el ni les cookies de Render.

Les seeders restent des outils de contenu de d?monstration : une r?ex?cution peut synchroniser du contenu m?tier ou ajouter des exemples. La conservation des utilisateurs ne constitue pas une autorisation de lancer ces seeders sur une base r?elle. Le bootstrap showcase reste une initialisation en plusieurs ?tapes ; une interruption peut laisser un jeu partiel qui sera d?sormais refus? au lieu de r?initialiser les comptes.
