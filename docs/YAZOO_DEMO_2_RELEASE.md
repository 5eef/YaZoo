# YaZoo Demo 2.0 — préparation de release

Base : ae502f1b11a0c986520719273636e3756fd1a53c. Branche isolée : feat/yazoo-demo2-realtime-mobile-release. Aucun déploiement autorisé à ce stade. Le worktree principal est conservé.

## Changements

Nginx expose un seul port 8080. `/app/` relaie les upgrades vers Reverb sur 127.0.0.1:8081. `/apps/` est limité au loopback : Laravel publie directement sur le port interne, sans exposer son API signée. Le superviseur démarre une seule instance Reverb avec `YAZOO_RUN_REVERB=true`, attend son écoute TCP et arrête le conteneur si un processus géré échoue. L’hébergeur doit redémarrer le conteneur ; le test local utilise `on-failure:3`. TERM/INT sont propagés aux processus. Aucun debug Reverb ni accès log du handshake n’est activé.

Echo utilise le connecteur `reverb`, nécessaire avec la version Pusher installée. L’autorisation privée par cookie transmet le CSRF et applique le middleware serveur correspondant. Les canaux restent privés. Les messages sont dédupliqués, ordonnés par ID et les conversations sont réconciliées lors d’une reconnexion ; le polling reste disponible en cas d’indisponibilité WebSocket.

Le client Android utilise le WebSocket React Native 0.86 et le protocole Pusher v7 sans nouvelle dépendance native. Il envoie un Origin explicite compatible avec l’allowlist, autorise les canaux via le Bearer courant, rejette une réponse d’autorisation d’une ancienne session et ferme sa connexion au démontage/changement de session. Les messages sont insérés directement dans la conversation et les notifications dans la liste existante. Les pertes de connexion déclenchent une reprise progressive et une réconciliation HTTP. Aucun push système en arrière-plan n’est annoncé.

Les composants ClamAV déjà développés sur la branche opérations sont repris par fichiers ciblés : scanner streaming, quarantaine privée, publication après résultat clean et contrôle des justificatifs. Aucun changement du transport Resend, des lockfiles npm/composer ou de Tailwind. Aucun merge de branche historique.

## Configuration proposée — appliquer uniquement après approbation

```dotenv
YAZOO_RUN_REVERB=true
BROADCAST_CONNECTION=reverb
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8081
REVERB_HOST=127.0.0.1
REVERB_PORT=8081
REVERB_SCHEME=http
REVERB_ALLOWED_ORIGINS=yazoo-showcase.pages.dev,yazoo-showcase.onrender.com
YAZOO_REQUIRE_REVERB_HEALTH=true
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@send.5eef.online
MAIL_FROM_NAME=YaZoo
MEDIA_SCAN_ENABLED=true
YAZOO_SHOWCASE_UPLOADS_ENABLED=false
```

REVERB_APP_ID/KEY/SECRET sont préparés localement sous DPAPI. Seule la clé publique est utilisée par les builds. Le secret ne doit jamais entrer dans VITE_*, EXPO_PUBLIC_*, le dépôt ou l’APK. L’adresse publique des clients est `wss://yazoo-showcase.onrender.com:443`, distincte de l’adresse de publication Laravel. `QUEUE_CONNECTION=sync` est conservé pour cette démonstration limitée : la livraison distante et le comportement d’une interruption doivent être mesurés avant certification. Aucun worker/scheduler supplémentaire n’est supposé actif.

Frontend : VITE_API_URL=/api, VITE_REALTIME_ENABLED=true, VITE_REVERB_HOST=yazoo-showcase.onrender.com, VITE_REVERB_PORT=443, VITE_REVERB_SCHEME=https et clé publique identique au profil preview. Le serveur Pages doit conserver BACKEND_ORIGIN=https://yazoo-showcase.onrender.com ainsi que toutes ses Functions. Projet Direct Upload existant : ne pas le remplacer, ne pas publier seulement dist sans compiler les Functions. Wrangler doit associer le commit final exact au déploiement, même si sa branche de production reste startup-2026.

## Preuves locales au 22 octobre 2026

- Backend : 515 tests, 3 020 assertions, SQLite en mémoire et réseau Docker désactivé. Les essais de protocole ClamAV utilisent un serveur de test ; le pack a aussi été analysé par le vrai moteur local, pas par un antivirus hébergé.
- Frontend : lint, typecheck, i18n, build ; couverture complète exécutée. Une première répétition en forte concurrence a expiré sur le test d’assets ; la répétition à deux workers passe. Couverture et compte exact conservés dans les artefacts de travail.
- Responsive : 48 variantes (320/360/375/390/412/768/1024/1440 × FR/EN/AR × light/dark), 21 routes par variante, API simulée. Ce résultat ne prouve pas les mutations hébergées.
- Mobile : lint/typecheck, 64 tests, Expo Doctor 21/21, export Android Hermes. Le graphe exporté ne contient pas braces/node-forge ; les 19 alertes transitives des outils restent documentées par la politique existante.
- Transport local : HTTP101 via Nginx, deux comptes, canaux privés, tiers refusé, persistance SQLite, notification, marquage lu, reconnexion. Deux contextes navigateur affichent le message malgré le blocage des GET de réception. Interopérabilité du code client natif avec le navigateur dans les deux sens. Ce n’est pas un test sur appareil Android.
- Ressources locales sous plafond de 512 Mio : environ 108 Mio au repos/avec deux connexions/après plusieurs messages, CPU instantané inférieur à 1 %. Aucun OOM observé dans cette séquence courte. Arrêt de Reverb : superviseur et redémarrage automatique local vérifiés, messages SQLite conservés. Aucune garantie de charge ou disponibilité Render déduite.
- Scan Trivy de la candidate locale : zéro HIGH/CRITICAL et zéro secret détecté ; avertissement du fournisseur sur une fiche CVE sans détails. Refaire le scan de l’image finale étiquetée par SHA.

L’audit npm complet frontend est sans vulnérabilité. La politique n’appelle plus un second audit du sous-ensemble runtime si l’arbre complet est sain : cette requête redondante basculait vers l’endpoint Quick Audit retiré. Si l’arbre complet contient une alerte, le contrôle runtime reste obligatoire ; une indisponibilité, une alerte nouvelle ou une exposition runtime restent bloquantes. Trois tests de politique couvrent ces cas. Voir https://docs.npmjs.com/cli/commands/npm-audit/ .

Les artefacts détaillés sont dans output/demo2 du workspace principal. Aucun résultat local ne remplace WSS/TiDB/R2/Resend/Pages/APK hébergés.

## Blocages conservés

Le propriétaire indique qu’aucune infrastructure supplémentaire n’est disponible. Aucun scanner distant n’est configuré. Les uploads exigeant l’analyse ne peuvent pas être certifiés ; ils restent bloqués dans la proposition de déploiement, sans désactiver l’analyse. Les médias existants restent lisibles selon leurs permissions. ClamAV recommande 3 Gio ou davantage avec ses signatures standard, incompatible avec une promesse de cohabitation fiable dans 512 Mio : https://docs.clamav.net/Introduction.html?highlight=clam .

### Alternative de démonstration fermée : quatre fichiers préanalysés

Le mode `MEDIA_SCAN_DRIVER=verified_demo_manifest` permet uniquement les quatre fichiers exacts de `backend/resources/demo-media-manifest.json`, pour les IDs de comptes fictifs explicitement désignés dans `MEDIA_DEMO_ALLOWED_USER_IDS`. Le profil doit être `showcase`. Liste vide, profil production, manifeste périmé/corrompu, signatures trop anciennes, taille/MIME/empreinte différents ou autre compte : refus. Le flag de scanning ne peut pas désactiver ces contrôles. Tout échec reste en quarantaine privée et ne devient pas un média public.

Les quatre fichiers existants ont été analysés localement le 22 octobre avec ClamAV 1.5.4, signatures 28160 du 21 octobre, sans infection détectée. Le manifeste expire le 29 octobre 2026 à 03:17:59 UTC. Avant une démonstration ultérieure, refaire l’analyse avec signatures à jour et produire une nouvelle release du manifeste. Il s’agit de la vérification d’un résultat antivirus préalable sur des octets identiques, pas d’un antivirus hébergé analysant des fichiers nouveaux.

Après approbation, création des seuls comptes fictifs autorisés et preuve R2 isolée, il est possible de proposer `MEDIA_SCAN_ENABLED=true`, ce driver, les IDs désignés puis `YAZOO_SHOWCASE_UPLOADS_ENABLED=true` pour le pack exclusivement. Les autres uploads restent bloqués. Le pack peut servir aux parcours avatar/couverture/post/story/vidéo, en transférant les originaux sans recompression. Les justificatifs professionnels arbitraires et l’upload général restent PARTIAL/BLOCKED. Ne pas qualifier ce mode d’ouverture publique des uploads.

La sauvegarde et sa clé restent sur un seul ordinateur ; deuxième support physique non prouvé, risque non accepté. La fraîcheur TiDB doit être relue avant toute mutation publique. Aucun snapshot ancien ne sera restauré automatiquement sur la production.

Resend réel, WSS public, persistance TiDB/R2 après redémarrage Render et nouveau build APK signé restent NOT_TESTED avant autorisation. L’ancien APK EAS preview est historique ; il ne constitue pas cette release. L’installation par QR est possible après génération du nouvel APK et contrôle d’accès à sa distribution. L’appareil physique sera validé séparément.

## Rollback coordonné

Backend conservé : df06914fc596a73d2b775156f7be0c7b5598cfad, digest sha256:214f9f22b1b9b5a2ac600e789cfd42974794732ef45e8ed2e8c0d70364dfb99a, Render dep-dbb74jm7bikc73eqsq50. Pages conservé : e65ee63a-7935-445e-bd7a-25ce5aad70bb, même SHA. Les références ont été relues via les API fournisseurs.

Conserver l’environnement chiffré existant, puis enregistrer le différentiel exact avant cutover. En cas d’échec, rétablir image/digest et ancien déploiement Pages, préserver TiDB et R2 et désactiver le nouveau transport client si nécessaire. Ne pas rétablir aveuglément des logs contenant mails/messages. Aucune migration nouvelle dans cette candidate ; aucune opération migrate:fresh/reset/db:wipe/db:seed en production. Conserver les nouveaux messages et comptes lors d’un rollback applicatif. Aucun merge automatique dans main.

Le gate final doit donner le nouveau SHA, CI/CodeQL, digest, tests, limites et double décision de déploiement/risque de sauvegarde. SAFE_TO_DEPLOY_FULL_DEMO reste NO tant que les conditions requises et décisions ne sont pas satisfaites.
