# Validation sociale, médias et marketplace YaZoo

Date : 18 octobre 2026. Travail local uniquement. Aucun appel de mutation hébergé, migration distante, changement de secret, paiement, commit, push ou déploiement. Les corrections locales d'authentification préexistantes sont conservées. Les modifications préexistantes de logos et de candidatures n'ont pas été touchées.

Ce rapport complète [l'audit fonctionnel](FULL_DEMO_FUNCTIONAL_AUDIT.md) et [l'inventaire des 160 routes](FULL_DEMO_ROUTE_INVENTORY.md), sans remplacer leurs constats par une certification globale. `PASS_LOCAL` désigne uniquement la couche et le scénario expressément testés. Une réussite Laravel ne certifie pas l'interface. Aucun `PASS_HOSTED` n'est attribué.

## Environnement et preuves

- API Laravel réelle : `127.0.0.1:8012`, conteneur `yazoo-social-api`, SQLite exclusivement `/state/social-e2e.sqlite`, volume `yazoo-social-state`. Le fichier `.env` habituel est masqué par un fichier neutre de test. Garde explicite dans `backend/tests/Support/prepare-social-e2e.php` avant toute migration.
- React/Vite : `127.0.0.1:5182`, configuration de test `frontend/e2e/social-vite.config.js`. Tous les proxys, notamment les URLs média relatives, ciblent cette API jetable. Le serveur existant sur 5173 est préservé.
- Stockage : adaptateur R2/S3 existant de Laravel, requêtes SDK HTTP réelles vers `yazoo-social-s3:9090`, bucket jetable `yazoo-social-test`, volume `yazoo-social-objects`. Image Adobe S3Mock épinglée au digest `sha256:ab01a6946750f451ca215a47e91030695b260e4003b8a5a6201d25029b8fca92`. Les identifiants `local-s3mock-only` concernent uniquement ce simulateur local ; aucun credential Cloudflare n'est créé ou utilisé.
- Le profil d'exploitation de cette fixture est `local`, `APP_ENV=testing`, queue synchrone, broadcasting `log`, email `array`, SMS désactivé. L'authentification reste Sanctum par cookie avec CSRF. Le MFA administrateur est désactivé uniquement dans cette fixture ; ses tests backend restent exécutés séparément.
- Comptes créés par inscription réelle dans la seule base jetable ; administrateur de revue réservé à cette base. Les dossiers synthétiques portent une licence explicitement fictive. Le badge n'est obtenu qu'après l'action d'approbation dans l'interface administrateur. Aucune validation de diplôme réel ou certification ONSSA/CNDP n'est prétendue.
- [S3Mock](https://github.com/adobe/S3Mock) ne valide pas les signatures d'authentification comme Cloudflare R2 : ces tests prouvent le transport S3 et les permissions Laravel, pas les politiques IAM ou l'absence d'accès direct d'un véritable bucket cloud.

## Corrections ciblées

1. **Profil** : `ProfilePage` demande maintenant `GET /posts?author_id=...`. Le filtrage des dix premiers posts globaux pouvait masquer les publications du profil. Test de régression exécuté en échec avant correction puis en réussite.
2. **Actualisation** : hook partagé `useVisiblePolling`, une seule exécution par boucle, pause en onglet masqué, nettoyage au démontage et délai croissant si le callback rejette. Feed et stories : 30 s ; conversations : 30 s, conversation ouverte : 15 s ; notifications : 30 s ; aperçu de messagerie : 45 s. Les pages qui absorbent déjà leurs erreurs conservent leur intervalle fixe. Aucun POST incertain n'est rejoué automatiquement. Reverb reste présent et le polling de messagerie s'arrête quand la connexion WebSocket est établie.
3. **Notifications** : actualisation de la liste, en complément du compteur existant. Test intercomptes avec abonnement, lecture persistante et refus HTTP 404 pour un autre destinataire.
4. **Communauté privée** : un lien partagé retournant 403 permet désormais de demander l'adhésion par l'endpoint existant. La liste reste privée ; l'écran ne montre ni métadonnées renvoyées lors de la demande ni discussion avant approbation. Aucun élargissement des permissions Laravel.
5. **Feed** : navigation explicite entre les pages Laravel, en conservant les composants et les traductions existants. Le polling conserve la page courante et évite un changement de page en cours.
6. **Stories expirées** : commande bornée `yazoo:purge-expired-stories --limit=200`, option `--dry-run`, validation 1–1000, programmation horaire dans `OperationsSchedule`, réutilisation de `StoryService::delete` et des primitives de stockage existantes. La suppression des objets non partagés est vérifiée avant le retrait des références relationnelles. Tests de conservation d'une story active, refus d'accès aux médias expirés et conservation des références si le stockage refuse la suppression ; preuve S3 HTTP du retrait de l'objet expiré. Aucun ordonnanceur distant n'est lancé.
7. **Confidentialité des stories** : faille reproduite sur S3Mock, média actif accessible anonymement avec HTTP 200. `MediaController` exige désormais une session Sanctum et une story non expirée avant de streamer, y compris pour une référence GridFS. L'accès anonyme retourne 404. Les réponses des stories restent privées et sans stockage navigateur (`no-store`), y compris dans le chemin GridFS ; aucun changement des règles des avatars ou annonces publiques.
8. **Libellés de réservation de service** : les parcours réels révélaient une clé de traduction inexistante `ordersUi.statuses.kind.pet_sitting`, remplacée à l'écran par le terme générique « Annonce ». Les deux types de service utilisent maintenant les traductions FR/AR/EN déjà présentes, avec deux tests de rendu pour garde et dressage. Les modifications antérieures de paiement et d'authentification restent préservées.

## Résultats exécutés

| Preuve | Résultat et portée |
|---|---|
| Laravel `artisan test --compact` | `PASS_LOCAL` : 480 tests, 2 830 assertions, SQLite jetable ; inclut auth/logout, inscriptions invalides/doublons sans altération de compte, autorisations, social, marketplace, R2 avec disque simulé, notifications, administration et MFA |
| `R2MediaStorageTest` ciblé | `PASS_LOCAL` : 14 tests, 134 assertions ; remplacement/suppression, documents privés, HEAD/Range, quarantaine, nettoyage des stories expirées et panne de suppression ; `Storage::fake`, distinct du transport S3 HTTP |
| React/Vitest | `PASS_LOCAL` : 232 tests, 60 fichiers ; régressions de profil, adhésion privée, libellés de services et polling incluses |
| ESLint / TypeScript / build | `PASS_LOCAL` ; génération SEO statique ignorée car `VITE_SITE_URL` non configurée dans cet environnement de build |
| Native | `PASS_LOCAL` pour 70 tests de contrats, lint et TypeScript exécutés ; aucune validation sur appareil |
| `social-media-s3.spec.js` | `PASS_LOCAL` : upload/read/replace/delete avatar et couverture, rejet d'un faux PNG, vidéo WebM animée réellement décodée dans Chromium en 64×64, octets identiques après transport S3, HTTP Range 206, passage privé et accès anonyme refusé, suppression de post et story vidéo |
| `social-notifications-fullstack.spec.js` | `PASS_LOCAL` : 2 tests, 1440 et 320 px ; création backend, persistance, rafraîchissement sans reload par polling, marquage lu, rechargement, isolation destinataire ; réception automatique dans une conversation déjà ouverte, un seul message persisté et compteur lu à zéro |
| `social-marketplace-fullstack.spec.js` | `PASS_LOCAL` : 10 tests sociaux/métier sur cinq largeurs, API non mockée, assertions HTTP et rechargement dans les parcours UI ; les deux tests catalogue complémentaires sont consignés séparément |
| Catalogue complémentaire | `PASS_LOCAL` : 2 tests réels à 1440 et 320 px, inscription et revue seller/breeder, publication image, approbation administrative, lecture par le client, PUT d'autrui 403, modification propriétaire, rechargement et suppression UI pour animaux et produits |
| Confidentialité story média | `PASS_LOCAL` : échec avant correctif (anonyme 200), réussite après correctif (propriétaire 200, anonyme 404) sur S3 HTTP ; `MediaAuthorizationTest` refuse aussi l'anonyme, HEAD et Range expirés sur références GridFS avant tout accès au stockage MongoDB |
| Régressions navigateur existantes | `PASS_LOCAL` : 33 tests (`auth-isolated`, `logout-isolation`, `full-demo-responsive`) avec API simulée. Les 20 pages, les cinq largeurs, FR/AR/EN, RTL, clair/sombre et menus passent ; logout depuis profil, profil public, feed et paramètres, retour/reload, erreurs 419/429/503 et cookie survivant passent. Ce ne sont pas 33 tests du backend réel. |

Les essais de mise au point ne sont pas comptés comme des réussites. Ils ont notamment corrigé des sélecteurs ambigus entre suggestions d'utilisateurs et stories, un nom de badge différent de la traduction effectivement chargée, et un champ de fixture `cover_photo` au lieu de `coverPhoto`. La lecture vidéo utilise l'URL relative de l'application via le proxy de test.

## Parcours demandés et limites de preuve

Tous les chemins ci-dessous sont préfixés par `/api`. `D/R` désigne desktop et navigateur responsive, jamais React Native. Les états D/R détaillés suivent la matrice finale.

| Fonction / routes existantes | Contrôleur et interface React | Test exécuté / résultat local | Dépendance / état desktop et responsive | Natif réel | Démo hébergée |
|---|---|---|---|---|---|
| Inscription, login, logout, identité : `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` | AuthController/AuthService ; RegisterPage, LoginPage, SettingsPage, AuthContext | AuthApiTest, LogoutIsolationTest ; E2E inscription via formulaires, logout 200 puis me 401, changement de compte | Backend `PASS_LOCAL` ; D/R : matrice ; natif et hébergé `NOT_TESTED` pour ces parcours réels | `NOT_TESTED` | `NOT_TESTED` |
| Vérifications professionnelles après inscription | `POST /professional-verifications`, revue admin ; ProfessionalVerificationPage | E2E client → dossier vétérinaire ou prestataire → revue admin ; aucun privilège automatique à l'inscription | SMTP/SMS non utilisés ; D/R : matrice ; natif/hébergé `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Nom, bio, ville, informations privées : `GET/PATCH /users/{user}` | ProfileController ; ProfilePage | ProfileApiTest ; E2E sauvegarde puis reload et PATCH d'autrui 403 ; test auteur filtré côté API | Backend `PASS_LOCAL` ; D/R : matrice ; natif/hébergé `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Langue : `PATCH /users/{user}` avec `preferred_locale` | ProfileController ; SettingsPage | Contrats backend existants ; sauvegarde de langue dans l'UI réelle non rejouée | UI `NOT_TESTED` ; FR/AR/EN/RTL et thème conservés, pas certifiés par ces tests | `NOT_TESTED` | `NOT_TESTED` |
| Avatar et couverture : `POST /users/{user}` avec `_method=PATCH`, `GET /media/{asset}` | ProfileController/MediaAssetService ; ProfilePage | E2E upload UI + reload ; test S3 HTTP remplacement et suppression ; R2MediaStorageTest | Backend/transport `PASS_LOCAL` ; D/R upload : matrice ; vrai R2 `BLOCKED_EXTERNAL_SERVICE` | `NOT_TESTED` | `NOT_TESTED` |
| Publications texte/image, édition/suppression : `GET/POST /posts`, `PATCH/DELETE /posts/{post}` | PostController/PostService ; CreatePost, PostCard, FeedPage/ProfilePage | FeedApiTest, PostVisibilityAuthorizationTest ; UI image et commentaire A/B, refus édition d'autrui, privé absent du feed B ; cycle suppression dans test S3 | Backend `PASS_LOCAL` ; D/R : matrice ; édition/suppression UI exhaustive `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Vidéos de post : mêmes routes + `GET /media/posts/{post}` | MediaController/MediaAssetService ; PostCard | S3 HTTP et décodage Chromium + Range ; pas de fichier vidéo à en-tête factice pour cette preuve | Transport/lecture `PASS_LOCAL` ; contrôle vidéo dans toutes les UI/largeurs `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Likes, commentaires, réponses, réactions : `POST /posts/{post}/like`, `/posts/{post}/comments`, `/comments/{comment}/reaction` | PostController/CommentController ; PostCard | FeedApiTest ; UI commentaire intercomptes visible après reload, like HTTP | Backend `PASS_LOCAL` ; D/R commentaire : matrice ; réponses/réactions UI détaillées `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Feed, auteur, suivi, pagination : `GET /posts` | PostController ; FeedPage/ProfilePage | API existante testée, régression auteur ; navigation UI page 2 avec HTTP 200 et métadonnées Laravel dans le test S3 | Pagination UI `PASS_LOCAL` à 1280 px, viewport de ce test complémentaire ; tri/suivi UI complet `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Stories image/vidéo : `GET/POST /stories`, `POST /stories/{story}/view`, `DELETE /stories/{story}` | StoryController/StoryService ; FeedPage, StoryComposerModal, StoryViewer | StoryApiTest ; image par UI, apparition chez B par polling et vue persistée ; vidéo upload/delete S3 HTTP ; suppression par non-propriétaire 403 | Backend `PASS_LOCAL` ; D/R image : matrice ; lecture story vidéo dans viewer `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Expiration 24 h et nettoyage | StoryRepository/StoryService ; StoryViewer ; commande de purge | StoryApiTest filtre les expirées ; nouveau test borné du nettoyage et média R2 simulé | `PASS_LOCAL` backend ; ordonnanceur hébergé `BLOCKED_EXTERNAL_SERVICE` ; pas d'attente réelle de 24 h | `NOT_TESTED` | `NOT_TESTED` |
| Messagerie : conversations, messages, non lus, historique, lecture | ConversationController/MessageController ; MessagesPage, Layout | MessagingApiTest ; E2E création/envoi/réception A/B, non lu HTTP, historique après reload ; hook polling testé | Backend `PASS_LOCAL` ; D/R : matrice ; réception automatique sur conversation déjà ouverte `PASS_LOCAL` à 1440/320 ; Reverb hébergé `BLOCKED_EXTERNAL_SERVICE` | `NOT_TESTED` | `NOT_TESTED` |
| Notifications : liste/compteur/read/read-all | NotificationController ; NotificationContext, NotificationsPage | NotificationApiTest + 2 E2E abonnement/polling/lecture/isolation | Backend + D1440/R320 `PASS_LOCAL` ; autres déclencheurs UI détaillés `NOT_TESTED` ; natif/hébergé `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Communautés : création/recherche/édition/suppression/join/leave/demandes | CommunityController ; CommunitiesPage, CommunityDetailPage | CommunityApiTest ; E2E création privée avec image, refus de publier avant approbation, demande depuis lien, approbation UI, post membre et refus tiers | Backend `PASS_LOCAL` ; D/R parcours : matrice ; refus/quitter/édition/suppression UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Services : `GET/POST /services`, `PATCH/DELETE /services/{service}` | ServiceListingController ; ServicesMarketplacePage | ServiceListingApiTest, MarketplacePublishingAuthorizationTest ; publication prestataire UI, refus service pour vétérinaire, masquage avant modération et réservation UI | Backend `PASS_LOCAL` ; D/R : matrice ; édition/suppression UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Vétérinaire : `GET/POST /veterinarians`, `PATCH/DELETE /veterinarians/{veterinarian}` | VeterinarianController ; VeterinariansMarketplacePage | VeterinarianApiTest ; dossier approuvé puis création UI avec image, modération API | Backend `PASS_LOCAL` ; D/R : matrice ; édition/suppression UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Badge professionnel et document privé | ProfessionalVerificationController, MarketplacePublishingResolver, ressources profil/vétérinaire ; ComplianceBadge | ProfessionalVerificationApiTest, SocialTrustApiTest ; E2E false avant revue, document interdit à A, approbation admin UI, true backend et badge après reload | `PASS_LOCAL` pour dossier synthétique et contrôle applicatif ; vrai examen de licence/R2 IAM `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Réservation service : `POST /reservations`, historique/statuts | ReservationController ; ServicesMarketplacePage, ReservationsPage | ReservationApiTest ; E2E réservation UI puis historique/reload | Backend `PASS_LOCAL` ; D/R : matrice ; tous changements de statut UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Disponibilités/rendez-vous : routes `/veterinarians/{vet}/availability`, `/veterinarians/{vet}/appointments`, `/veterinarian-appointments/{appointment}/status` | VeterinarianAppointmentController ; VeterinarianAppointmentsPage | VeterinarianAppointmentApiTest ; créneau UI B, demande A, confirmation B, reload A | Backend `PASS_LOCAL` ; D/R : matrice ; annulation/rebooking UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Animaux : CRUD `/animals`, documents, contraintes légales | AnimalController ; AnimalsMarketplacePage, AnimalDetailPage | AnimalApiTest, AdminAnimalReviewApiTest, MarketplacePublishingAuthorizationTest, R2MediaStorageTest ; E2E création/image/revue administrative/détail/modification/suppression, PUT d'autrui 403 | Backend `PASS_LOCAL` ; D1440 et R320 `PASS_LOCAL` pour ce cycle ; autres largeurs et cas légaux UI exhaustifs `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Produits : CRUD `/products`, prix/disponibilité/images | ProductController ; ProductsMarketplacePage, ProductDetailPage | ProductApiTest, MarketplaceModerationVisibilityTest, R2MediaStorageTest ; E2E création/image/prix/revue administrative/détail/modification/suppression, PUT d'autrui 403 | Backend `PASS_LOCAL` ; D1440 et R320 `PASS_LOCAL` pour ce cycle ; autres largeurs et variantes stock/statuts UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Recherche/filtres/favoris/avis | SearchController, FavoriteController, ReviewController ; pages marketplace/FavoritesPage | SearchAndUnreadApiTest, SocialTrustApiTest ; autorisations, avis après réalisation, favoris idempotents | Backend `PASS_LOCAL` ; UI complète et publication marketplace sur feed `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Signalements/modération/statistiques/utilisateurs/commandes/MFA | Contrôleurs Admin/Report ; pages Admin existantes | Suites Admin*, AdminMfaTest ; revue professionnelle UI et modération annonces par API dans E2E | Backend `PASS_LOCAL` ; toutes pages admin réelles D/R `NOT_TESTED` ; MFA réel UI `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Reels existants | Feed et composants Reels, sources Laravel préservées | Tests existants exécutés ; pas de nouveau scénario réel Reels | UI/appareil/hébergé `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |
| Paiement CMI réel, email réel, SMS réel | Intégrations existantes conservées | Aucun prestataire réel appelé ; mail array/SMS disabled dans fixture | `DISABLED_BY_DESIGN` dans les tests ; disponibilité réelle hébergée `NOT_TESTED` | `NOT_TESTED` | `NOT_TESTED` |

Le scénario « B vétérinaire publie un service » est incompatible avec les capacités backend actuelles : le vétérinaire publie dans l'espace vétérinaire, le prestataire dans les services. Le test vérifie le 403 pour B et utilise un quatrième compte P, approuvé comme prestataire, pour la réservation de service. Aucune permission n'est contournée.

## Matrice responsive et persistance

| Largeur Chromium | Inscription/profil/avatar/couverture/post/commentaire/story/message/logout/changement de compte | Communauté privée/revue professionnelle/service/réservation/vétérinaire/créneau/rendez-vous confirmé |
|---|---|---|
| 1440 px | `PASS_LOCAL` | `PASS_LOCAL` |
| 1024 px | `PASS_LOCAL` | `PASS_LOCAL` |
| 768 px | `PASS_LOCAL` | `PASS_LOCAL` |
| 375 px | `PASS_LOCAL` | `PASS_LOCAL` |
| 320 px | `PASS_LOCAL` | `PASS_LOCAL` |

La suite réelle de dix parcours matriciels et du cycle S3 a terminé avec **11 tests réussis en 11,7 minutes**. Les assertions HTTP acceptent uniquement les réponses attendues et vérifient les refus 401/403/404, pas seulement l'existence d'une page. Les rechargements vérifient les données relues depuis Laravel. Les preuves agrégées SQLite/S3 après redémarrage sont consignées ci-dessous.

Une largeur de viewport Chromium ne constitue ni un test tactile iOS/Android ni une validation native. Les menus, thèmes et traductions n'ont pas été remplacés. Les cinq tests responsive avec API simulée vérifient en complément l'absence de débordement horizontal et les vingt destinations de navigation, mais ne certifient pas chaque action métier de ces vingt pages.

Au total : **48 tests Playwright distincts réussis**, dont **15 avec Laravel réel et stockage S3 de test**, et **33 avec réponses API simulées**. Les relances d'un même test de média ne sont pas comptées une seconde fois. Les derniers contrôles ciblés médias ont été relancés après le correctif de confidentialité et la protection des réponses de pagination obsolètes. Les tests ne valident pas exhaustivement toutes les variantes UI des 160 routes ; les limites sont maintenues dans le tableau.

**Persistance après redémarrage : `PASS_LOCAL`.** Les deux redémarrages finaux API + S3Mock conservent exactement les compteurs SQLite et les SHA-256 de **108 objets S3**. Preuves : `output/social-e2e/persistence-before.json` et `persistence-after.json`. État jetable : 96 utilisateurs (y compris essais et reprises), 38 posts, 16 commentaires, 14 stories, 12 vues, 9 conversations et 9 messages, 10 communautés, 20 dossiers professionnels, 6 services/réservations/vétérinaires/créneaux/rendez-vous, 75 notifications. Ces nombres concernent exclusivement la fixture locale ; ils ne décrivent ni ne modifient les 20 comptes TiDB.

Les contrôles finaux repassent : Laravel 480/2 830, Vitest 232, Pint ciblé, ESLint, TypeScript, build frontend et `git diff --check`. Le streaming GridFS réellement connecté à MongoDB et le décodage sur appareil restent `NOT_TESTED` ; les refus d'autorisation des références GridFS sont testés avant l'accès à MongoDB.

Les conteneurs `yazoo-social-api` et `yazoo-social-s3` et le serveur Vite 5182 sont arrêtés en fin de validation. Les deux volumes jetables locaux sont conservés pour revue. Le Redis préexistant et le serveur préexistant sur 5173 sont préservés. Aucun service distant n'est démarré ou arrêté.

## Reproduire les parcours locaux

Préconditions : dépendances Composer de développement dans `backend/vendor`, dépendances npm et Chromium Playwright installés, image PHP locale compatible disponible (celle utilisée ici : `yazoo-api:closure`). Ne pas utiliser l'environnement TiDB. Le script de fixture refuse tout autre chemin SQLite et endpoint S3.

Pour reprendre les conteneurs laissés arrêtés localement, utiliser `docker start yazoo-social-s3 yazoo-social-api`, puis démarrer Vite comme ci-dessous. Les commandes de création suivantes sont réservées à une installation locale où ces ressources dédiées n'existent pas encore.

Créer les seules ressources dédiées si elles n'existent pas :

```powershell
docker network create yazoo-social-e2e
docker volume create yazoo-social-state
docker volume create yazoo-social-objects
docker run -d --name yazoo-social-s3 --network yazoo-social-e2e -p 127.0.0.1:9092:9090 -e initialBuckets=yazoo-social-test -e root=/s3mockroot -e retainFilesOnExit=true -v yazoo-social-objects:/s3mockroot adobe/s3mock@sha256:ab01a6946750f451ca215a47e91030695b260e4003b8a5a6201d25029b8fca92
.\scripts\start-social-e2e.ps1
```

Dans `frontend`, démarrer Vite dans un terminal dédié :

```powershell
$env:VITE_API_URL='http://127.0.0.1:8012/api'
$env:VITE_REALTIME_ENABLED='false'
$env:VITE_GOOGLE_AUTH_ENABLED='false'
$env:VITE_MONITORING_ENABLED='false'
node node_modules/vite/bin/vite.js --config e2e/social-vite.config.js --configLoader native --host 127.0.0.1 --port 5182 --strictPort
```

Puis, toujours depuis `frontend` :

```powershell
$env:E2E_SOCIAL_FULLSTACK='true'
$env:E2E_SKIP_WEBSERVER='true'
$env:E2E_BASE_URL='http://127.0.0.1:5182'
node node_modules/@playwright/test/cli.js test e2e/social-marketplace-fullstack.spec.js e2e/social-media-s3.spec.js e2e/social-notifications-fullstack.spec.js --workers=1
```

Depuis la racine, `scripts/verify-social-persistence-e2e.ps1` compare les compteurs et SHA-256 avant/après le redémarrage des deux conteneurs dédiés. `docker exec yazoo-social-api php tests/Support/social-s3-cleanup-proof.php` vérifie le nettoyage physique d'une seule story synthétique expirée. Les gardes empêchent ces scripts PHP d'utiliser une autre base ou un autre endpoint. Les artefacts sont dans `output/social-e2e/`, hors fichiers à publier.

## Application native : audit séparé

Le dossier `mobile/` existe (Expo/React Native). `useSocial.tsx` utilise bien les endpoints Laravel pour feed, stories, profils avec `author_id`, communautés et notifications. Les routes Expo correspondantes existent dans `mobile/src/app/`, les destinations dans `YaZooShell`. Les médias utilisent les composants existants `Media` et `SocialVideo` ; la suspension des vidéos utilise `AppState`. Le hook social lu ne met pas en place de polling social équivalent au nouveau hook navigateur. Il ne faut donc pas extrapoler les mises à jour automatiques web au natif. Aucun code natif n'a été modifié pendant cette mission ; les modifications locales antérieures sont préservées.

70 tests de contrats et les contrôles lint/TypeScript passent localement. Tous les parcours réels sur appareil, permissions galerie/caméra, décodage mobile, notifications push, reconnexion et déploiement natif : `NOT_TESTED`.

## Infrastructure et conditions de publication

- Aucun accès R2 réel n'a été validé. Maintenir les uploads showcase désactivés tant que les paramètres de [R2_SHOWCASE_STORAGE.md](R2_SHOWCASE_STORAGE.md) ne sont pas fournis et vérifiés : `MEDIA_STORAGE_DRIVER=r2`, `PROFESSIONAL_VERIFICATIONS_DISK=r2`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, endpoint HTTPS réel Cloudflare, `R2_REGION=auto`, bucket privé. Activer `YAZOO_SHOWCASE_UPLOADS_ENABLED` uniquement après preuve réelle upload/read/replace/delete et protection des documents. Le test local HTTP n'autorise aucun assouplissement du garde-fou showcase.
- Cloudflare Pages doit router les chemins API/media/sanctum vers le bon `BACKEND_ORIGIN`. `VITE_API_URL`, origine CSRF/CORS, attributs cookie et Set-Cookie doivent être validés sur les domaines finaux. Les tests locaux directs et Vite ne certifient pas le proxy Cloudflare déployé.
- Render Free ne garantit pas un processus Reverb, un worker ou un ordonnanceur toujours actifs. Le polling fonctionne seulement tant que le navigateur est visible ; un réveil Render peut échouer. Les mutations ne sont pas répétées automatiquement. L'expiration logique à 24 h reste backend ; le nettoyage physique exige l'ordonnanceur et peut être différé d'une heure au plus en régime normal, davantage si le service dort ou le lot dépasse 200.
- La nouvelle purge des stories garde les références si le stockage refuse la suppression, ce qui est testé. Les suppressions interactives existantes réutilisent encore le cycle après commit : une panne du stockage à ce moment peut laisser un objet orphelin sans référence relationnelle. Prévoir surveillance et réconciliation de bucket ; aucune récupération générale des anciens objets orphelins n'est prétendue.
- Reverb/Redis, queue, mail, SMS : vérifier les services selon [REDIS_REVERB_OPERATIONS.md](REDIS_REVERB_OPERATIONS.md), sans annoncer de temps réel ou d'envoi réel quand seul le fallback HTTP ou un driver désactivé est disponible.
- Avant publication : terminer les parcours marqués `NOT_TESTED`, vérifier FR/AR/EN, RTL et thèmes sur les mêmes largeurs, tester Safari/Chrome mobile et appareil natif séparément, puis réaliser une validation hébergée explicitement autorisée avec comptes de test dédiés. Préserver les 20 comptes TiDB. Revoir les modifications locales et le plan [RENDER_TIDB_RELEASE_PLAN.md](RENDER_TIDB_RELEASE_PLAN.md). Aucun déploiement n'est effectué ici.
