# YaZoo — audit fonctionnel complet de la démonstration

Date : 18 octobre 2026. Travail local, sans commit, push, publication, modification Render/Cloudflare, changement de secret, migration distante ou accès SQL à TiDB. Les modifications présentes avant cette intervention sont conservées, notamment les travaux d’authentification, de bootstrap et de mobile. Aucun dossier de candidature ni logo n’a été modifié par cette intervention.

## 1. Périmètre et niveau de preuve

L’inventaire de référence est [FULL_DEMO_ROUTE_INVENTORY.md](FULL_DEMO_ROUTE_INVENTORY.md) : **160 routes API enregistrées par Laravel, 47 pages React, 25 fichiers de services métier**, contrôleurs, clients et fonctions appelantes, pages dépendantes, chemins de navigation, conditions de configuration, tests candidats et inventaire natif séparé. Il couvre toutes les routes de `backend/routes/api.php`, y compris callbacks, endpoints natifs et routes techniques. Les points de santé, Sanctum et broadcasting hors de ce fichier sont étudiés séparément ci-dessous.

Sources examinées : README et AGENTS racine ; routes, contrôleurs, services et configuration Laravel ; App, Layout, AuthContext, clients API, pages et Functions React ; application, API, navigation et session natives ; `AUTH_PRESERVATION_REPORT.md`, `AUTH_VALIDATION_REPORT.md`, `SHOWCASE_STARTUP_AUDIT.md`, `RENDER_TIDB_RELEASE_PLAN.md`. Les constats historiques de ces rapports ne sont pas utilisés comme preuve d’un nouveau test.

Les correspondances de l’annexe sont calculées à partir des chemins et des symboles importés. Elles restent des correspondances statiques candidates, particulièrement pour les fonctions passées en callback et les URLs fournies par le serveur. Les tests candidats trouvés par littéral ne sont pas une certification de toutes les branches d’un endpoint.

Statuts employés :

- **PASS** : test correspondant exécuté avec succès, dans le périmètre indiqué ; jamais une certification implicite du showcase public.
- **FAIL** : défaut reproduit encore présent.
- **DISABLED_BY_DESIGN** : fonction volontairement désactivée dans le profil indiqué.
- **NOT_IMPLEMENTED** : comportement ou interface absent ; une route technique sans bouton utilisateur ne constitue pas automatiquement une lacune.
- **NOT_TESTED** : preuve d’exécution insuffisante pour le parcours considéré.
- **BLOCKED_BY_INFRASTRUCTURE** : service externe ou configuration effective indisponible pour valider ce parcours.

Les suites Laravel utilisent SQLite en mémoire avec garde-fou dans `Tests/TestCase.php`. L’API HTTP de test utilise exclusivement `/tmp/yazoo-veterinarian-e2e.sqlite` dans un conteneur jetable, avec un `.env` neutre monté en lecture seule. Aucun test n’utilise TiDB hébergé. Les deux identités client/vétérinaire et leurs mots de passe sont des fixtures locales fictives, pas des identifiants de production. Les tests Docker de démarrage créent leurs propres conteneurs et fichiers SQLite dans `/tmp`.

Les 20 comptes TiDB annoncés sont préservés par **absence de toute opération sur cette base**. Leur nombre actuel et leurs hashes n’ont pas été relus ou certifiés ici.

## 2. Cause du problème de déconnexion

Le backend possédait déjà la suppression du `currentAccessToken()` Sanctum et un cookie expiré portant le même nom, chemin `/` et domaine configuré. Les tests prouvent que l’ancien cookie est refusé après révocation. Aucune preuve locale n’indique que cette révocation Laravel soit la cause du profil réaffiché ; la configuration réellement déployée n’a pas été inspectée.

Les défauts confirmés dans le frontend étaient les suivants :

1. L’état privé n’était effacé que dans le `finally` du logout, après l’attente réseau. Un réveil Render laissait donc l’ancien compte visible pendant la requête.
2. Une réponse tardive de login/register et les fonctions `setUser` conservées par une ancienne page pouvaient réintroduire des données du compte quitté. Exemple concret : le rollback de langue dans Settings réappliquait `previousUser` en cas d’erreur.
3. Les autres onglets n’étaient pas invalidés. Des états de pages et de notifications pouvaient survivre à un changement de compte.
4. Après un échec réseau, un rechargement pouvait retrouver le cookie encore actif ; l’effacement local seul ne prouvait pas la révocation serveur.
5. La redirection du Layout conservait `/profile/:ancienId` dans `returnTo`. La connexion suivante pouvait donc afficher à nouveau le profil social précédemment visité, même si l’identité connectée avait changé. Ce profil public et la session courante doivent être distingués.
6. Sur petit écran, le panneau d’onboarding interceptait le bouton logout du tiroir mobile : même niveau de superposition, panneau rendu ensuite. Ce blocage a été reproduit par Playwright.

## 3. Correctifs implémentés

### Frontière de session

`AuthContext.jsx` invalide immédiatement l’identité, la révision d’authentification et les requêtes de l’ancien compte, ferme le temps réel et efface l’identité de monitoring. Le sous-arbre sous AuthProvider est remonté avec une nouvelle clé : pages, formulaires privés, notifications et états locaux ne sont pas réutilisés entre comptes. Les fournisseurs de langue et de thème restent au-dessus de cette frontière.

Le client Axios attribue une génération de session aux requêtes. Les réponses et erreurs d’une génération précédente sont rejetées comme obsolètes ; notamment, un ancien 401 ne déconnecte pas le nouveau compte. Le setter public de l’utilisateur vérifie également la révision capturée par la page qui l’appelle.

Une clé locale non sensible `yazoo:session-barrier` empêche un bootstrap silencieux après logout, y compris après échec et rechargement. Aucun token ni profil n’y est stocké. Une connexion explicite réussie lève ce verrou. Les événements storage invalident les autres onglets ; une restauration BFCache ne conserve pas les données privées. Un nouvel onglet n’est pas automatiquement connecté à la suite d’un changement de compte dans un autre onglet : il doit se reconnecter.

Le logout est dédupliqué. Une connexion encore en vol est attendue avant sa révocation pour éviter qu’un `Set-Cookie` tardif ne recrée la session après le logout. Le frontend effectue **un seul POST**, sans replay, puis vérifie que GET `/auth/me` retourne 401. Un échec, un 200 persistant, un 419/429/503 ou un résultat ambigu ne produit aucune confirmation de révocation : l’interface devient publique, reste verrouillée au rechargement et affiche une erreur explicite FR/AR/EN.

Le Layout redirige vers `/login` sans `returnTo` d’un ancien profil lorsque la session vient d’être terminée. Le retour demandé par un visiteur initial reste conservé. Le tiroir mobile passe au-dessus de l’onboarding, sans remplacement du design.

### Confidentialité HTTP et conteneur

Le middleware JSON ajoute `Cache-Control: no-store, private` aux réponses authentifiées par cookie/Bearer et aux réponses des routes d’authentification. Les cookies Sanctum et CSRF restent gérés par Laravel. Le proxy conserve les cookies séparément, retire Domain et impose Secure ; les tests vérifient aussi le cookie expiré et la conservation de no-store. Aucun contournement CSRF ou Sanctum n’a été introduit.

Le cookie `XSRF-TOKEN` peut rester présent après logout : il protège les mutations, ne représente pas l’identité Sanctum et ne doit pas être confondu avec `yazoo_api_token`. Les essais HTTP réels démontrent l’absence de ce dernier et le 401 après déconnexion.

Le build Docker depuis le checkout Windows a reproduit `yazoo-startup: not found` malgré la présence du fichier : les scripts copiés avaient des fins de ligne CRLF. `Dockerfile.api-demo` normalise uniquement les deux scripts exécutables copiés avant chmod. Les scripts sources et les changements locaux de startup sont conservés.

### Fonctions backend raccordées aux pages existantes

| Fonction auparavant sans parcours complet | Intégration ajoutée | Limite volontaire |
|---|---|---|
| Consultation des paiements et de leur référence | Réservations, Historique, Commandes admin : panneau utilisant GET paiements et GET paiement | Chargement à la demande ; aucun transfert simulé |
| Demande de règlement manuel | Réservation approuvée côté acheteur : espèces au retrait / virement manuel, via endpoint existant | Déclaration de suivi explicitement expliquée ; aucun encaissement automatique |
| Confirmation manuelle | Vendeur pour espèces ; administrateur pour virement et espèces ; note obligatoire pour virement ; confirmation explicite | Backend reste autorité ; aucune option CMI ajoutée ou activée |
| Avis de réservation terminée | Formulaire note/commentaire quand `reviews.hasPendingReview` est vrai | Minimum 10 caractères, succès uniquement après réponse serveur |
| Modération des avis | Section de la page de modération existante, pagination et motif | Statuts Laravel existants uniquement |
| Demandes de suppression | Consultation et qualification pending/reviewed/rejected dans la modération existante | Exécution effective `completed` non proposée dans le showcase pour préserver les comptes |
| Création administrative d’utilisateur | Formulaire repliable dans Utilisateurs | Nouveau compte uniquement ; aucun changement de mot de passe existant |
| Renvoi de vérification email | Paramètres | Notice explicite : acceptation de demande ne prouve pas livraison, pas d’email sans service externe |
| Retrait de disponibilité vétérinaire | Liste des créneaux dans le parcours propriétaire existant | Validation serveur ; refus d’un créneau occupé conservé |
| Accès au justificatif de son propre dossier | Historique de vérification professionnelle | URL autorisée fournie par le serveur, permissions backend conservées |

Les ajouts utilisent les composants Button, les cartes, les couleurs, la langue, le thème et le RTL existants. Aucun nouvel endpoint Laravel n’a été créé. Le module `api/demoIntegration.js` centralise uniquement les appels manquants.

## 4. Inventaire fonctionnel et preuves

Le tableau donne le **statut dans le périmètre de test mentionné**. L’annexe conserve `NOT_TESTED` pour un endpoint dont toutes les branches et le parcours utilisateur complet n’ont pas été exercés. Une suite API verte n’est pas une preuve d’exécution publique du frontend.

| Domaine / fonctionnalité | Interface desktop et responsive | Preuve exécutée | Statut |
|---|---|---|---|
| Inscription email/mot de passe | Register | AuthApiTest, MobileAuthApiTest ; UI Login/Register existante | PASS (API isolée) |
| Connexion email/mot de passe | Login | AuthApiTest ; logout-fullstack ; auth-isolated FR/AR/EN | PASS (API + navigateur local) |
| Déconnexion / cookie / changement de compte | Layout, menu mobile, Settings | LogoutIsolationTest ; AuthLogoutRegression ; logout-isolation ; logout-fullstack | PASS (local) |
| Profil personnel et profil d’un utilisateur | Profile | ProfileApiTest ; logout-fullstack sur `/profile` et `/profile/:id` | PASS (local, parcours testés) |
| Modification de profil et langue | Profile, Settings | ProfileApiTest, SupportedLocaleTest ; protection du rollback par AuthLogoutRegression | PASS (API et régression) |
| Récupération et réinitialisation de mot de passe | ForgotPassword, ResetPassword | AccountSecurityTest | PASS (API avec mail factice de test) |
| Livraison réelle des emails | Paramètres / récupération | Exemple showcase MAIL_MAILER=log ; aucun fournisseur réel testé | BLOCKED_BY_INFRASTRUCTURE |
| Renvoi de vérification email | Settings | Endpoint existant, rendu responsive ; livraison non testée | NOT_TESTED (parcours de livraison) |
| Vérification email par lien signé | Lien reçu par email, pas une nouvelle page à inventer | AccountSecurityTest | PASS (API isolée) |
| OTP SMS | Aucune saisie web OTP raccordée ; inscription email disponible | AuthApiTest vérifie l’indisponibilité SMS | DISABLED_BY_DESIGN (SMS_DRIVER=disabled de l’exemple) |
| OAuth Google | Bouton Login/Register conditionnel | AuthApiTest ; configuration publique effective non inspectée | BLOCKED_BY_INFRASTRUCTURE (OAuth réel) |
| Permissions, suspension, ban | Guards, admin et contrôles métier | MarketplacePublishingAuthorizationTest, PostVisibilityAuthorizationTest, AdminUserModerationTest | PASS (API isolée) |
| MFA administrateur | AdminSecurity | AdminMfaTest ; rendu navigateur | PASS (API isolée) |
| MFA utilisateurs ordinaires | Pas de parcours ni endpoint correspondant | Inventaire routes | NOT_IMPLEMENTED |
| Feed et publications CRUD | Feed / Profile | FeedApiTest, PartialUpdateContractsTest ; rendu responsive | PASS (API isolée) |
| Images/vidéos de publications | Composers existants | PostMediaSecurityTest, MediaAuthorizationTest, ShowcaseUploadPolicyTest | PASS (politiques locales) |
| Upload effectif showcase sans R2 | Composers avec erreurs explicites existantes | ShowcaseUploadPolicyTest, R2ShowcasePolicyTest | DISABLED_BY_DESIGN (flag false) |
| Stories, consultation et suppression | Stories du Feed | StoryApiTest | PASS (API isolée) |
| Likes, commentaires et réactions | PostCard / Feed / Profile | FeedApiTest ; contrats API React | PASS (API isolée) |
| Abonnements, abonnés, suggestions | Profile / Feed | ProfileApiTest, SocialTrustApiTest | PASS (API isolée) |
| Communautés, membres, demandes | Communities / CommunityDetail | CommunityApiTest ; rendu responsive | PASS (API isolée) |
| Messagerie directe, lecture, envoi persistant | Messages et dock existants | MessagingApiTest ; veterinarian-fullstack avec deux navigateurs et rechargement | PASS (local) |
| Notifications et compteurs | Notifications, menus | NotificationApiTest, SearchAndUnreadApiTest ; rendu responsive | PASS (API isolée) |
| Temps réel WebSocket | Abonnements existants, fermeture au logout ; polling existant | Aucun serveur Reverb utilisé par ces tests navigateur | DISABLED_BY_DESIGN (broadcast log / realtime false de l’exemple) |
| Animaux CRUD et restrictions légales | Marketplace animaux / détail | AnimalApiTest, MarketplaceModerationVisibilityTest, AdminAnimalReviewApiTest | PASS (API isolée) |
| Catalogue public animaux | Discover, flag pilote/showcase | PublicFeatureConfigTest, PublicMarketplaceApiTest | DISABLED_BY_DESIGN dans le pilote par défaut ; showcase conditionnel |
| Produits CRUD | Marketplace produits / détail | ProductApiTest ; tests React ProductsMarketplacePage | PASS (API et composant isolés) |
| Services CRUD et types | Marketplace services | ServiceListingApiTest ; ServicesMarketplacePage tests | PASS (API et composant isolés) |
| Vétérinaires CRUD et profil professionnel | Marketplace vétérinaires / Discover / détail public | VeterinarianApiTest ; 48 variantes de profil public en navigateur réel | PASS (local, parcours testés) |
| Recherche et filtres | Search / catalogues | SearchAndUnreadApiTest, PublicMarketplaceApiTest ; recherche vétérinaire en navigateur réel | PASS (local, hors équivalence SQL TiDB) |
| Favoris | Contrôles des catalogues / natif | SocialTrustApiTest et contrats existants | PASS (API isolée) |
| Réservations et historique | Reservations / OrderHistory | ReservationApiTest ; ReservationsPage.test | PASS (API et composant isolés) |
| Factures | Invoice | ReservationApiTest | PASS (API isolée) |
| Paiement manuel : demande, consultation, confirmation | Reservations / History / AdminOrders | PaymentApiTest ; DemoIntegration.test sur note et confirmation | PASS (API et composant isolés, aucun argent réel) |
| Avis après réservation | Reservations / History | SocialTrustApiTest ; DemoIntegration.test sur erreur puis succès | PASS (API et composant isolés) |
| Livraison, retrait et statuts | Reservations | ReservationApiTest, PaymentApiTest | PASS (API isolée ; suivi manuel, aucun transporteur connecté) |
| Paiement CMI réel | Préparation existante, bouton conditionnel conservé | PaymentApiTest sur refus/garde-fous, aucune transaction externe | DISABLED_BY_DESIGN |
| Stripe / Payzone | Providers désactivés côté backend | Config payments.php | DISABLED_BY_DESIGN |
| Disponibilités vétérinaires | VeterinarianAppointments en mode propriétaire | VeterinarianAppointmentApiTest ; tests React de réservation | PASS (API isolée) |
| Suppression de créneau via nouvelle interface | Même page, liste ajoutée | API couverte ; rendu web vérifié, clic destructif UI non exercé | NOT_TESTED (nouveau clic navigateur) |
| Demande de rendez-vous et persistance | Profil public → Login → Appointments | veterinarian-fullstack, VeterinarianAppointmentApiTest | PASS (local) |
| Confirmation, annulation, fin de rendez-vous et avis | VeterinarianAppointments | VeterinarianAppointmentApiTest ; composant React | PASS (API et composant isolés) |
| Modération contenus et signalements | AdminModeration, AdminAnimalReview | AdminModerationApiTest, AdminContentModerationTest, ReportApiTest | PASS (API isolée) |
| Modération des avis | Nouvelle section AdminModeration | SocialTrustApiTest ; DemoIntegration.test | PASS (API et composant isolés) |
| Utilisateurs et création de nouveau compte | AdminUsers | UserControllerTest, AdminUserModerationTest ; DemoIntegration.test | PASS (API et composant isolés) |
| Vérification professionnelle et document privé | Settings/professional-verification, AdminProfessionalVerifications | ProfessionalVerificationApiTest ; tests React ; MediaAuthorizationTest | PASS (API/composants existants ; nouveau lien propriétaire non cliqué) |
| Demandes de confidentialité | PrivacySettings / AdminModeration | PrivacyApiTest ; DemoIntegration.test | PASS (API et qualification UI isolées) |
| Suppression effective de compte | Backend existant, sans action completed dans le nouveau panneau showcase | AccountDeletionRetryTest ; aucune action sur comptes réels | DISABLED_BY_DESIGN (nouvelle interface showcase) |
| Statistiques, commandes et exports CSV admin | AdminStats / AdminOrders / autres pages admin | AdminBusinessKpiTest, AdminOrdersApiTest, AdminExportTest | PASS (API isolée) |
| Actions de modération et audit | AdminModerationActions | AdminModerationActionTest | PASS (API isolée) |
| CSRF / Sanctum / rate limiting | Clients web et proxy | AuthApiTest, LogoutIsolationTest, MobileAuthApiTest ; cookies HTTP réels | PASS (local) |
| Erreurs HTTP et réveil | Error toast, DemoServerStatus, login | client/classifyError tests, cold-start, logout erreurs 419/429/503 | PASS (simulations locales) |
| Proxy Cloudflare et Set-Cookie | Functions api/sanctum/storage/broadcasting | proxy.test : cookies séparés, expiration, Secure, no-store, absence de replay | PASS (unitaire, runtime Cloudflare non testé) |
| Cache privé | API authentifiée + frontière React | LogoutIsolationTest, client stale-response, proxy cookies | PASS (local) |
| Recherche FULLTEXT et transactions TiDB | Backend MySQL compatible | SQLite ne valide pas ces propriétés | NOT_TESTED (moteur TiDB) |
| Stockage R2 privé/public et médias | API médias / documents | R2MediaStorageTest, R2ShowcasePolicyTest, MediaAssetOwnershipTest | PASS (tests avec doubles, compte R2 non testé) |
| Logs, monitoring et readiness | API monitoring, erreurs frontend, health | MonitoringApiTest, OperationsReadinessTest, HealthControllerTest ; Docker readiness | PASS (local) |
| Monitoring externe et alertes d’exploitation | Endpoints et configuration existants | Aucun prestataire ni alerte externe validé | BLOCKED_BY_INFRASTRUCTURE |
| Frontend actuellement publié, bindings et image Render | Hors environnement local de test | Aucune inspection authentifiée ou publication exécutée | NOT_TESTED |

## 5. Routes sans appel API React direct : qualification manuelle

- `/auth/mobile/login` et `/auth/mobile/register` : utilisées par l’application native via construction dynamique ; ne pas les ajouter à l’authentification cookie Web.
- `/auth/google` : lien de redirection fourni par `api/auth.js`. Callback OAuth et vérification email : routes de redirection/liens signés, pas des actions fetch à exposer séparément.
- `/auth/otp/request` : pas de parcours OTP Web ; SMS désactivé dans l’exemple showcase. Ne pas simuler l’envoi.
- `/media/*` : URLs utilisées comme src/href et contrôle serveur des médias, pas de page autonome manquante.
- `/monitoring/frontend-error` : client monitoring construit depuis appConfig et envoi technique, pas de menu métier.
- `/professional-verifications/:id/document` : lien propriétaire ajouté ; le panneau admin dispose déjà d’un lien de téléchargement. La variante `/admin/professional-verifications/:id/document` est une alternative backend, pas une seconde fonction utilisateur à dupliquer.
- `/reservations/:id` : détail JSON backend existant ; les données détaillées sont déjà accessibles dans les listes, l’historique et la facture. Aucune nouvelle page de détail n’est nécessaire pour dupliquer cette représentation ; cet endpoint spécifique reste NOT_TESTED côté navigateur.
- `/payments/cmi/callback` : callback fournisseur, volontairement désactivé dans le showcase ; aucune commande utilisateur manquante.
- GET `/api` : identité technique de l’API, aucune page privée requise.

## 6. Desktop, responsive et application native

Le web reste une seule application React responsive. Les scénarios logout couvrent **320, 375, 768, 1024 et 1440 px**, depuis `/profile`, `/profile/:id`, `/feed`, `/settings`, via menu mobile ou bouton desktop. Ils vérifient retour navigateur, rechargement et absence du nom privé. La matrice `full-demo-responsive.spec.js` visite 20 routes à chacune de ces largeurs, contrôle débordement, exceptions JavaScript, langue, RTL et navigation. Les fixtures de cette matrice contiennent principalement des listes vides : ce test ne certifie pas toutes les cartes, modales ou mutations en données réelles.

Les profils vétérinaires publics réels de la fixture SQLite ont été testés dans **48 combinaisons** : FR/EN/AR × clair/sombre × 320/360/375/390/412/768/1024/1440. La réservation réelle et la messagerie bidirectionnelle persistent après rechargement. Les changements de compte et deux onglets sont testés avec Laravel réel à 375 et 1440 px, dans les deux ordres.

Le dossier `mobile/` est une application Expo/React Native distincte, avec API Bearer via `/auth/mobile/*`, SecureStore et navigation Expo Router. Il possède Feed, Stories/Reels, publication, communautés, notifications, favoris, marketplace, profils sociaux, découverte professionnelle, services, rendez-vous et messagerie. Réservations, historique et vérification professionnelle ouvrent le web ; l’administration complète et les nouveaux panneaux de paiement/modération ne sont pas implémentés comme écrans natifs. Les cookies du web et le Bearer natif ne constituent pas une session partagée automatiquement.

Les 70 tests natifs, lint et TypeScript passent ; ils comprennent validation et effacement de session, erreurs réseau, contrats, navigation et confidentialité. Aucune API Expo n’a été modifiée dans cette intervention. Aucun lancement Android/iOS sur appareil, aucune publication native ni distribution d’APK n’est attesté : **NOT_TESTED sur appareil et déploiement natif**.

## 7. Configuration showcase gratuite

Ces valeurs proviennent des exemples et des sources du dépôt, **pas d’une lecture des variables Render actuelles**.

| Variable / service | Compatibilité et effet |
|---|---|
| `VITE_API_URL` | `/api` recommandé dans la configuration Pages existante : cookie et CSRF same-origin. Le build doit utiliser le profil showcase voulu. |
| `BACKEND_ORIGIN` | Binding serveur Pages, origine HTTPS seule. Ne pas l’exposer comme secret VITE. |
| `CACHE_STORE=database` | Compatible avec un service SQL persistant ; conserver les marqueurs de bootstrap durables et les préfixes approuvés. |
| `QUEUE_CONNECTION=sync` | Compatible sans worker permanent, au prix d’une durée de requête plus longue. Ne prouve pas la livraison d’un email/SMS. |
| `BROADCAST_CONNECTION=log` | Aucun push WebSocket réel ; polling applicatif existant. `VITE_REALTIME_ENABLED=false` cohérent. |
| `SMS_DRIVER=disabled` | OTP indisponible ; pas de code fictif présenté comme reçu. |
| `MAIL_MAILER=log` | Pas d’email livré. Récupération et vérification nécessitent un vrai transport pour une utilisation réelle. |
| `CMI_ENABLED=false` | Conserver ; contrats, sandbox, homologation, clés complètes et PAYMENTS sont d’autres garde-fous. Aucun vrai paiement activé. |
| `YAZOO_SHOWCASE_UPLOADS_ENABLED=false` | Conserver sans stockage objet persistant configuré. Ne pas utiliser le filesystem Render comme stockage durable d’uploads. |
| `MEDIA_STORAGE_DRIVER`, R2 et disque documents | Nécessaires pour persistance et confidentialité des nouveaux médias/documents. Tests avec doubles ≠ validation du bucket réel. |
| `STARTUP_PILOT`, `ANIMAL_LISTINGS_PUBLIC`, `PRODUCT_MARKETPLACE`, `SOCIAL_FEED`, `COMMUNITIES` et homologues VITE | Distinguer profil pilote/showcase ; garder backend et build frontend cohérents. Les valeurs actuelles hébergées restent à relever. |
| TLS, domaine/SameSite/Secure des cookies, CORS, Sanctum, `APP_URL` | À contrôler sur la paire réelle Pages/Render avant publication. Aucun réglage changé ici. |

Render Free met un service en veille après 15 minutes sans trafic et utilise un filesystem éphémère ; les disques persistants demandent une offre payante. Le réveil peut dépasser les délais de requêtes. Ce comportement est documenté par [Render Free](https://render.com/docs/free) et [Persistent Disks](https://render.com/docs/disks), consultés pendant cet audit. Avec un seul service gratuit, ne pas promettre un worker/scheduler/Reverb permanent. Les capacités métier synchrones SQL peuvent fonctionner, mais la disponibilité continue et la livraison externe ne sont pas garanties par cette architecture.

Le proxy existant borne les lectures à 12 s et les mutations à 65 s ; le client Web attend jusqu’à 75 s pour une mutation. Une erreur 503 pendant le réveil ne prouve pas que la mutation n’a pas eu lieu. Aucun replay automatique ne doit être ajouté. Pour logout, les données locales sont masquées et la révocation reste explicitement non confirmée jusqu’au contrôle 401.

Cloudflare distingue les cookies multiples des en-têtes ordinaires ; la conservation séparée est conforme aux [API Headers Workers](https://developers.cloudflare.com/workers/runtime-apis/headers/). Le test local du proxy ne remplace pas une vérification de Set-Cookie sur Pages réel.

## 8. Tests exécutés et limites

| Contrôle | Résultat |
|---|---|
| Laravel complet, PHP Herd 8.5, SQLite mémoire | **PASS : 476 tests, 2 797 assertions** |
| Pint sur le nouveau test et le middleware modifié | **PASS** |
| React/Vitest complet | **PASS : 226 tests, 57 fichiers** lors du dernier passage complet, dont 8 tests proxy |
| Régressions privées AuthContext/client | PASS : invalidation immédiate, rollback `setUser`, requête ancienne, login tardif, 419/429/503, cookie survivant, verrou de rechargement, événement onglet/session expirée |
| Nouveaux raccordements métier | PASS : 5 tests DemoIntegration — erreur avis puis succès, note virement obligatoire, modération/pagination, qualification confidentialité sans suppression effective, création d’un compte fictif |
| ESLint / TypeScript Web | PASS |
| Build frontend | PASS ; pages SEO statiques ignorées faute de `VITE_SITE_URL` local |
| Audit traductions FR/AR/EN et Tailwind | PASS : 2 062 clés, 187 classes d’opacité contrôlées |
| Mobile : tests / lint / TypeScript | PASS : 70 tests ; validation statique et tests Node, pas un lancement appareil |
| Playwright API interceptée, logout | PASS : 25 scénarios lors du passage final, incluant Précédent/Suivant et rechargement |
| Playwright réel SQLite | PASS : 53 scénarios (4 changements de compte/deux onglets, 1 réservation/messagerie, 48 variantes de profil public) lors du premier passage complet |
| Validation finale navigateur | PASS : 29/29 (4 scénarios réels changement de compte/deux onglets + 25 logout interceptés). Les 9 scénarios responsive/auth/réveil passent lors du passage précédent. |
| Validateurs startup-release-guards et showcase | PASS |
| Construction locale image PHP 8.4 | PASS : `yazoo-api-demo:full-demo-local`, version locale explicite |
| Smoke image finale | PASS : quatre démarrages/readiness/HEAD/non-root, mauvaise configuration FPM rejetée, timeout FPM rejeté ; conteneurs de test supprimés par le script |
| Tests TiDB/MySQL du showcase hébergé, mails/SMS/CMI réels, Reverb réel, Cloudflare réel, appareil natif | NOT_TESTED / BLOCKED_BY_INFRASTRUCTURE selon le service ; aucune opération distante exécutée |

Les premiers essais ont réellement échoué : superposition onboarding/menu, scripts Linux CRLF, fixture Vitest sans fournisseur d’authentification, et port aléatoire du runner E2E non autorisé par le CORS de la fixture locale. Ces cas ont été corrigés ou exécutés avec la bonne configuration isolée ; ils ne sont pas présentés comme des pannes du showcase public. Un délai de rendu de profil de 5 secondes a aussi été dépassé sur la fixture Windows ; les assertions d’intégration utilisent maintenant un délai de 20 secondes, sans relancer une mutation.

## 9. Fonctions absentes, désactivées et non validées

- Aucun endpoint ni parcours de MFA grand public : **NOT_IMPLEMENTED**. MFA administrateur seulement.
- Aucun service de transport connecté : suivi livraison/retrait manuel existant ; intégration transporteur **NOT_IMPLEMENTED**.
- Aucun parcours OTP web raccordé ; SMS de l’exemple désactivé : **DISABLED_BY_DESIGN**, pas une connexion téléphone à revendiquer.
- La suppression effective via le nouveau panneau est **DISABLED_BY_DESIGN**. Le backend de suppression existe et reste protégé ; il n’a été invoqué que par ses tests mémoire.
- Email réel, SMS, CMI et WebSocket ne doivent pas être présentés comme opérationnels avec log/disabled/false. Les messages métiers distinguent demande enregistrée, paiement reçu et simple état d’interface.
- Le téléchargement propriétaire ajouté, le clic de retrait de créneau, toutes les combinaisons de permissions des nouveaux panneaux en navigateur et tous les parcours longs marketplace/communautés avec médias réels restent **NOT_TESTED de bout en bout**. Les suites API couvrent leurs règles métier ; elles ne remplacent pas cette validation.
- Les variantes SQL FULLTEXT, verrous concurrents et performances TiDB n’ont pas été validées avec SQLite. Aucun test destructif ne doit être lancé contre la base des 20 comptes.
- Avec `SOCIAL_FEED=false`, Profile conserve une dépendance au chargement `/posts` : compatibilité de cette combinaison **NOT_TESTED**, à vérifier avant de publier un profil sans social. Aucun défaut n’est masqué par une réponse vide artificielle.

## 10. Compatibilité du déploiement actuel

Le code est compatible avec le schéma architectural Pages → proxy → Laravel → TiDB, sous les conditions existantes de TLS, cookies, stockage et fonctionnalités. Aucun nouveau schéma SQL ou endpoint n’est requis par ces changements. Le correctif de logout nécessite le nouveau frontend ; no-store et la normalisation des scripts nécessitent la nouvelle image backend.

Les valeurs effectives, le digest Render courant, les bindings Pages, la sauvegarde et le statut des migrations distantes restent **NOT_TESTED**. Les conclusions de `RENDER_TIDB_RELEASE_PLAN.md` concernant la préservation des hashes et du marqueur durable restent applicables ; les anciens runbooks proposant reseed/reset/synchronisation de mots de passe ne doivent pas être utilisés.

## 11. Conditions avant publication

1. Revoir les changements de cette intervention séparément des modifications locales déjà présentes. Aucun commit/push n’a été fait.
2. Relever la configuration effective et les références d’images/déploiements Pages/Render, sans changer les secrets ni les variables pendant cet audit.
3. Faire vérifier une sauvegarde restaurable des données et des marqueurs existants, et un repli qui préserve les mots de passe et n’exécute aucun reseeding. Les 20 comptes ne sont pas une base de test.
4. Construire les artefacts depuis une révision approuvée avec les bons flags et l’origine SEO ; exécuter CI et contrôles de sécurité requis sur cette révision exacte. L’image locale a pour APP_VERSION une valeur locale, pas un SHA de release.
5. Conserver CMI désactivé. Garder uploads/SMS/email/realtime déclarés indisponibles tant que leurs services ne sont pas configurés et validés. Ne pas modifier Render pour masquer un test manquant.
6. Après autorisation distincte de publication, vérifier sur Pages réel les cookies, CSRF, le réveil Render, les droits, la révocation, le changement de compte et le stockage. Utiliser des identités de validation explicitement autorisées, sans changer les mots de passe existants.
7. Pour toute affirmation native, tester un build sur appareil et documenter sa distribution ; aucune publication native ne découle du succès des tests Web.

## 12. Risques résiduels

L’isolation de l’interface ne peut pas révoquer un token sur un serveur inaccessible. Le verrou local protège le rendu mais ne prouve pas la révocation distante ; l’erreur l’indique explicitement. Le stockage local bloqué par le navigateur limite la persistance du verrou entre rechargements ; aucune écriture HttpOnly ne peut être faite par JavaScript pour compenser. Des mutations de connexion réellement simultanées dans plusieurs navigateurs restent hors de la matrice locale ; chaque nouvel onglet est invalidé à réception du changement de session.

Le remontage du sous-arbre à chaque changement de session efface volontairement les brouillons privés. Les listes vides de la matrice responsive ne prouvent pas toutes les cartes riches ; les nouveaux panneaux ont leurs tests de composants et nécessitent encore un parcours opérateur complet sur un environnement de prépublication isolé. Le dashboard admin peut conserver son cache métier existant jusqu’à 30 secondes après une confirmation ; le panneau recharge directement les paiements.

**Décision : correctifs et intégrations locaux testés dans les périmètres documentés ; aucune certification globale du showcase actuellement publié. Publication non effectuée et soumise aux conditions ci-dessus.**

### Note de clôture

Validation achevée : **87 scénarios Playwright distincts réussis sur plusieurs exécutions** : 49 parcours vétérinaires/profils réels, 4 changements de compte réels, 25 régressions logout avec API interceptée, 5 matrices responsive, 3 authentifications mobiles FR/AR/EN et 1 réveil. Le dernier passage des 29 régressions logout est intégralement vert après ajustement du délai d’assertion du profil ; le passage précédent avait 37 succès et un dépassement de ce délai de 5 s. Les échecs initiaux ne sont donc pas cachés dans le total.

Le build, ESLint, TypeScript et l’audit de traductions finaux passent. L’API de fixture a été arrêtée à la fin des tests ; sa base SQLite était interne au conteneur jetable. L’image construite reste uniquement dans Docker local. Aucun changement de déploiement, secret, compte hébergé ou variable Render n’a été effectué.
