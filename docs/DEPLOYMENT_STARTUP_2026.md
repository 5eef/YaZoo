# Déploiement startup 2026

Le dépôt conserve le showcase Cloudflare Pages + API Render/TiDB et les archives Azure. Ce document décrit la configuration à préparer ; il ne revendique aucune URL vérifiée en production.

## Profils
Pilote : STARTUP_PILOT=true, ANIMAL_LISTINGS_PUBLIC=false, PAYMENTS=false. Frontend : mêmes choix VITE_STARTUP_PILOT/VITE_ANIMAL_LISTINGS_PUBLIC/VITE_PAYMENTS. L’API décide l’accès public aux annonces animales. Showcase : YAZOO_DEPLOYMENT_PROFILE=showcase conserve le défaut historique backend ; configurer explicitement VITE_STARTUP_PILOT=false et VITE_ANIMAL_LISTINGS_PUBLIC=true pour ce build frontend. Ne pas activer PILOT_METRICS sur démo ; base et stockage distincts du vrai pilote.

Veterinarians/services/appointments/messaging/reviews/verification restent actifs. Produits, communautés et feed sont secondaires et conservés. Les variables correspondantes dans features constituent le point de configuration ; confirmer chaque surface avant de modifier leurs valeurs. CMI reste protégé par ses validations contractuelles/sandbox/homologation existantes ; aucune de celles-ci ne doit être simulée.

## Architecture et variables
- Frontend : npm ci, build avec VITE_SITE_URL réel pour pages SEO ; Cloudflare proxy API/storage/sanctum/broadcasting ; vérifier headers et cookies same-origin.
- API : Laravel/PHP ; Dockerfile backend actuel, Dockerfile.api-demo pour showcase séparé. Composer lock et extension mongodb 2.4.1 alignés avec bibliothèque 2.4.2. Aucune URI dans diagnostic Mongo.
- Database : MySQL/TiDB avec TLS selon config réelle ; ports locaux MySQL 3306, MariaDB XAMPP 3307, MongoDB 27017 inchangés. Réserver une base pilote indépendante.
- Storage : privé durable pour documents ; public pour médias publiables ; PRIVATE_STORAGE_PATH vide retombe sur storage/app/private. Choisir filesystem/Mongo selon environnement, ne pas stocker uploads sur disque éphémère Render sans volume.
- Queue/scheduler : activer les workers et heartbeats nécessaires, superviser retries et échecs. Reverb facultatif pour le pilote ; messagerie REST fonctionne sans realtime.
- Monitoring : health/live pour vie, health/ready pour dépendances ; ne pas exposer détails sensibles. Compteurs `PILOT_METRICS=true` après migration sur pilote réel ; admin MFA pour consultation.
- Domain : FRONTEND_URL/APP_URL/CORS_ALLOWED_ORIGINS/SANCTUM_STATEFUL_DOMAINS et URL mobile HTTPS ; TRUSTED_PROXIES explicites, jamais *.
- Secrets : APP_KEY, DB credentials, Mongo éventuel, SMTP, OAuth, SMS, CMI seulement dans gestionnaire de secrets. Aucun secret dans VITE_* ni EXPO_PUBLIC_*.

## Ordre de mise en service
1. Vérifier mentions et dossiers CNDP, responsable privacy, fournisseurs/régions, marque et professionnels réels.
2. Sauvegarder base/stockage ; restaurer sur environnement indépendant (voir BACKUP_RECOVERY.md).
3. Installer depuis locks, construire image et frontend ; gates locaux/CI.
4. `php artisan yazoo:preflight-production --configuration-only`, puis preflight complet sur cible approuvée. Ne pas remplacer les mentions par valeurs fictives.
5. `php artisan migrate --force` uniquement sur base pilote identifiée et sauvegardée ; nouvelle migration agrégats, aucune suppression historique. `config:cache`, démarrer workers/scheduler.
6. Vérifier cookies/CSRF/Bearer, health, documents privés, demande/notification/message/achèvement/avis et suppression/export sur cible.
7. Associer EAS, décider package, configurer credentials puis APK preview ; test Android réel ; AAB seulement après validation.

Rollback : conserver image et bundle précédent, remettre flags sûrs et arrêter activation de paiements ; éviter rollback de schéma avec données pilotes. La nouvelle table est additive : ancien code peut la laisser intacte. Revenir au code précédent sans supprimer des demandes. Maintenir journal d’incident sans token ni URI.

GitHub Actions : checks backend/frontend existants, mobile install/lint/typecheck/tests/doctor/export ajouté sans EAS payant. Les audits complets restent visibles ; avis amont non corrigés traités dans SECURITY_REVIEW.md, pas présentés comme PASS.
