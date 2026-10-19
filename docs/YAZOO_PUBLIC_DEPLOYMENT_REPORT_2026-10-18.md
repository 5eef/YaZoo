# YaZoo — publication publique du 18 octobre 2026

**Décision finale : DEPLOYED_WITH_LIMITATIONS.** Le backend, le frontend et les Functions sont publiés sur les services existants. Les parcours nommés ci-dessous disposent de preuves hébergées ; les fonctions non testées ou désactivées ne sont pas certifiées globalement.

Rapport finalisé le 2026-10-18 à 23:08 UTC. Il remplace le constat initial `NOT_DEPLOYED_BLOCKED`. Les documents inclus dans le commit applicatif décrivent la préparation ; ce rapport local consigne les résultats obtenus après publication.

## A. Références de release

| Élément | Valeur vérifiée |
| --- | --- |
| Branche applicative publiée | `release/public-2026-10-18` |
| SHA applicatif complet | `9ef598e4ee79cd8384ef71c485c5c76fd7275d01` |
| Image immuable | `5eef/yazoo-api-demo:9ef598e4ee79cd8384ef71c485c5c76fd7275d01` |
| Digest déployé | `sha256:3158e25d2fc05412cbb1d07328433eda10e600ca52f5f1a5832276e17406bc66` |
| Architecture / PHP | Linux amd64 / PHP 8.4.24 |
| Workflow de release | [39171537980](https://github.com/5eef/YaZoo/actions/runs/39171537980), réussi |
| Service Render | `srv-dae5dq1t0dsc738tg0l0`, workspace `tea-dadks8afngtc73fgf0gg` |
| Plan / région / source | Free / Frankfurt / image Docker ; aucun changement de plan |
| Render Deploy ID | `dep-dbakm3vbtjjs73fhv8qg` |
| Mise en ligne Render | `2026-10-18T22:41:53.393921Z` |
| Projet Pages existant | `yazoo-showcase`, Direct Upload |
| Branche de production Pages | `startup-2026`, confirmée via API ; routage de publication Direct Upload du code de la branche de release |
| Pages Deployment ID | `97f5d485-5a4b-45c4-9cd6-d9820a2ef375` |
| Publication Pages | `2026-10-18T22:46:32.814681Z` |
| Preuve du frontend servi | SHA confirmé dans les métadonnées Pages ; 102 fichiers JS/CSS comparés octet pour octet au build local |
| Référence Pages précédente | `3520222f-de1a-4ac4-99ff-6eb7f636332d`, conservée comme référence historique, pas comme secours de sécurité |
| Ancien déploiement Render | `dep-db8cuku89jmc73d2kqhg`, image `bcf017564c9f8f9b38e46728f79f4aa65aa4c300` ; ne pas le redémarrer avec son ancien bootstrap |

La référence persistante Render est le tag SHA complet ci-dessus ; l'API normalise l'affichage de la référence en tag, et le digest du déploiement est vérifié séparément. Les workflows refusent de réutiliser un tag SHA existant. Aucun `latest` n'a été écrasé.

Le manifeste contient **89 fichiers**, empreinte `e251697e581e26a82d9cb534f242e1882688bc208c33e1fdcbeeba587e7ddc54`. Les branches `main` et `startup-2026` n'ont pas été modifiées. Le worktree applicatif reste propre sur le SHA publié ; les modifications indépendantes de `mobile/`, logos et candidatures ne sont pas incluses. Le dossier `output/`, les fichiers d'environnement, sauvegardes et artefacts de tests ne sont pas publiés.

## B. Tests et preuves techniques

| Contrôle | Résultat et portée |
| --- | --- |
| Laravel CI | PASS_LOCAL : **481 tests, 2 840 assertions** ; aucune base TiDB utilisée par les tests destructifs |
| React/Vitest | PASS_LOCAL : **232 tests**, 60 fichiers |
| Playwright CI | PASS_LOCAL : **208 smoke tests**, puis **49 tests du parcours vétérinaire et responsive avec API jetable** ; ces nombres ne représentent pas des tests hébergés |
| Mobile CI du SHA publié | PASS_LOCAL : **63 tests**, zéro échec, lint et types ; les 70 tests locaux antérieurs portaient sur les modifications natives indépendantes, exclues de cette release |
| Pint / syntaxe / lint / types / build | PASS_LOCAL dans la CI ; builds Pages release et secours également réussis, 14 pages SEO générées |
| Test du garde-fou de base | PASS_LOCAL : 10 assertions refusant notamment TiDB, DB_URL et les bases persistantes ; les six tests MySQL de bootstrap passent avec 43 assertions |
| Docker publié, release et secours | PASS_LOCAL : images réellement tirées par digest, amd64, processus serveur UID 82, health checks avant/après redémarrage, SQLite jetable préservée |
| Trivy / secrets CI | PASS_LOCAL : images backend, showcase et frontend sans HIGH/CRITICAL ; scan de secrets réussi, aucune assertion ni exclusion ajoutée pour contourner un échec |
| Secrets dans les bundles Pages | PASS_LOCAL : 280 fichiers release/secours inspectés, aucune valeur secrète serveur recherchée détectée ; aucune valeur affichée |
| npm | Politique résiduelle existante satisfaite ; **cinq alertes HIGH dans l'outillage de build demeurent**. Le contrôle runtime ne signale pas de vulnérabilité. Le résultat npm brut n'est pas présenté comme entièrement vert |
| Santé hébergée | PASS_HOSTED : `/health/live` et `/health/ready` HTTP 200 au SHA publié, avant et après redémarrage réel |
| Publication frontend | PASS_HOSTED : URL canonique et 102 assets correspondant au build publié |
| Parcours fonctionnels publics | PASS_HOSTED : 10 groupes UI/API, détaillés dans la matrice ci-dessous |
| Données des scénarios | PASS_HOSTED : 13 contrôles SQL en lecture seule sur les seuls acteurs synthétiques, dont un message unique lu, commentaire, vue de story, adhésion approuvée et dossier professionnel non approuvé |
| Médias hébergés | PASS_HOSTED : sept groupes API/Laravel/R2, plus preuve de suppression physique de l'objet par HEAD 404 |
| Persistance | PASS_HOSTED : redémarrage Render réellement demandé et nouveau démarrage observé dans les logs ; références et octets avatar/couverture, publication et historique de messages conservés |
| Android/iOS sur appareil | NOT_TESTED : aucune publication native ni validation sur appareil attribuée à ces tests web |

Deux problèmes de banc de validation ont été identifiés sans modifier l'application : Docker top exige la colonne PID pour son inspection ; le formulaire de profil sans fichier utilise PATCH et non POST. Le premier essai de ce dernier test a expiré en attendant la mauvaise méthode ; une lecture a confirmé la sauvegarde avant une nouvelle transition contrôlée, puis le test corrigé a réussi. Aucune mutation incertaine n'a été répétée aveuglément.

## C. TiDB, sauvegarde et intégrité

La cible vient des **variables réellement lues dans Render**, pas du `.env` local : `yazoo_showcase_afwaj`, port 4000, hôte conforme au garde, TLS avec certificat et nom d'hôte vérifiés. Les paramètres de garde de base sont conservés.

- Avant publication : 43 tables, 20 utilisateurs, 64 migrations appliquées ; aucune migration du candidat en attente.
- Sauvegarde logique cohérente : **43 tables, 671 lignes**, chiffrée AES-256-GCM ; clé protégée par DPAPI du propriétaire Windows et dossier sous ACL restrictives. Aucun SQL en clair écrit sur disque.
- **Restauration exécutée** dans MySQL 8.4 jetable, sans port publié : toutes les tables, tous les nombres de lignes et toutes les empreintes de lignes correspondent. Ce n'est pas une restauration native TiDB Cloud ni une restauration de la base active.
- Preuves : `output/public-release/backup-proof.json`, snapshot et clé protégés sous `output/public-release/private-backup/`. Ne pas publier ce dossier. La récupération de la clé dépend du profil Windows DPAPI ; une copie de récupération hors machine reste à organiser par le propriétaire.
- Les sauvegardes automatiques effectives dans le compte TiDB Cloud n'ont pas été consultées, faute d'accès à cette console/API. La récupération démontrée ici est l'export logique chiffré restauré. Les restrictions Starter restent à prendre en compte : [documentation PingCAP](https://docs.pingcap.com/tidbcloud/backup-and-restore-serverless/?plan=starter).
- Aucun snapshot complet ni comparaison exhaustive des octets du bucket R2 d'origine n'a été réalisé. Les références d'origine sont conservées ; seules les clés synthétiques explicitement créées pour les tests ont été ciblées par les suppressions de QA.
- Au démarrage, `yazoo:migrate-production` a été invoqué par le script existant et n'avait **aucune migration à appliquer** : aucune nouvelle opération DDL distante. Aucune commande fresh/refresh/wipe/seed/rollback n'a été exécutée contre TiDB.
- Le marqueur historique `yazoo_cache_yazoo_showcase_bootstrap_v2` était complet ; le correctif a ajouté le marqueur durable `yazoo_showcase_bootstrap_v2` dans `operation_markers`. Aucun reseeding. Les logs confirment la préservation du jeu existant et l'absence de synchronisation des mots de passe.
- Après déploiement et redémarrage : **20 comptes d'origine conservés**, **22 comptes au total**, dont deux nouveaux comptes synthétiques de validation. Le nombre historique n'a pas été rétabli artificiellement.
- Les lignes d'origine de **37 tables** sont comparées par empreintes HMAC et inchangées : identifiants, emails, hashes, profils, permissions, vérifications, publications, messages, notifications, réservations, paiements, relations, créneaux d'origine et tokens d'origine. Les valeurs et hashes ne sont jamais affichés.
- Les tables opérationnelles cache, locks, sessions, jobs et marqueurs sont distinguées de cette comparaison. Des ajouts normaux de créneaux fictifs peuvent résulter du renouvellement existant, sans modifier les rendez-vous ou créneaux d'origine.

Les écritures de QA hébergée concernent les deux nouvelles identités et leurs ressources synthétiques. Le vétérinaire existant utilisé est explicitement un profil DEMO fictif : connexion, lecture de son profil et déconnexion uniquement, sans modification métier ni mot de passe. Le dossier professionnel synthétique porte une mention explicite de non-validité et reste en attente ; aucun badge créé.

## D. Matrice fonctionnelle

Les routes, contrôleurs et écrans détaillés restent décrits dans [l'inventaire](FULL_DEMO_ROUTE_INVENTORY.md) et [la validation sociale locale](SOCIAL_MARKETPLACE_E2E_VALIDATION.md). PASS_HOSTED ne concerne que le scénario et la couche nommés.

| Fonctionnalité | Backend / frontend | Test local | Test hébergé | Statut et limite |
| --- | --- | --- | --- | --- |
| Inscription email/mot de passe | AuthController, Sanctum / RegisterPage | Laravel + React | Deux inscriptions réelles desktop et Chrome mobile émulé | PASS_HOSTED ; validation complète des erreurs reste couverte localement |
| Connexion, déconnexion, changement de compte | AuthController / AuthContext, client, Layout | Régressions Laravel/Vitest/Playwright | Client → vétérinaire fictif → client ; cookie/session révoqués, me 401, reload, retour navigateur, autre onglet redirigé | PASS_HOSTED pour ces parcours ; erreurs 419/429/503 de logout testées localement |
| Profils | ProfileController / ProfilePage | Laravel + React | Nom, ville, bio modifiés via UI mobile, PATCH 200, reload ; refus de modification du profil d'autrui 403 | PASS_HOSTED |
| Avatar et couverture | MediaAssetService / ProfilePage | Laravel + S3Mock | Upload, lecture, remplacement, suppression, ancien URL 404, conservation lors de sauvegarde texte et après restart | PASS_HOSTED Laravel/R2 |
| Posts image, commentaires, likes | Controllers feed / FeedPage, PostCard | Laravel + UI locale | A publie, B voit/commente/like, A retrouve le commentaire, modification par B refusée | PASS_HOSTED pour ces actions ; réponses/réactions détaillées non exhaustives en hébergé |
| Vidéos du feed | MediaController / vidéo existante | Laravel + décodage local | Vrais octets WebM, Range 206, décodage 64×64 Chromium, passage privé et accès anonyme refusé, suppression | PASS_HOSTED ; pas une certification de tous les codecs ou navigateurs |
| Stories image/vidéo | StoryService, MediaController / StoryViewer | Laravel + UI locale | Publication, apparition par polling, vue SQL, durée enregistrée 24 h, lecture privée, no-store, refus anonyme et suppression propriétaire | PASS_HOSTED pour ces cas ; pas d'attente réelle de 24 h |
| Purge des stories expirées | PurgeExpiredStories / scheduler | Tests locaux | Scheduler désactivé dans Render | DISABLED_BY_DESIGN dans la configuration actuelle ; nettoyage automatique non certifié |
| Messagerie | Conversation/Message controllers / MessagesPage | Laravel + UI locale | Deux sessions simultanées, réception automatique HTTP, message unique lu, reload et restart | PASS_HOSTED en polling, pas WebSocket |
| Notifications | NotificationController / NotificationsPage | Laravel + UI locale | Liste visible, suivi/commentaire/message, lecture SQL persistée, refus d'un autre destinataire 404 | PASS_HOSTED pour ces déclencheurs ; autres déclencheurs non exhaustifs |
| Communauté privée | CommunityController / CommunitiesPage, CommunityDetailPage | Laravel + React | Création avec média, demande, refus de publier avant approbation, approbation par propriétaire, publication membre | PASS_HOSTED ; autres opérations de gestion non exhaustives en hébergé |
| Marketplace animaux/produits/services | Controllers existants / pages marketplace | Laravel + parcours locaux documentés | Listes HTTP Laravel et rendu desktop 1440/mobile responsive 375 | PASS_HOSTED pour lecture/navigation ; création/modération/favoris détaillés NOT_TESTED en hébergé |
| Réservations et commandes | Services existants / ReservationsPage, OrderHistoryPage | Laravel et E2E locaux | Liste/historique HTTP et écran | PASS_HOSTED lecture ; nouvelle réservation complète et confirmation NOT_TESTED en hébergé |
| Vétérinaires et rendez-vous | Controllers existants / pages vétérinaires | 49 tests CI du parcours réel jetable | Liste, écrans de rendez-vous et profil du vétérinaire fictif | PASS_HOSTED lecture ; nouvelle disponibilité/réservation/confirmation NOT_TESTED en hébergé |
| Vérification professionnelle | ProfessionalVerification / page de soumission | Laravel + revue admin locale | Soumission synthétique, document privé accessible au propriétaire et refusé à l'autre compte, statut pending, aucun statut vérifié attribué | PASS_HOSTED pour ces étapes ; approbation/rejet administratif et badge après décision NOT_TESTED en hébergé |
| Administration et MFA | Middleware / pages admin | Laravel et CI | Non-admin refusé 403 ; MFA obligatoire confirmé dans Render | PASS_HOSTED refus de rôle ; session admin MFA et actions administratives NOT_TESTED, aucun accès privilégié forcé |
| FR/EN/AR, RTL, clair/sombre | I18n/Theme providers, Layout | CI responsive | Six largeurs 320/375/390/768/1024/1440, trois langues, deux thèmes ; préférences du seul compte synthétique sauvegardées | PASS_HOSTED aux combinaisons testées ; pas chaque écran dans toutes les combinaisons |
| Reels | React router / code natif indépendant | Contrats natifs et vidéo feed | Aucun parcours Reels dédié certifié ; `/reels` n'est pas une route React dédiée dans ce SHA | NOT_TESTED ; les redirections vers feed ne comptent pas comme validation Reels ; lecture vidéo du feed validée séparément |
| Android/iOS natif | Expo / mobile indépendant | CI 63 tests, anciennes preuves locales distinctes | Aucun appareil ni publication native | NOT_TESTED sur appareil |

## E. Services et limites réelles

| Service | État vérifié |
| --- | --- |
| GitHub / Docker Hub | Deux branches et images immuables publiées ; workflows de release et de secours réussis |
| Render | Service existant Free réutilisé, image/version/digest et logs contrôlés ; redémarrage réel validé |
| TiDB | TLS, cible, schéma et préservation contrôlés ; aucune nouvelle base cloud ni migration destructive |
| Pages / Functions | Projet existant, même SHA, proxy `/api`, `/sanctum`, `/storage`, `/broadcasting`, `/demo-backend-status` conservé ; usages testés de cookies, CSRF, médias et Range |
| R2 | Credentials Render comparés en mémoire à ceux déjà validés ; bucket privé existant, uploads déjà activés avant intervention ; cycle Laravel réel et persistance après restart validés |
| Redis | Non utilisé par la configuration actuelle : cache SQL et queue synchrone ; health check Redis skipped ne constitue pas une preuve de connexion |
| Reverb | Broadcasting log, Vite realtime false ; aucune session WebSocket certifiée. Fallback HTTP effectivement testé |
| Scheduler / workers | Tous deux désactivés avant intervention et conservés ; queue synchrone. Les tâches planifiées ne sont pas annoncées comme exécutées |
| Email | MAIL_MAILER=log ; aucune livraison réelle certifiée. L'interface conserve l'avertissement de démonstration |
| SMS | Driver disabled ; aucune livraison simulée annoncée |
| CMI / paiements réels | Désactivés, aucune activation ni transaction réelle |

Render Free peut dormir et imposer un réveil : le proxy existant est conservé. Il ne faut pas déduire de deux health checks verts une validation des services skipped. Aucune dépense, nouveau service cloud ou montée de plan.

## F. Correctifs et sécurité

Les correctifs locaux d'authentification et de préservation sont publiés : révocation Sanctum, expiration du cookie, barrière locale de session, invalidation des réponses obsolètes par époque, coordination interonglets, démontage des données privées et contrôle me 401. Le profil du vétérinaire précédent n'est pas restauré dans le scénario hébergé exécuté.

Les intégrations sociales existantes sont conservées : posts de l'auteur via author_id, pagination, polling borné suspendu en onglet invisible, liste de notifications actualisée, adhésion privée accessible sans exposer le contenu et contrôle des médias de stories authentifiés/non expirés. Aucun endpoint inventé et aucune réécriture du design.

Correctifs de sécurité de la préparation : Symfony http-foundation 7.4.21, yaml 8.1.9 et polyfills associés. Correctif supplémentaire démontré par la CI : libX11 1.8.14-r0 dans l'image frontend. Les gardes CSRF/Sanctum, permissions, MFA et scans ne sont pas désactivés pour publier.

Aucun mot de passe existant modifié, utilisateur supprimé ou contenu préexistant supprimé. Aucun secret Render/Cloudflare modifié. La référence d'image applicative du service a été mise à jour et vérifiée. Aucun logo ou dossier de candidature modifié par cette reprise ; les changements indépendants restent dans le workspace initial.

## G. Secours et suite

Révision de secours : `8d4381072c4f1e3d5981283ae44db1fc09c655af` ; image `5eef/yazoo-api-demo:8d4381072c4f1e3d5981283ae44db1fc09c655af` ; digest `sha256:fe0d31787f584e8b122c097743d3c4241bbe54df86ace8298ad3fc55a7b07a30`. [Workflow de secours réussi](https://github.com/5eef/YaZoo/actions/runs/39171539853). Cette révision contient les correctifs backend de préservation et de médias ainsi que les corrections de session ; son image a été testée par digest. Un build frontend de secours est prêt dans le worktree safety.

En cas d'incident, arrêter les publications, garder les preuves et identifier le composant. Si un retour applicatif est nécessaire, employer cette révision compatible sur les services existants et revérifier santé, sessions et empreintes. **Ne pas réactiver l'ancienne image bcf avec synchronisation des credentials ni l'ancien frontend non corrigé. Ne jamais effectuer de restauration SQL automatique comme rollback applicatif.**

Limites à traiter avant de qualifier la démonstration d'intégralement vérifiée : accès admin MFA autorisé et revue professionnelle réelle, mutations complètes de marketplace/réservations/rendez-vous sur ressources de validation autorisées, drivers email/SMS appropriés, ordonnanceur et politique de purge approuvés, suivi des sauvegardes TiDB Cloud et récupération hors machine, validation native sur appareil et parcours Reels réellement disponible. Les paiements réels restent hors activation.

## URLs publiées et preuves

- Frontend : https://yazoo-showcase.pages.dev
- Backend : https://yazoo-showcase.onrender.com
- Déploiement Pages : https://97f5d485.yazoo-showcase.pages.dev
- [Code applicatif publié](https://github.com/5eef/YaZoo/tree/9ef598e4ee79cd8384ef71c485c5c76fd7275d01)

Preuves locales anonymisées sous `output/public-release/` : `release-manifest.json`, `published-images.json`, `published-release-image-proof.json`, `published-safety-image-proof.json`, `backend-hosted-health.json`, `render-new-status.json`, `render-pinned-image.json`, `render-log-summary.json`, `pages-new-deployment.json`, `pages-asset-proof.json`, `backup-proof.json`, `tidb-readonly-inventory.json`, `tidb-precutover-preservation.json`, `tidb-postcutover-preservation.json`, `hosted-functional-validation.json`, `hosted-media-validation.json`, `hosted-vet-isolation.json`, `hosted-database-proof.json`, `hosted-physical-delete.json`, `hosted-profile-fields.json`, `hosted-catalogue-validation.json`, `render-restart-proof.json`, `hosted-restart-persistence.json` et `client-secret-proof.json`. Les preuves chiffrées et identités de validation restent dans le dossier privé, exclu de Git et du déploiement.
