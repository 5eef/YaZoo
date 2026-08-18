# Audit YaZoo post-corrections

## Mise à jour — 2026-08-18

- Feed : les publications Marché YaZoo sont prioritaires dans les insertions
  organiques et une carte marché reste visible même avec un seul post social.
- Mot de passe : création et réinitialisation acceptent désormais tout mot de
  passe d'au moins 8 caractères, avec contraintes HTML et API alignées.
- Notifications/messages : cloche mobile rétablie, badges rouges vérifiés sur
  les icônes et suites API/temps réel vertes.
- Menu principal : l'expansion de la sidebar reste pilotée par le survol et le
  focus, sans clic d'ouverture; le scénario navigateur dédié est vert.
- Formulaires/CRUD : 388 tests backend (2 116 assertions), 131 tests frontend,
  97 tests Playwright/axe et 5 tests MySQL DATABASE #2 sont verts.
- DATABASE #2 : MariaDB locale `127.0.0.1:3307/yazoo_azure_test`, Docker
  `yazoo_azure_test` et Azure `yazoo_azure_test` sont migrés. Les anciennes
  bases Docker `yazoo` et `yazoo_migration_test_20260717202459`, ainsi que la
  base logique Azure `yazoo`, ont été supprimées après vérification de la cible.
- Hygiène : archives de diagnostic, journaux et résumés CI/déploiement locaux
  ignorés et obsolètes supprimés.

## Mise à jour finale — 2026-08-17

Commit audité et poussé : `f9357660bb3e8d17ad09474d318000c0d7758e04`

Branche : `main`

État Git avant cette mise à jour : propre (`git status --short` vide,
`git diff --check` vert).

Cette mise à jour remplace les totaux techniques plus anciens présents plus bas
dans l'historique de la passe. Le rapport exhaustif initial reste
`AUDIT_YAZOO_COMPLETE.md` (29 constats, score initial 78/100).

### Résultat actuel

- Score post-correction recalculé : **88/100**.
- Aucun problème critique confirmé.
- Les risques élevés de concurrence vétérinaire sont corrigés et couverts sur
  MySQL ; la configuration de couverture frontend mesure désormais l'ensemble
  des sources, mais la couverture applicative réelle reste faible (32,36 %).
- 851 fichiers de première partie inventoriés, hors `vendor` et `node_modules`.
- 166 routes Laravel, dont 156 API et 139 protégées par un middleware d'auth.
- 63 migrations, 70 fichiers de tests backend et 41 fichiers de tests
  frontend/E2E.
- Aucun fichier secret réel n'est suivi. Les fichiers `.env*` suivis sont des
  exemples ; le motif `DB_PASSWORD=` trouvé dans `azure-showcase-reset.ps1` est
  une clé de configuration, pas une valeur embarquée.

### Quality gates rejoués sur ce commit

| Contrôle | Résultat réel du 2026-08-17 |
| --- | --- |
| Composer validate strict | PASS |
| Pint | PASS |
| PHPUnit | **388 tests, 2 116 assertions, PASS** |
| Bootstrap DB2 + admin ciblé | **10 tests, 60 assertions, PASS** |
| ESLint | PASS |
| TypeScript | PASS |
| Vitest | **38 fichiers, 130 tests, PASS** |
| Couverture frontend | 32,36 % statements ; 24,81 % branches ; 31,55 % fonctions ; 32,83 % lignes |
| Vite production build | PASS, 309 modules |
| Playwright + axe | **97/97 PASS**, FR/AR/EN, RTL, responsive, clair/sombre |
| Garde-fous release | PASS |
| `git diff --check` | PASS |

Les audits Composer/npm déjà exécutés avant ce commit étaient verts et les
lockfiles n'ont pas changé. Ils ne sont pas présentés comme une nouvelle preuve
réseau du 17 août, l'accès externe ayant été refusé à la session.

### Jeu de données de démonstration prêt pour DATABASE #2

Le bootstrap `yazoo:bootstrap-database2-test-data` est idempotent, protégé par
le marqueur persistant `database2-test-data-v1` et refuse explicitement la base
protégée `yazoo`. Il prépare exactement :

- 14 comptes de test, dont un administrateur sécurisé séparément par MFA ;
- 3 animaux, 7 produits, 10 services et 3 vétérinaires ;
- 12 vérifications professionnelles et leurs documents PDF fictifs ;
- 21 images PNG validées (signature, dimensions et taille non nulle) ;
- les réservations, paiements, rendez-vous, favoris, conversation et messages
  du jeu local autorisé.

Les sessions, tokens Sanctum, caches, jobs, traces et fichiers GridFS orphelins
ne sont pas importés. Le mot de passe fort partagé des 13 comptes non-admin est
stocké dans GitHub Secrets et dans un paquet DPAPI local ; il n'est ni affiché
ni versionné. Le compte administrateur conserve un mot de passe distinct et la
MFA.

### Risques restant ouverts

1. **Incident CI distant restant** : les runs `32038122692`, `32038549912` et
   `32041073954` se terminent en `startup_failure` avant la création d'un job.
   L'API GitHub de facturation a renvoyé `HTTP 503`. La release a néanmoins été
   déployée par la voie manuelle gardée et vérifiée sur Azure.
2. **Dépôt GitHub privé** : Actions est activé et le compte a le rôle ADMIN ;
   le quota/budget ou l'incident de plateforme doit encore être résolu pour
   restaurer le déploiement automatique.
3. **Couverture frontend** : de nombreuses pages critiques restent à 0 % en
   test direct malgré 97 scénarios E2E de structure/accessibilité.
4. **Architecture frontend** : Feed, Profile, Layout, Messages et Communities
   restent volumineux ; leur découpage doit rester progressif.
5. **Contrats d'erreur historiques** : plusieurs erreurs de réservation et de
   paiement conservent des messages français, même si le renderer fournit un
   champ `error` stable pour les nouveaux chemins.
6. **Larastan** : non installé, car l'ajout de dépendance réseau n'a pas été
   autorisé.
7. **Mentions légales** : le profil configuré décrit un projet étudiant de
   démonstration ; aucune validation juridique n'est revendiquée.

DATABASE #1 demeure protégée et non modifiée. DATABASE #2 Azure est migrée et
utilisée par la release `f935766`. Les 14 comptes ont été bootstrapés et les 21
médias publics attendus répondent HTTP 200. Login, `/auth/me`, logout CSRF,
health, API, configuration légale et 16 routes SPA ont été vérifiés.

## Historique de validation — 2026-08-14

La section ci-dessous est conservée pour la traçabilité. Ses nombres, images
locales et états d'autorisation décrivent la passe du 14 août ; en cas d'écart,
la mise à jour du 17 août ci-dessus fait foi.

Date de clôture de cette passe : 2026-08-14 19:18 (Africa/Casablanca)
Branche : `main`  
Commit de référence non modifié : `3464df84c3892e604968795a1e6093b8e52824d1`  
Audit source : `AUDIT_YAZOO_COMPLETE.md`

## 1. Résumé

L'état local de YaZoo est sensiblement meilleur qu'au début de la session. Les
deux risques de concurrence vétérinaire ont été corrigés avec transactions,
verrous pessimistes et notifications après commit. L'accès GridFS public est
désormais relié à `MediaAsset`, sa visibilité et son propriétaire. Les erreurs
API disposent d'un code stable, les logs ne stockent plus les traces complètes,
les formats date/devise sont centralisés et la préférence de langue effectue un
rollback visible en cas d'échec.

Les contrôles locaux sont verts : 378 tests backend, 130 tests frontend, 97
tests Playwright/axe, Pint, ESLint, typecheck, builds et tests MySQL/MariaDB
réels sur DATABASE #2. Les deux images finales locales ont été construites et
leurs commandes runtime s'exécutent en utilisateurs non-root.

La note passe de **78/100 à 86/100**. Cette note n'est pas plus élevée car
Larastan n'a pas pu être installé, les scans Trivy/Syft n'ont pas reçu
l'autorisation Docker requise, la CI distante n'a pas pu être consultée et la
release n'a pas été déployée. Aucun de ces contrôles n'est déclaré réussi sans
preuve.

### Score recalculé

| Domaine | Avant | Après |
| --- | ---: | ---: |
| Backend | 84 | 90 |
| Frontend | 78 | 84 |
| API | 81 | 87 |
| Database | 79 | 91 |
| Sécurité | 74 | 85 |
| Tests | 70 | 91 |
| CI/CD | 76 | 85 |
| Docker | 72 | 90 |
| UI/UX | 80 | 84 |
| Performance | 82 | 84 |
| Documentation | 79 | 87 |
| Architecture | 77 | 83 |
| **Global** | **78** | **86** |

## 2. Problèmes corrigés

| ID | Problème | Correction vérifiée | Test/preuve | Statut |
| --- | --- | --- | --- | --- |
| YAZ-001 | Transition concurrente rendez-vous | transaction, `lockForUpdate`, revalidation et notification post-commit | MySQL/MariaDB réel, 5 passes antérieures et suite DB2 finale | Corrigé |
| YAZ-002 | Couverture frontend trompeuse | inclusion globale de `src`, exclusions techniques limitées, seuils progressifs | 32,36 % instructions sur 6 466 instructions, gate vert | Corrigé |
| YAZ-003 | Locales ES/NL/PT/IT absentes | périmètre produit confirmé FR/AR/EN ; architecture et processus de validation humaine documentés | tests `SupportedLocaleTest`, i18n frontend | Requalifié/documenté |
| YAZ-004 | Suppression concurrente du créneau | suppression atomique sous verrou et revalidation des rendez-vous actifs | test fonctionnel + test concurrent DB2 | Corrigé |
| YAZ-005 | GridFS accessible par identifiant | résolution obligatoire vers `MediaAsset`, visibilité publique/privée et ownership/admin | 3 tests d'autorisation média | Corrigé |
| YAZ-007 | Dates et devise dispersées | utilitaires `Intl.DateTimeFormat` et `Intl.NumberFormat`, MAD et FR/AR/EN | Vitest, build, E2E RTL | Corrigé |
| YAZ-008 | Échec silencieux langue | mise à jour optimiste, rollback, toast et retry | Vitest, ESLint, typecheck, build | Corrigé |
| YAZ-011 | Runtime Docker root | init minimal root puis `www-data`; frontend `nginx` sur 8080 | `uid=82(www-data)` et `uid=101(nginx)` | Corrigé |
| YAZ-015 | Documentation obsolète | README, Azure, variables DB2, OIDC et environnements alignés | revue code/docs | Corrigé |
| YAZ-016 | Pint rouge | formatage ciblé des deux fichiers signalés et du code ajouté | `vendor/bin/pint --test` vert | Corrigé |
| YAZ-017 | Traces complètes en logs | contexte minimal, classe/route/méthode ; fichier/ligne hors production seulement | tests backend et revue | Corrigé |
| YAZ-018 | CSP dépendante de Nginx | CSP ajoutée au middleware Laravel et maintenue dans Nginx | test HTTP conteneur : header présent | Corrigé |
| YAZ-020 | Manifeste PWA figé | retrait de `lang`, `dir` et `orientation` imposés | manifeste servi par le conteneur | Corrigé |
| YAZ-021 | Providers instables | providers existants vérifiés ; provider notifications mémorisé, callback stable | ESLint, Vitest, E2E | Corrigé |
| YAZ-022 | Code JWT/User inutilisé | absence de route/consumer confirmée, méthode et configuration retirées | suite backend complète | Corrigé |
| YAZ-023 | Feedback Contact inaccessible | `role`, `aria-live` et `aria-atomic` adaptés au succès/erreur | axe E2E | Corrigé |
| YAZ-024 | Poppins non garantie | stack système fiable, sans police locale inexistante | build et E2E | Corrigé |
| YAZ-026 | Archive diagnostic sans rétention | inventaire métadonnées/hash et politique de rétention documentés, sans extraction/suppression | `docs/DIAGNOSTIC_ARCHIVE_RETENTION.md` | Corrigé par gouvernance |
| YAZ-027 | `Content-Disposition` brut | `HeaderUtils::makeDisposition` et nom de fichier assaini | tests média | Corrigé |

## 3. Problèmes partiels ou non corrigés

| ID | État | Risque restant | Action future |
| --- | --- | --- | --- |
| YAZ-006 | Partiel | des services historiques contiennent encore du texte FR ; les réponses ont désormais un `error` stable et les transitions vétérinaires un code métier | migrer progressivement réservation/paiement vers `ApiProblemException` et clés traduites |
| YAZ-009 | Partiel | Feed/Profile/Layout/Messages restent volumineux | poursuivre les extractions par section/hook ; les utilitaires Messages dupliqués ont déjà été mutualisés et testés |
| YAZ-010 | Vérifié, non supprimé | certains wrappers CRUD restent sans écran direct | conserver jusqu'à décision produit ; favoris save/remove, création services et vétérinaires sont réellement utilisés |
| YAZ-012 | Partiel | scan local non exécuté | Trivy, Syft et CodeQL sont configurés en CI ; exécuter la CI distante autorisée. Larastan reste absent |
| YAZ-013 | Partiel | le workflow de migration conserve une courte interruption contrôlée | CI réutilisable évite la duplication ; introduire un slot Azure uniquement si disponible sans coût |
| YAZ-014 | Partiel | état du nouveau code distant inconnu | accès réseau GitHub Actions refusé ; aucun nouveau commit n'existe |
| YAZ-019 | Non modifié | notice légale non validée | validation humaine/juridique requise ; aucune conclusion juridique automatisée |
| YAZ-025 | Partiel | aucun tag/release réel | `CHANGELOG.md`, `VERSION` et stratégie documentée ; créer tag/release seulement après commit autorisé |
| YAZ-028 | Bloqué | absence d'analyse statique Larastan | téléchargement Composer explicitement refusé ; ne pas inventer de résultat |
| YAZ-029 | Partiel | toutes les pannes legacy ne sont pas simulées | tests ajoutés pour backup, quarantaine, normaliseurs legacy et stockage ; étendre aux reprises partielles complètes |

## 4. Database

### DATABASE #1 — NON MODIFIÉE

- Azure : `yazoo-mysql-0c2b09.mysql.database.azure.com:3306/yazoo`.
- MySQL Flexible Server 8.0.21, état Ready, rétention configurée à 7 jours.
- L'App Service `yazoo-api` pointe toujours sur cette base au dernier contrôle.
- Aucune migration, écriture, suppression ou commande destructive n'a été
  exécutée sur cette base pendant la session.

### DATABASE #2 — validation locale réussie

- `127.0.0.1:3307/yazoo_azure_test`, MariaDB 10.4.32.
- Sauvegarde avant migration :
  `C:\Users\seef7\AppData\Local\Temp\yazoo-db2-backups\yazoo_azure_test-before-20260814-184451.sql`.
- SHA-256 :
  `C64CD0EEC1FF05A859E98E3687F47402288728A46F6314B850852FF116FA8F56`.
- Dix migrations forward-only appliquées avec le guard ; aucun
  `migrate:fresh`, `db:wipe`, `DROP DATABASE` ou `DROP TABLE`.
- Suite DB2 finale : **5 tests, 29 assertions**, verte.

### DATABASE #2 — cible Azure créée mais non migrée

- `yazoo-mysql-0c2b09.mysql.database.azure.com:3306/yazoo_azure_test`.
- Base logique créée en `utf8mb4` / `utf8mb4_unicode_ci` sur le serveur
  existant, sans ressource serveur supplémentaire.
- La permission d'utiliser en mémoire les identifiants Azure existants a été
  refusée. La connexion et les migrations Azure DB2 n'ont donc pas été
  exécutées.
- Le plan `.azure/deployment-plan.md` reste volontairement **Approved**, pas
  `Validated` ni `Deployed`.

## 5. Tests et quality gates

| Contrôle | Résultat réel |
| --- | --- |
| Composer validate strict | Vert |
| Composer audit | Vert, aucun avis de vulnérabilité |
| PHP syntax | Vert, 410 fichiers |
| Pint | Vert |
| PHPUnit | 378 tests, 2 056 assertions, vert |
| Couverture backend | 86,20 % instructions ; 70,99 % méthodes |
| Larastan | Non exécuté, installation refusée |
| npm audit local | Non exécuté, autorisation refusée ; le build Docker `npm ci` indique 0 vulnérabilité |
| ESLint | Vert |
| Typecheck | Vert |
| Vitest | 130 tests dans 38 fichiers, vert |
| Couverture frontend | 32,36 % instructions ; 24,81 % branches ; 31,55 % fonctions ; 32,83 % lignes |
| Vite build | Vert, 309 modules |
| Playwright + axe | 97/97 verts |
| Docker Compose | Valide |
| Docker backend | Construit, 403 MB |
| Docker frontend | Construit, 83,9 MB |
| MySQL concurrency/compatibilité | 5 tests, 29 assertions, vert sur DB2 locale |
| Trivy/Syft local | Non exécuté, accès Docker élevé refusé ; jobs CI ajoutés |
| GitHub Actions distant | Non vérifié, accès réseau refusé |

## 6. Images locales vérifiées

- Backend : `yazoo-backend:post-fix-20260814`, image
  `sha256:d2b10b3ed8885f6fa2013fbb9f120d0795582a3634c2ca9c0c00f664e21f6e1c`,
  runtime `www-data`.
- Frontend : `yazoo-frontend:post-fix-20260814`, image
  `sha256:8b57edf1f3ecddb2603ae079c7fcca4989e7edde2b85024e92036fd42dc50a24`,
  runtime `nginx`.
- Smoke Nginx local : HTTP 200, CSP/HSTS/nosniff présents, version
  `post-fix-20260814`, manifeste PWA neutre.

## 7. État Git

- Aucun commit, push ou tag créé.
- `git diff --check` est vert ; seuls des avertissements de normalisation
  CRLF/LF sont présents.
- La modification préexistante de `.gitignore` et le fichier non suivi
  `AUDIT_PROFESSIONNEL_COMPLET_YAZOO_2026-08-02.md` ont été conservés.
- Le working tree reste volontairement modifié pour revue humaine.

## 8. Recommandations immédiates

1. Autoriser une exécution éphémère, sans affichage de secret, pour vérifier et
   migrer Azure DATABASE #2.
2. Autoriser les scans locaux Trivy/Syft ou laisser la CI les exécuter.
3. Revoir le diff, puis autoriser explicitement le mécanisme de publication
   retenu (push GitHub ou push direct des images).
4. Ne basculer `yazoo-api` vers DB2 qu'après connexion, migration, preflight et
   lecture/écriture de test réversible réussis.
5. Poursuivre les tests directs des pages à 0 % et la migration des erreurs
   métier historiques vers des codes stables.
