# Matrice fonctionnelle backend / Web / Android

PASS signifie une preuve executee dans l'environnement indique, jamais une parite exhaustive. Les resultats cloud du commit final sont attaches au manifeste local `output/release-unified-20261023/`. Le protocole du client natif execute dans un adaptateur WebSocket de navigateur ne constitue pas un test de l'interface Android.

| Fonction | Laravel | React | Expo | Preuve / limite |
| --- | --- | --- | --- | --- |
| Connexion / inscription | /api/auth/* et /api/auth/mobile/* | AuthContext, api/auth.js | App.tsx, api/client.ts, SecureStore | Tests PHP/Web/mobile ; recette live separee |
| CSRF et cookies | middleware cookie_csrf, Sanctum | client.js et proxy sanctum | Bearer, credentials omit | Tests de refus CSRF et identite ; aucune session navigateur supposee native |
| Deconnexion / changement de compte | /api/auth/logout, /me | barrieres et epochs | src/auth/session.ts, logout.ts | E2E de retour/reload et compte A vers B |
| Recuperation / email | /auth/password/*, verification signee | pages reset / verification | contrats auth | Livraison cloud requiert inbox controlee ; HTTP 200 seul insuffisant |
| RBAC / MFA | policies, middleware admin/admin_mfa | AdminRoute, ecrans admin | refus admin | Tests Feature MFA ; pas de nouvel enrollement sur un administrateur reel |
| Feed / posts | /api/posts, PostPolicy | FeedPage, posts.js | useSocial.tsx | Mutations locales isolees et objets QA cloud explicites uniquement |
| Commentaires / likes / partages | posts/comments, like, share | composants feed | composants feed | Tests API et modeles feed ; pas de suppression d'un post historique |
| Stories / expiration | /api/stories, purge bornee | Stories, composer | rail Stories | Tests expiration ; scheduler Free non garanti |
| Reels / videos | filtre media_kind, media controller | ReelsPage | ReelsScreen | Tests navigation et Range ; lecture physique Android NON TESTEE sans appareil |
| Recherche / pagination | /api/search et collections | search, filtres | recherche et decouverte | Contrats statiques, tests et sondes HTTP avec query |
| Communautes / moderation | /api/communities et policies | CommunitiesPage | clients sociaux existants | Tests fonctionnalite et visibilite ; moderation publique reelle non simulee |
| Profils / langues | /api/users/{user} | ProfilePage, Settings | profil, settings, theme | Bio QA restauree ; avatar/cover locaux isoles ; ne pas remplacer un media historique |
| Badge DEMO | ressources et MarketplacePublishingResolver | badges existants | ProfessionalCard | Six tests garantissent absence de badge professionnel reel pour DEMO |
| Verification professionnelle | demandes privees et admin MFA | ecran verification | parcours existant | Aucun document fictif ne vaut une piece reelle, CNDP ou ONSSA |
| Animaux / produits / services | controllers, policies, publishing | marketplace et favoris | marketplace, services | Tests CRUD/owner/visitor ; pas de transaction commerciale |
| Veterinaires / disponibilites | /veterinarians/{id}/availability | fiche et calendrier | discover / appointments | Profils fictifs marques DEMO ; disponibilites non creees sur GET |
| Rendez-vous / conflits | appointments et verrous SQL | parcours veterinaire | App.tsx | Concurrence MySQL jetable ; reservation live uniquement fictive et annulation de notre propre RDV |
| Messages / compteurs | conversations, messages, unread-count | MessagesPage | api et transport realtime | Recette A/B avec GET de rattrapage bloques pendant reception WSS |
| Notifications | notification.created et stockage | NotificationContext | notifications et realtime | Message non lu et notification distincts ; ne pas supposer un push Android |
| Medias prives / R2 | MediaAssetService, MediaController | proxy Range/storage | media.ts | Bucket prive ; lifecycle sur nouvelle cle QA ; cinq objets historiques manquants conserves comme anomalies |
| Reconnexion / fallback | Reverb, broadcasting auth | resync et polling | realtime.ts, reconnexion bornee | Tests locaux + recette live ; aucune disponibilite 24/24 promise |

La matrice exhaustive des routes et appels est exportee en CSV dans les preuves locales. Les chemins, methodes et ressources ont ete compares ; cela ne remplace pas chaque combinaison possible de donnees ou de permissions.
