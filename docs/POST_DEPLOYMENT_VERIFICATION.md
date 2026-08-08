# Verification post-deploiement YaZoo

Date: 2026-07-07T21:46:51+01:00

## Deploiement verifie

- Commit deploye initial: `62db185` (`test: simulate HTTPS in production auth bootstrap test`)
- Correctif post-deploiement: `bb43faf` (`fix: honor forwarded https scheme in production pagination`)
- Rapport post-deploiement initial: `9d7168b` (`docs: add post-deployment verification report`)
- Branche: `main`
- GitHub Actions:
  - CI: success (`28895250184`)
  - Deploy YaZoo: success (`28895250438`)
- Images DockerHub:
  - `5eef/yazoo-api:latest`
  - image immuable `5eef/yazoo-api`, commit `62db185701679ef7c22e8e79599ad270b6a18fec`
  - `5eef/yazoo-frontend:latest`
  - image immuable `5eef/yazoo-frontend`, meme commit
- Azure App Service:
  - Backend: `yazoo-api`
  - Frontend: `yazoo`

## Health checks

- `https://yazoo-api.azurewebsites.net/health/live`: 200 OK
- `https://yazoo-api.azurewebsites.net/health/ready`: 200 OK
- `https://yazoo-api.azurewebsites.net/api/auth/me` en invite: 401 propre
- `https://yazoo.azurewebsites.net/`: 200 OK
- `https://yazoo.azurewebsites.net/login`: 200 OK en requete GET
- `https://yazoo.azurewebsites.net/trust`: 200 OK en requete GET
- `https://yazoo.azurewebsites.net/marketplace`: 200 OK en requete GET
- `https://yazoo-api.azurewebsites.net/api/payments/config`: 200 OK
- `https://yazoo-api.azurewebsites.net/api/veterinarians`: 200 OK, pagination en `https://`

## App Settings non sensibles

Backend `yazoo-api`:

- `ADMIN_BOOTSTRAP_ENABLED=false`
- `CMI_ENABLED=false`
- `TRUSTED_PROXIES` contient uniquement les adresses/CIDR du proxy d'entree verifies pour l'instance Azure. La valeur universelle `*` est refusee par le code.
- Apres toute modification de `TRUSTED_PROXIES`, verifier la detection HTTPS, l'IP client, le rate limiting, les cookies Secure et les URLs signees.
- `APP_ENV=production`
- `APP_DEBUG=false`
- `CORS_ALLOWED_ORIGINS=https://yazoo.azurewebsites.net`
- `SANCTUM_STATEFUL_DOMAINS=yazoo.azurewebsites.net`
- `SESSION_DRIVER=redis`
- `CACHE_STORE=redis`
- `QUEUE_CONNECTION=redis`

Frontend `yazoo`:

- `VITE_REALTIME_ENABLED=false`
- `VITE_API_URL=https://yazoo-api.azurewebsites.net/api`
- `VITE_STORAGE_URL=https://yazoo-api.azurewebsites.net/storage`

Aucune valeur secrete n'a ete affichee dans cette verification.

## Paiement et temps reel

- CMI runtime confirme desactive: `providers.cmi.enabled=false`
- Provider par defaut: `manual_bank_transfer`
- Devise: `MAD`
- Temps reel frontend explicitement desactive via `VITE_REALTIME_ENABLED=false`

## Migrations

- Le backend Azure a `YAZOO_RUN_MIGRATIONS=true`.
- `backend/startup.sh` execute `php artisan migrate --force` au demarrage du conteneur.
- Aucune migration manuelle n'a ete lancee pendant cette verification.
- `az webapp ssh --command` n'est pas disponible dans cette CLI, donc `php artisan migrate:status` n'a pas ete execute non-interactivement.
- A confirmer lors d'une fenetre controlee: statut detaille des tables `payments`, `payment_transactions`, `favorites`, `reservation_reviews`, `professional_verifications`.

## Logs

- Configuration logs Azure verifiee:
  - HTTP logs filesystem actives avec retention 3 jours.
  - Application logs filesystem actives au niveau `Warning`.
  - Detailed error messages et failed request tracing restent desactives.
- Lecture `az webapp log tail` testee, sans erreur applicative exploitable retournee avant timeout.
- Aucun secret n'a ete colle dans ce rapport.

## Smoke tests realises

- Frontend racine charge.
- Routes SPA publiques `/login`, `/trust`, `/marketplace`, `/marketplace/veterinarians` retournent le bundle HTML en GET.
- API veterinaires invite retourne une reponse JSON 200.
- Les champs `links.first`, `links.last`, `meta.links.*.url` et `meta.path` de `/api/veterinarians` utilisent `https://yazoo-api.azurewebsites.net`.
- API notifications invite retourne 401 propre.
- API auth/me invite retourne 401 propre.
- API payments/config confirme CMI desactive.

Tests non realises faute de compte test fourni:

- Login/logout reel.
- Favoris connecte.
- Messages connecte.
- Notifications connecte.
- Reservations connectees.
- Upload verification professionnelle avec fichier test.
- Verification visuelle FR/AR/EN, RTL arabe, dark/light et mobile.

## CORS, Sanctum et cookies

- `Access-Control-Allow-Origin` retourne `https://yazoo.azurewebsites.net` sur les endpoints API testes.
- `Access-Control-Allow-Credentials=true`.
- Cookies Azure `Secure` observes sur backend et frontend.
- `/api/auth/me` invite retourne 401 propre, sans erreur CORS visible depuis les requetes effectuees.

## Backup et restore

- Base production identifiee: Azure Database for MySQL Flexible Server `yazoo-mysql-0c2b09`.
- Version: MySQL 8.0.21.
- Backup retention: 7 jours.
- Geo-redundant backup: Disabled.
- High availability: Disabled.
- Recommandation: planifier un test restore et un snapshot/backup avant migrations majeures, sandbox CMI officielle ou changements schema sensibles.

## Risques restants

- Les logs applicatifs sont maintenant au niveau `Warning`; le monitoring reel reste a activer.
- Verification directe `migrate:status` non effectuee faute de commande SSH non-interactive.
- Tests connectes non realises faute de compte test.
- Monitoring reel non actif: aucune ressource Application Insights trouvee dans `yazoo-rg`.
- CNDP/ONSSA restent a valider juridiquement; aucune certification officielle n'est revendiquee.

## Prochaines etapes recommandees

1. Activer un monitoring officiel avec DSN/connection string stocke dans Azure App Settings ou GitHub Secrets.
2. Configurer alertes sur 500 backend, login, paiement, upload, `/health/ready`, erreurs frontend critiques.
3. Planifier backup restore MySQL.
4. Verifier Sonar UI apres deploiement.
5. Preparer sandbox CMI uniquement avec kit officiel.
6. Completer dossier INDH business/juridique.
