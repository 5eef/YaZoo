# Publication publique YaZoo — 18 octobre 2026

## Décision

**NOT_DEPLOYED_BLOCKED**. Aucun commit, push, envoi Docker Hub, déploiement Render ou Pages n'a été effectué pendant cette mission. La publication reste bloquée par l'absence d'accès Render vérifiable et de preuves de sauvegarde/restauration TiDB. Un frontend seul n'a pas été publié.

## A. Références vérifiées

| Élément | Observation |
| --- | --- |
| Dépôt | `5eef/YaZoo`, session GitHub authentifiée, droits de publication confirmés |
| Branche de travail initiale | `startup-2026` |
| SHA de base | `3602ef610e14b8b2878b4935e308a455d5085995` ; distant `startup-2026` identique lors du contrôle |
| `main` local et référence distante | `f9d369af58235cf4e0ce191ef7fe51c082db60b3` |
| Candidat isolé | `release/public-2026-10-18`, worktree `output/public-release/source`, modifications non commitées |
| SHA de release | Aucun : le SHA de base ne représente pas les corrections non commitées |
| Image candidate locale | `yazoo-api-demo:candidate-public-2026-10-18`, linux/amd64, identifiant local `sha256:3f6524a9c2d2de3e1de87a315e466ba4c3e5f21400ddb6dae708e84cb3e8409b` ; aucun digest de registre publié |
| Image Docker Hub de release / digest | Non publiée ; non attribués |
| Render Service ID / Deploy ID / digest courant | Non vérifiés, accès indispensable manquant |
| Cloudflare Pages | Projet existant `yazoo-showcase`, publication Direct Upload, branche de production `startup-2026` |
| Déploiement Pages existant | `3520222f-de1a-4ac4-99ff-6eb7f636332d`, créé le 16 octobre 2026 à 16:01:14 UTC, SHA de base ci-dessus, dirty=false |
| Date de nouvelle publication | Aucune |

Le manifeste explicite sous `output/public-release/` exclut les modifications natives indépendantes, les logos, les candidatures, les secrets et les artefacts. Il est recalculé après la mise à jour Composer et ce rapport. Avant tout commit, contrôler de nouveau l'absence de divergence avec les fichiers sélectionnés. Ne pas employer l'empreinte initiale comme preuve de la version finale.

## B. Validations exécutées pendant cette mission

| Contrôle | Résultat et portée |
| --- | --- |
| Laravel, dépendances initiales | **PASS_LOCAL**, PHP 8.4.24, SQLite en mémoire, réseau Docker coupé : 480 tests, 2 830 assertions |
| Laravel après correctif Composer | **PASS_LOCAL**, `php artisan test --compact` : 480 tests, 2 830 assertions, 118,72 s, aucun avertissement dans la relance finale séquentielle ; réseau Docker coupé, SQLite en mémoire |
| Mémoire du lanceur | Le premier essai à 128 Mo a épuisé la mémoire ; PHPUnit complet passe avec 512 Mo pour le processus de test. Aucun changement de limite du serveur publié |
| Pint | **PASS_LOCAL**, 465 fichiers ; contrôle répété après mise à jour des dépendances |
| React/Vitest | **PASS_LOCAL**, 232 tests dans 60 fichiers sur le worktree candidat |
| ESLint / TypeScript / build React | **PASS_LOCAL** ; le build de validation n'est pas un artefact public approuvé, configuration Render encore inconnue |
| Traductions / classes Tailwind | **PASS_LOCAL**, 2 062 clés / 187 classes contrôlées |
| Playwright session/navigation | **PASS_LOCAL**, 33 tests, API interceptée : FR/AR/EN, clair/sombre, RTL, 320/375/768/1024/1440 px ; ne prouve pas le backend hébergé |
| Déconnexion Playwright | Profil personnel/public, feed, paramètres ; précédent/reload ; 419/429/503 ; cookie encore présent ; client → vétérinaire → client |
| Sécurité Composer corrigée | **PASS_LOCAL**, `composer audit --locked` : aucun avis après mise à jour ciblée |
| Sécurité npm | Cinq alertes HIGH dans l'outillage de build ; politique résiduelle existante satisfaite et contrôle runtime sans vulnérabilité. Le résultat brut npm n'est pas vert |
| Gitleaks | **PASS_LOCAL**, scan du répertoire candidat avec rédaction des secrets, aucune fuite détectée ; ne constitue pas un scan de tout l'historique Git |
| Garde-fous de release | **PASS_LOCAL**, validate-startup-release-guards, validate-showcase-deployment et deux tests de politique de dépendances |
| Mobile natif local | **PASS_LOCAL** pour 70 tests Node sur le dossier mobile initial, qui contient des changements indépendants exclus du candidat |
| Android/iOS sur appareil | **NOT_TESTED**, aucun appareil ADB connecté ; aucune publication native |
| Lint / types natifs locaux | **PASS_LOCAL** sur le dossier mobile indépendant ; aucune validation d'appareil ni publication native |
| Docker candidat | **PASS_LOCAL**, build linux/amd64 PHP 8.4.24, Nginx/PHP-FPM UID 82 ; live/ready HTTP 200 avant/après redémarrage ; 64 migrations SQLite et zéro utilisateur inchangés, aucun seeding |
| Trivy image candidate | **PASS_LOCAL**, Trivy 0.75.0, base téléchargée le 18 octobre 2026, contrôle HIGH/CRITICAL OS et Composer, code de sortie 0 ; preuve JSON sous `output/public-release/trivy-candidate.json` |
| CI GitHub | Verte pour le SHA de base uniquement ; **NOT_TESTED** pour le candidat non commité |

Les E2E Laravel/S3Mock antérieurs restent détaillés dans [SOCIAL_MARKETPLACE_E2E_VALIDATION.md](SOCIAL_MARKETPLACE_E2E_VALIDATION.md). Ils ne sont pas présentés comme une nouvelle exécution du candidat ou une validation hébergée.

## C. Services externes

| Service | État vérifié |
| --- | --- |
| GitHub | Session disponible ; workflow Docker Hub manuel existant, CI préalable et tag SHA immuable requis |
| Docker Hub | Configuration d'authentification locale présente et secrets de workflow nommés présents ; push candidat non effectué |
| Render | **BLOCKED_INFRASTRUCTURE** : aucun accès API/CLI utilisable trouvé ; demande d'accès sécurisé transmise, aucun secret demandé dans la conversation |
| TiDB | **BLOCKED_INFRASTRUCTURE** : aucune connexion distante utilisée ; cible réelle, TLS, inventaire, marqueurs, empreintes de préservation et sauvegarde restaurable non vérifiés |
| Pages | Accès Cloudflare authentifié et déploiement existant identifié ; page publique HTTP 200 dans Chromium |
| Functions | Liaison `BACKEND_ORIGIN` de type secret présente, valeur masquée ; `/api/legal/config` passe de 503 à 200 après réveil lors du second contrôle navigateur |
| R2 | Bucket existant correspondant à la configuration locale, endpoint de compte vérifié ; r2.dev désactivé, aucun domaine public activé ; voir validation ci-dessous |
| Redis / Reverb / workers / scheduler | **NOT_TESTED** sur l'hébergement ; aucune création de service ; polling HTTP conservé sans revendication WebSocket |
| Emails / SMS | Livraison réelle **NOT_TESTED** ; aucune livraison simulée annoncée comme réelle |
| Paiements | Aucune activation ; CMI réel ne doit pas être activé sans environnement approprié |

### R2 réel : preuve limitée et réserves

L'adaptateur existant `MediaStorage::createR2Disk` a réellement envoyé, lu, remplacé puis supprimé des objets synthétiques dans un préfixe unique `release-validation/2026-10-18/`. Aucun démarrage Laravel ni accès DB pour ces essais. La suppression exigeait une métadonnée d'appartenance au test, puis vérifiait l'absence de l'objet. Les trois objets de chaque essai ont été supprimés.

**PASS_HOSTED, couche SDK R2 uniquement** : upload/lecture image, vidéo et document synthétique, remplacement de l'image, lecture vidéo Range HTTP 206 et suppression des objets du test. Cela ne certifie pas les parcours UI hébergés.

Le premier test attendait 401/403 ; une sonde anonyme sans écriture a établi le refus exact R2 : HTTP 400, XML `Error`, code `InvalidArgument`, message exact `Authorization`. L'assertion finale exige cette erreur précise ou un refus 401/403 XML et vérifie l'absence des octets de l'objet. Le cycle complet réussit : **PASS_HOSTED couche SDK**, lecture anonyme de l'image et du document refusée, lecture persistante par un nouveau client, puis suppression confirmée des trois objets. La persistance après redémarrage Render et le cycle d'autorisation Laravel hébergé restent **NOT_TESTED**. L'essai PHP Windows a rencontré une erreur de chaîne CA ; TLS n'a pas été désactivé, les essais SDK réussis utilisent Linux.

**Uploads non activés.** Aucun secret ni flag Cloudflare/Render modifié. La présence de credentials R2 locaux ne prouve pas leur présence dans Render.

## D. Matrice fonctionnelle

L'[inventaire des routes](FULL_DEMO_ROUTE_INVENTORY.md), l'[audit fonctionnel](FULL_DEMO_FUNCTIONAL_AUDIT.md) et le [rapport E2E détaillé](SOCIAL_MARKETPLACE_E2E_VALIDATION.md) donnent la correspondance route/contrôleur/page/test. Les statuts suivants s'appliquent à la couche précisée, sans généralisation des tests backend aux interfaces.

| Fonctionnalité | Backend | Frontend | Test local | Test hébergé | Statut final / réserve |
| --- | --- | --- | --- | --- | --- |
| Inscription / connexion / rôles | Laravel/Sanctum | AuthContext, LoginPage, inscription | Suites Laravel ; erreurs login UI | Non exécuté | PASS_LOCAL backend ; NOT_TESTED hébergé |
| Déconnexion / changement de compte | Révocation Sanctum, cookie, `/auth/me` | AuthContext, client, Layout | Laravel + 33 E2E dont isolation | Non exécuté | PASS_LOCAL pour scénarios exécutés |
| Profils et auteur des posts | ProfileController / posts author_id | ProfilePage | Laravel + Vitest ; UI responsive interceptée | Non exécuté | PASS_LOCAL couches testées ; persistance hébergée NOT_TESTED |
| Avatars / couvertures | MediaAssetService | ProfilePage | Laravel ; E2E antérieurs S3Mock référencés | SDK R2 seulement | Parcours hébergé BLOCKED_INFRASTRUCTURE |
| Posts / commentaires / likes / visibilité | Controllers/services existants | FeedPage, PostCard | Laravel ; tests UI antérieurs référencés | Non exécuté | PASS_LOCAL backend ; UI complète hébergée NOT_TESTED |
| Stories / vues / expiration / purge | StoryService, MediaController, PurgeExpiredStories | FeedPage, StoryViewer | Laravel et régressions confidentialité | Non exécuté | PASS_LOCAL backend ; scheduler hébergé NOT_TESTED |
| Messagerie / historique / lecture | Conversation/Message controllers | MessagesPage, Layout | Laravel ; hook polling Vitest | Non exécuté | PASS_LOCAL backend ; simultané hébergé NOT_TESTED |
| Notifications liste/compteur/lecture | NotificationController | NotificationContext/NotificationsPage | Laravel ; E2E antérieurs référencés | Non exécuté | PASS_LOCAL backend ; hébergé NOT_TESTED |
| Communautés privées / adhésion / permissions | CommunityController | CommunityDetailPage | Laravel + Vitest ; navigation UI | Non exécuté | PASS_LOCAL couches testées ; parcours complet hébergé NOT_TESTED |
| Marketplace animaux/produits/services | Controllers et permissions existants | Pages marketplace | Laravel ; UI responsive interceptée | Non exécuté | PASS_LOCAL couches testées ; médias hébergés bloqués |
| Réservations / commandes / historique | Services existants | ReservationsPage, OrderHistoryPage | Laravel + Vitest | Non exécuté | PASS_LOCAL backend ; hébergé NOT_TESTED |
| Vétérinaires / disponibilités / rendez-vous | Services existants | VeterinariansMarketplacePage, rendez-vous | Laravel ; navigation responsive | Non exécuté | PASS_LOCAL backend ; hébergé NOT_TESTED |
| Vérification professionnelle / badge | ProfessionalVerification et décisions persistées | Vérifications admin/profil | Laravel ; E2E antérieurs référencés | Non exécuté | PASS_LOCAL backend ; aucun badge artificiel attribué |
| Administration / MFA / audit / modération | Middleware et controllers existants | Pages admin | Laravel ; navigation avec API interceptée | Non exécuté | PASS_LOCAL backend ; administration hébergée NOT_TESTED |
| Reels et vidéos UI | Médias existants | Interface existante | Navigation responsive seulement | Non exécuté | NOT_TESTED pour le parcours vidéo complet |
| FR/EN/AR, RTL, clair/sombre | Sans objet | Design existant préservé | 33 E2E, cinq largeurs | Non exécuté | PASS_LOCAL aux combinaisons testées ; 390 px NOT_TESTED |
| WebSocket Reverb | Architecture conservée | Fallback HTTP existant | Polling testé localement | Non exécuté | NOT_TESTED hébergé ; aucun véritable temps réel annoncé |

## E. Corrections et intégrité

Les corrections d'authentification, préservation des comptes et intégration sociale préexistantes sont conservées dans le candidat. Le défaut de logout provenait notamment de réponses d'authentification obsolètes capables de restaurer l'utilisateur, de données React encore montées et d'une confirmation locale insuffisante. Le correctif conserve la barrière locale, l'invalidation par époque de session, la coordination interonglets, le démontage des données privées et la vérification serveur après logout ; il ne rejoue pas aveuglément une mutation.

Correction supplémentaire de cette mission : verrou Composer ciblé, `symfony/http-foundation` 7.4.19 → 7.4.21, `symfony/yaml` 8.1.6 → 8.1.9, et trois polyfills requis par le solveur. Aucun changement de contrainte générale Laravel, schéma ou secret.

Aucune opération DB hébergée, migration distante, seeder, réinitialisation, modification de mot de passe ou suppression d'utilisateur n'a été effectuée. Les logos, candidatures et modifications natives indépendantes n'ont pas été écrasés. Les volumes Docker préexistants sont conservés. **La conservation réelle des hashes/contenus hébergés n'a pas été comparée**, faute d'accès : absence de mutation de notre part ne remplace pas cette vérification.

## F. Conditions nécessaires avant publication

1. Fournir une session Render/API sécurisée utilisable localement ; relever service, source réelle, plan, image/digest, déploiement, logs, variables et rollback compatible.
2. Vérifier en lecture seule la cible TiDB `yazoo_showcase_afwaj`, TLS, variables de garde, `migrations`, `operation_markers` et marqueur historique. Identifier toutes les migrations réellement en attente.
3. Obtenir une sauvegarde cohérente, chiffrée et restaurable avec preuve de restauration isolée ; relever les empreintes de préservation sans afficher données personnelles ou hashes.
4. Examiner les écritures de démarrage : `startup.sh` peut appeler `yazoo:migrate-production` avant le bootstrap. L'absence d'un marqueur n'autorise jamais un reseeding. Aucune nouvelle image ne doit démarrer sur TiDB avant validation de ces effets.
5. Terminer les validations du candidat corrigé, le scan de l'image et les démarrages répétés avec persistance jetable ; compléter les parcours critiques encore non testés.
6. Certifier les autorisations média R2 réelles, la configuration effective Render et la persistance après redémarrage avant toute activation des uploads.
7. Recalculer le manifeste, revoir les seuls fichiers sélectionnés, créer le commit de release puis exécuter la CI et le workflow Docker Hub sur ce SHA complet. Conserver le digest immuable.
8. Publier Render d'abord avec référence de rollback compatible. Après santé, logs, données et parcours réels validés, construire Pages avec les flags publics confirmés, puis publier et vérifier la même release.
9. Réaliser les tests hébergés avec identités et ressources synthétiques autorisées : deux comptes simultanés, CSRF, isolation, médias privés, réservations, badges, langues/apparences et largeurs dont 390 px.

## G. URLs observées, sans nouvelle publication

- Frontend existant : https://yazoo-showcase.pages.dev
- Backend existant : https://yazoo-showcase.onrender.com
- Déploiement Pages existant : https://3520222f.yazoo-showcase.pages.dev

Au premier contrôle Chromium en lecture seule, le frontend renvoyait 200 ; Render `/health/live`, `/health/ready` et le proxy `/api/legal/config` renvoyaient 503 « Application loading ». Au second contrôle, les quatre URLs répondent 200. Cela confirme le réveil observé du service existant et le passage d'une requête par le proxy ; cela ne certifie pas les parcours authentifiés ni une nouvelle release. Aucune release nouvelle n'est déclarée déployée.
