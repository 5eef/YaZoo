# YaZoo — finalisation des fonctionnalités non certifiées

Date : 19 octobre 2026. Phase locale uniquement, sans publication.

## Candidate et périmètre

- Base publiée exacte : `9ef598e4ee79cd8384ef71c485c5c76fd7275d01`.
- Branche créée depuis cette base : `release/final-features-2026-10-19`.
- Worktree : `C:/project/YaZoo/output/final-feature-completion/source`.
- Aucun commit, push, build publié ou déploiement pendant cette phase. HEAD reste la base ; les différences de la candidate sont identifiées par le manifeste local, et non par un nouveau SHA Git.
- Manifeste de revue : `output/final-feature-completion/release-candidate-manifest.json`, 19 fichiers sélectionnés avec SHA-256 individuel et empreinte globale ; regénération par `python output/final-feature-completion/prepare-candidate.py` depuis le workspace initial. Les fichiers de secrets, médias, bases, dépendances et modifications natives indépendantes sont exclus et leur absence est contrôlée.
- Le workspace initial `startup-2026`, ses changements indépendants, ses fichiers natifs, logos et candidatures sont préservés. Les anciens worktrees de release sont conservés.
- Le rapport de déploiement versionné dans le SHA public était encore le rapport prépublication `NOT_DEPLOYED_BLOCKED`. La candidate reprend sa version finale déjà présente dans le workspace du propriétaire : cette synchronisation documentaire ne constitue pas un nouveau déploiement.

Cette revue cible les écarts du [rapport public](YAZOO_PUBLIC_DEPLOYMENT_REPORT_2026-10-18.md). L'inventaire général des routes et la validation sociale antérieure restent applicables ; ils ne sont pas recommencés. Les états locaux ci-dessous ne remplacent aucune certification hébergée manquante.

## Écarts confirmés et corrections minimales

### Reels web

**État initial :** aucune route React `/reels` ; la navigation aboutissait au fallback du routeur. Les vidéos et interactions existaient déjà dans le feed et dans Expo. Filtrer uniquement une page de feed côté navigateur aurait omis les vidéos des pages suivantes.

**Correction :** nouvelle page `/reels` protégée par le Layout existant et accessible dans les menus desktop et mobile. Elle utilise les cartes YaZoo existantes, leurs commentaires/réponses, réactions, signalements, édition et suppression. Aucun catalogue statique, copie de média ou nouvel endpoint. Ajout du paramètre validé `media_kind=image|video` sur `GET /api/posts`, appliqué à la requête après le scope de visibilité, avant pagination. Les communautés privées restent soumises à leur autorisation et exclues du catalogue global.

Lecture verticale avec défilement et points d'accroche, contrôles vidéo, `playsInline`, préchargement des métadonnées, pause hors écran/en arrière-plan/au démontage et lors de la lecture d'une autre vidéo. Aucun autoplay sonore. Une réaction ne démonte pas le lecteur. Pagination explicite bornée par les métadonnées Laravel ; aucune boucle de sondage supplémentaire. Les mutations ne sont jamais rejouées automatiquement. Les réponses GET obsolètes sont ignorées après changement de page ou démontage ; les protections de session publiées sont inchangées.

**Tests :** `ReelsFilterTest`, quatre tests `ReelsPage.test.jsx`, cinq tests Playwright `reels.spec.js`, route ajoutée à `full-demo-responsive.spec.js`. Les tests navigateur décodent une vraie vidéo WebM synthétique 64×96, vérifient réaction/rechargement, absence de débordement et accès par les menus à 320/375/768/1024/1440 px. Leur API est simulée : la persistance et les permissions Laravel sont testées séparément. Aucune prétention de test Reels complet contre Laravel/R2 hébergés.

**État final :** `PASS_LOCAL` pour ces couches ; `NOT_TESTED` pour le nouveau parcours hébergé, les codecs autres que WebM Chromium et le parcours complet Reels UI → Laravel → stockage. Les fichiers et routes médias restent ceux déjà sécurisés et testés du feed. Publication de vidéo via le compositeur existant du feed ; pas de deuxième compositeur redondant.

### Rendez-vous : refus inaccessible dans React

**État initial :** le contrôleur acceptait `status=rejected`, mais l'écran React proposait seulement confirmation, annulation et clôture. Le refus métier était inaccessible depuis cet écran.

**Correction :** bouton de refus uniquement si `canManage` est confirmé par Laravel et si la demande est en attente. Utilisation du même client API et verrou de mutation ; traductions FR/EN/AR. Pas de nouvelle règle de rôle côté serveur, pas de réservation reconstruite côté client.

**Tests :** deux tests React ajoutés : refus du gestionnaire, rechargement du statut refusé et absence d'action pour le client. Le nouveau test Laravel de notifications couvre aussi le refus client interdit, le refus du vétérinaire, le statut SQL et sa notification persistée.

**État final :** `PASS_LOCAL` pour ces cas ; nouvelle action hébergée `NOT_TESTED`.

### MFA : état inconnu affiché comme désactivé

**État initial :** le chargement initial utilisait une promesse sans gestion d'erreur et `status=null` affichait « MFA non activée ». Une panne réseau pouvait donc donner une indication de sécurité incorrecte et permettre de préparer un nouvel enrôlement.

**Correction :** distinction chargement/erreur/statut confirmé, récupération contrôlée par un nouveau GET, enrôlement bloqué tant que le statut n'est pas connu, protection contre une réponse après démontage. Les contrôles TOTP et les exigences serveur restent inchangés.

**Tests :** deux tests React : HTTP 503, message d'erreur, enrôlement bloqué, reprise du GET ; challenge soumis une fois et code effacé après succès. Nouveau `AdminMfaProfessionalReviewTest` avec MFA **enforced=true** : refus non-admin, enrôlement requis, confirmation TOTP, challenge requis, approbation administrative persistée, badge public vrai après décision, rejet puis badge faux. Document et identités synthétiques dans SQLite/stockage fake uniquement.

**État final :** `PASS_LOCAL` ; session administrative et décisions réelles hébergées restent `NOT_TESTED`. Aucun dossier professionnel réel ou synthétique hébergé n'a été approuvé.

### Réservations : notifications réellement persistées

**État initial :** les parcours métier existaient et disposaient de tests, dont beaucoup utilisaient `Notification::fake()`. Cela ne prouvait pas, à lui seul, la création des lignes de notifications avec la queue synchrone du showcase.

**Correction :** aucune modification du métier sain. Ajout de `BookingNotificationPersistenceTest` sans simulation des notifications : service demandé/approuvé/annulé, notifications destinataire en base, liste d'un tiers vide et approbation interdite ; créneau vétérinaire créé, demandé, confirmé, annulé puis réservé à nouveau, historique conservé, notifications persistées et refus contrôlé.

**État final :** `PASS_LOCAL` pour ces scénarios API/SQLite. Les parcours hébergés complets de réservation, de règlement manuel et d'avis restent à réaliser sur ressources de validation autorisées. Aucun paiement réel activé.

## Matrice ciblée des fonctionnalités restantes

Les chemins HTTP ci-dessous sont préfixés par `/api`. `PASS_LOCAL` concerne uniquement les preuves nommées. Les tests responsive avec API simulée prouvent le rendu et la navigation, pas une transaction hébergée.

| Fonctionnalité | Backend / routes | React et Expo | Preuve exécutée / état final | Dépendance et limite restante |
| --- | --- | --- | --- | --- |
| Demande de service | ReservationController → ReservationService ; POST `/reservations` | ServicesMarketplacePage, FeedPage, ReservationsPage ; Expo renvoi web pour gestion des réservations | ReservationApiTest + nouveau test SQL/notifications : PASS_LOCAL | Mutation de bout en bout hébergée NOT_TESTED |
| Approve/reject/cancel/complete | POST `/reservations/{id}/{approve,reject,cancel,complete}` | ReservationsPage, mêmes permissions Laravel | ReservationApiTest et tests React, PASS_LOCAL | Clôture soumise au paiement admissible ; aucun contournement ni paiement réel |
| Historique/facture | GET `/orders/history`, `/reservations/{id}/invoice` | OrderHistoryPage, InvoicePage ; liens web Expo | Tests Laravel de clôture/historique/facture, PASS_LOCAL | Nouvelle transaction hébergée NOT_TESTED |
| Notifications de réservation | Notifications Laravel database, GET `/notifications`, POST lecture | NotificationsPage/NotificationProvider, polling ; écran Expo | Écriture SQL réelle demande/approbation/annulation, tests liste/lecture existants : PASS_LOCAL | Aucune livraison email/SMS induite |
| Disponibilités vétérinaires | VeterinarianAppointmentController ; GET/POST `/veterinarians/{id}/availability`, DELETE `/veterinarian-availability/{id}` | VeterinariansMarketplacePage, VeterinarianAppointmentsPage ; découverte/créneaux Expo | VeterinarianAppointmentApiTest : conflits, double réservation, suppression occupée ; PASS_LOCAL | Renouvellement automatique fictif dépend du scheduler |
| Demande/confirmation/annulation/refus | POST `/veterinarians/{id}/appointments`, PATCH `/veterinarian-appointments/{id}/status` | Page React et écrans appointments Expo ; refus React ajouté | Tests règles, participants, notifications SQL et refus UI : PASS_LOCAL | Parcours multi-comptes hébergé NOT_TESTED |
| Historique et avis vétérinaires | GET `/veterinarian-appointments`, POST `/{id}/review` | VeterinarianAppointmentsPage, appointments Expo | Tests client seul, état terminé, délai et unicité : PASS_LOCAL | Validation sur appareil et mutation hébergée NOT_TESTED |
| MFA administrateur | AdminMfaController/AdminMfaService/EnsureAdminMfaVerified ; `/admin/mfa` et actions existantes | AdminSecurityPage, AdminRoute ; pas d'espace admin natif | AdminMfaTest + intégration revue/badge + UI erreur/challenge : PASS_LOCAL | App d'authentification et session hébergée autorisée requises pour dernière revue |
| Documents professionnels | ProfessionalVerificationController/MediaAssetService ; POST `/professional-verifications`, GET `/professional-verifications/me`, GET document privé | ProfessionalVerificationPage, lien web Expo | ProfessionalVerificationApiTest, R2MediaStorageTest : PASS_LOCAL | Stockage R2 réel déjà testé dans la phase précédente ; aucun nouvel objet cloud ici |
| Revue et badge | PATCH `/admin/professional-verifications/{id}/status`, Profile/UserProfileResource, VeterinarianResource, MarketplacePublishingResolver | AdminProfessionalVerificationsPage, ProfilePage, badges marketplace/native existants | Décision admin MFA persistée et badge après nouvelle lecture, rejet retire le badge : PASS_LOCAL backend | Interface admin de décision complète et badge Expo sur appareil NOT_TESTED ; aucune certification ONSSA/CNDP |
| Modération | AdminContentModerationController, AdminModerationController, ReportController, actions et exports existants | AdminModerationPage, AdminModerationActionsPage ; web | AdminContentModerationTest, AdminModerationApiTest, AdminModerationActionTest, ReportApiTest : PASS_LOCAL | UI responsive vérifiée ; actions privilégiées hébergées NOT_TESTED |
| Utilisateurs | AdminUserModerationController ; GET/POST `/admin/users`, PATCH suspension/ban | AdminUsersPage/CreateUserForm ; web | AdminUserModerationTest : rôles, auto-ban interdit, révocation tokens, écritures suspendues : PASS_LOCAL | Aucun compte hébergé suspendu, modifié ou supprimé |
| Reels | GET `/posts?media_kind=video` puis mutations de posts existantes | Nouvelle ReelsPage ; ReelsScreen Expo existant séparé | Filtrage/permissions Laravel, UI React, décodage Chromium cinq largeurs : PASS_LOCAL | Pas de validation hébergée du nouveau parcours, ni appareil natif |
| Authentification et isolation | AuthController/Sanctum/cookies/CSRF/proxy existants | AuthContext/Layout/client publiés, auth native distincte | Suite Laravel complète et 25 scénarios Playwright logout : PASS_LOCAL | Aucun fichier d'authentification ni proxy modifié par cette candidate |
| Langues/thèmes/navigation | Router et fournisseurs existants | Layout/I18n/Theme, nouvelle route dans menus ; shell Expo conservé | Cinq scénarios responsive sur 21 routes dont Reels, FR/EN/AR, RTL, clair/sombre : PASS_LOCAL | Pas le produit cartésien de toutes les routes/tailles/langues/thèmes |

## Exploitation : emails, scheduler, queues et Reverb

La configuration hébergée de référence est celle vérifiée lors de la publication du 18 octobre, pas une configuration supposée d'après un `.env` local. Aucun paramètre distant n'est modifié dans cette phase.

| Système | État initial confirmé par le rapport public | Analyse / résultat local | État final et limite |
| --- | --- | --- | --- |
| Email | MAIL_MAILER=log | Les interfaces signalent les limites de livraison ; aucune identité SMTP disponible n'est inventée. La suite Laravel utilise array/log. | BLOCKED_EXTERNAL_SERVICE pour livraison réelle, NOT_TESTED hébergé ; connexion SMTP/provider et test de réception nécessaires |
| SMS | SMS_DRIVER=disabled | Tests OTP/driver fail-closed inclus dans la suite Laravel | DISABLED_BY_DESIGN ; aucun SMS envoyé |
| Queue | QUEUE_CONNECTION=sync, worker désactivé | Les notifications ShouldQueue sont exécutées en synchronie et persistent réellement dans les nouveaux tests ; heartbeat et configuration couverts par OperationsReadinessTest | PASS_LOCAL pour mode sync ; aucun worker Redis hébergé certifié |
| Scheduler | YAZOO_RUN_SCHEDULER=false | startup.sh sait superviser schedule:work ; OperationsSchedule enregistre heartbeat, purge Sanctum/documents/stories, renouvellement fictif, retries conditionnels et sauvegarde optionnelle. Tests de planification, verrous et purge passent. | DISABLED_BY_DESIGN hébergé ; tests de définition ne prouvent pas un déclenchement périodique réel |
| Stories expirées | Lecture expirée refusée ; purge automatique non exécutée | Tests nettoyage borné, échec stockage, références réessayables et permissions conservés | PASS_LOCAL pour commande ; BLOCKED_INFRASTRUCTURE pour garantie d'exécution automatique actuelle |
| Redis/Reverb | Cache SQL, broadcasting log, Vite realtime false | Architecture Reverb conservée, aucune nouvelle souscription activée. Pas de processus Reverb lancé par startup.sh actuel ni de routage WebSocket public correspondant. | BLOCKED_INFRASTRUCTURE pour WebSocket durable dans la topologie actuelle ; fallback HTTP conservé |
| Polling web | Messages ouverts 15 s, conversations/stories/feed/liste notifications 30 s, aperçus Layout 45 s selon configuration existante | useVisiblePolling borne les cycles, évite leur chevauchement et suspend l'onglet invisible ; tests existants rejoués. Aucun retry automatique de mutation ajouté. | PASS_LOCAL ; preuve hébergée antérieure de messagerie/notifications conservée, pas renommée WebSocket |
| Paiements réels | CMI désactivé | Aucun flag ni credential changé ; règles de paiement/clôture couvertes localement | DISABLED_BY_DESIGN |

**Conclusion Reverb sans frais supplémentaires :** Render accepte les WebSockets, y compris sur un service web Free, mais l'instance peut dormir après 15 minutes sans trafic et être redémarrée. Le compte bénéficie d'un quota mensuel Free partagé. Dans le service existant, PHP-FPM/Nginx exposent l'API ; il manque une topologie Reverb configurée, supervisée et validée. Ajouter un processus/proxy serait possible à étudier, mais ne fournit pas une garantie de disponibilité continue ni une preuve de capacité mémoire ou de reprise des événements. Aucun maintien artificiel de l'instance éveillée, nouveau service ou passage payant n'est ajouté. Le polling est la solution retenue pour cette candidate, sans prétendre à une impossibilité technique absolue du WebSocket gratuit. Sources officielles consultées le 19 octobre : [Render Free](https://render.com/docs/free), [WebSockets](https://render.com/docs/websocket).

Activer simplement le scheduler dans le conteneur Free ne garantit pas non plus son exécution pendant le sommeil. Toute activation future doit tester le comportement des tâches manquées, les verrous SQL, le budget CPU/mémoire et les règles de rétention sur une copie isolée. Ne pas activer des suppressions planifiées ou un driver email pour rendre un tableau artificiellement vert.

## Expo : audit distinct

- Base native examinée : celle du SHA public, Expo `~57.0.30`, React Native `0.86.3`, routes Expo Router sous `mobile/src/app`. Instructions `mobile/AGENTS.md` lues ; références [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) et [AppState](https://reactnative.dev/docs/appstate) consultées. Aucun changement d'API native ni nouvelle dépendance.
- ReelsScreen utilise FlatList vertical, expo-video via SocialVideo, un seul lecteur actif, pause selon focus/AppState/commentaires, pagination avec scan plafonné à cinq pages et déduplication. Il lit encore les pages de feed et filtre les vidéos côté modèle ; l'optimisation par le nouveau filtre serveur n'est pas intégrée à cette candidate native.
- Découverte, créneaux, demandes/statuts/avis, conversations, notifications et services disposent d'écrans/appels existants. La gestion des réservations marketplace, l'historique des commandes et la vérification professionnelle ouvrent explicitement les parcours web ; ce ne sont pas des interfaces de gestion natives équivalentes.
- Dans cette base, le chargement des conversations/notifications dépend de l'ouverture de l'écran et de l'actualisation manuelle. Aucun polling natif comparable au fallback React ni réception push en arrière-plan n'est certifié. L'absence de Reverb n'est pas masquée par une promesse de réception native temps réel.
- 63 tests de contrats/modèles natifs exécutés, lint Expo et TypeScript réussis. Ils couvrent notamment Reels, déduplication, lecture au premier plan et contrats réseau/navigation. **NOT_TESTED sur appareil Android/iOS**, démarrage natif, codecs matériels, cookies web externes, transition web/native et réception simultanée réelle.
- Les modifications natives indépendantes du workspace initial ne sont ni remplacées ni intégrées implicitement à la branche. Leur intégration éventuelle doit être revue séparément avant une release native. Aucun APK/AAB/OTA ou store publié.

## Résultats des tests et portée des preuves

Environnement Laravel : image locale PHP 8.4 `yazoo-api:closure`, réseau Docker désactivé, SQLite `:memory:` imposée par phpunit.xml, cache/session/mail de test, clés R2 vides, fichiers synthétiques/fakes. Les dépendances backend ont été copiées dans le worktree après constat que Docker ne résout pas une jonction Windows de vendor ; aucune modification de vendor dans le worktree publié. Mémoire CLI 512 Mo réservée à la suite locale. Aucun test RefreshDatabase n'a été dirigé vers TiDB.

- Laravel complet : **485 tests, 2 898 assertions, succès**. Après extension des assertions du refus : les **4 tests ajoutés, 62 assertions, succès**. La seconde exécution ciblée remplace leur preuve précédente ; les comptes ne sont pas additionnés.
- React complet final : **240 tests dans 62 fichiers, succès**. Nouvelle couverture : quatre tests Reels, deux MFA et deux refus de rendez-vous. Les assertions existantes sont conservées. Log local : `output/final-feature-completion/react-tests.log`.
- Playwright : **5 tests Reels** avec vidéo réelle et API simulée ; **30 tests** responsive/logout avec API simulée, succès. Les 30 comprennent cinq contrôles responsive sur 21 routes et 25 scénarios logout : quatre pages × cinq largeurs, erreurs 419/429/503, cookie survivant et changement client/vétérinaire/client.
- Expo : **63 tests**, lint et typecheck, succès ; contrats locaux seulement.
- ESLint frontend, TypeScript frontend, build Vite et vérification des placeholders légaux : succès. Le build local neutre n'active aucun service externe. Les pages SEO statiques sont ignorées tant que VITE_SITE_URL n'est pas défini ; un build de release devra fixer les valeurs publiques appropriées.
- Pint : quatre fichiers PHP modifiés/ajoutés, succès. `git diff --check` : succès.
- Les premières exécutions ont mis en évidence un problème de montage vendor Windows et un sélecteur de test utilisant une apostrophe différente du libellé réel « J'aime » ; ces problèmes de harnais ont été corrigés. Aucun test ni assertion métier supprimé pour obtenir les succès finaux.
- Pas de nouvelle exécution de concurrence MySQL, S3Mock/R2 réel, scan d'image ou test de conteneur de release : les correctifs portent sur filtrage de posts et UI/tests, les locks et dépendances sont inchangés. Les preuves antérieures restent datées du SHA publié ; elles ne certifient pas une nouvelle image non construite.

## Protection des données et conditions de dernière validation

Aucune connexion de test à TiDB, mutation hébergée, migration distante, seeder distant, accès destructif R2, changement de secret ou de variable Render/Pages. Les 20 comptes d'origine et les données existantes n'ont pas été utilisés pour des mutations. Leur conservation pendant cette phase résulte de l'absence de toute écriture distante ; aucun nouveau contrôle exhaustif de leurs empreintes n'est prétendu. Les preuves de sauvegarde/restauration et de conservation du 18 octobre restent dans le rapport public. Aucun volume Docker existant supprimé.

Candidate prête pour revue et **validation hébergée contrôlée avec limites explicites**, pas pour une certification globale sans réserve. Avant une publication ultérieure :

1. Revoir les seuls fichiers listés dans le manifeste, créer un SHA de candidate explicite et exécuter la CI sur ce SHA ; ne pas publier une image étiquetée avec le SHA de base alors que le worktree contient des modifications.
2. Construire/scanner l'image exacte et refaire les contrôles de startup/préservation avant tout déploiement autorisé. Aucune migration ajoutée dans cette candidate.
3. Utiliser exclusivement des identités et ressources de validation autorisées pour réservation service, confirmation/annulation/refus, notifications/historique, MFA administratif, décision professionnelle et badge. Ne jamais approuver le dossier hébergé synthétique « non valide » de la précédente QA.
4. Tester le nouveau parcours Reels contre Laravel et le stockage privé réels : upload vidéo depuis le feed, présence Reels, commentaires/réactions persistés entre deux comptes, retrait/permissions et rechargement, sur desktop et mobile. Un lecteur Chromium avec API simulée ne remplace pas ces opérations.
5. Conserver polling, CMI/SMS désactivés et affichage honnête des limites email. Décider séparément d'un fournisseur email et d'un déclenchement scheduler fiable, avec validation de rétention et aucun nouveau coût implicite.
6. Effectuer la revue native séparée, y compris réception/actualisation et transitions vers le web sur appareil, avant toute déclaration Android/iOS.

**Aucun déploiement pendant cette phase. La version publique fonctionnelle reste inchangée.**
