# YaZoo V2

Projet local: `C:\Users\seef7\OneDrive\Desktop\YaZoo`

Copyright (c) 2026 Youssef BOUGHIOUL. YaZoo est distribue sous licence MIT.
Voir le fichier `LICENSE` pour les conditions completes.

## Prerequis

- PHP 8.2+ et Composer
- Node.js 22.22+ et npm
- Docker Desktop
- Azure CLI connecte avec `az login`
- Git, puis `git-filter-repo` ou BFG si un historique Git doit etre purge

## Securite critique

Le `.gitignore` racine ignore les secrets, dependances, logs, coverage et artefacts locaux. Si des fichiers `.env` ont deja ete versionnes, purger l'historique avant de pousser:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
python -m pip install git-filter-repo
git filter-repo --path .env --path backend/.env --path frontend/.env --invert-paths --force
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Alternative BFG:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
java -jar .\bfg.jar --delete-files ".env" --delete-files ".env.*"
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

Apres purge, changer tous les secrets dans Azure/GitHub/local: `APP_KEY`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`, mots de passe Redis/MySQL et tokens tiers. Ne jamais reutiliser les anciennes valeurs.

Generer une nouvelle cle Laravel:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\backend"
php artisan key:generate
```

Headers et HTTPS sont actifs via:

- `backend\app\Http\Middleware\ForceHttps.php`
- `backend\app\Http\Middleware\SecurityHeaders.php`
- `APP_FORCE_HTTPS=true` en production

Package secure headers optionnel demande par l'audit:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\backend"
composer require bepsvpt/secure-headers
php artisan vendor:publish --provider="Bepsvpt\SecureHeaders\SecureHeadersServiceProvider"
```

## Backend Laravel

Installer et tester:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\backend"
composer install
php artisan migrate
php artisan test
```

Les routes `/api/auth/login` et `/api/auth/register` sont rate-limitees. CORS utilise `CORS_ALLOWED_ORIGINS`. La detection N+1 est active hors production via `Model::preventLazyLoading`.

Commande utile pour reperer des `get()` non pagines dans les controleurs:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
rg "->get\(" backend\app\Http\Controllers
```

Ne jamais remplacer globalement `get()` par `paginate()`: chaque endpoint doit conserver
son contrat JSON et recevoir une pagination serveur explicite, bornee et testee.

## Frontend React

Installer, tester et construire:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\frontend"
npm ci
npm audit --omit=dev
npm run lint
npm run typecheck
npm run test:coverage -- --run
npm run build
```

La migration progressive vers une couche API typee est dans:

- `frontend\src\services\api\client.ts`
- `frontend\src\services\api\auth.ts`
- `frontend\src\services\api\users.ts`
- `frontend\src\types\`

Exemple de migration:

```ts
import { login } from '../services/api/auth'

const result = await login({ email, password, device_name: 'yazoo-web' })
setUser(result.user)
```

## Docker

Build et lancement local:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
docker compose -p yazoo_v2 down
docker compose build
docker compose up -d
```

Image backend seule:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
docker build -f backend\Dockerfile -t yazoo-api:local .
```

Construction locale avec un tag immuable:

```powershell
git rev-parse HEAD
docker build --build-arg APP_VERSION=<git-sha> -f backend\Dockerfile -t yazoo-api:<git-sha> .
docker build --build-arg APP_VERSION=<git-sha> -f frontend\Dockerfile -t yazoo-frontend:<git-sha> .
```

La publication Docker Hub et le deploiement sont assures par les workflows seulement
apres la CI complete. Azure est fixe sur `<github.sha>`; `latest` n'est publie
qu'apres un rollout dont les health checks et versions ont reussi.

## Azure Student

Creer les ressources:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
.\deploy\azure-setup.ps1 `
  -ResourceGroup <groupe-existant-ou-approuve> `
  -Location <region-approuvee> `
  -AppServicePlanName <plan-approuve> `
  -BackendWebAppName <app-backend-approuvee> `
  -FrontendWebAppName <app-frontend-approuvee> `
  -MysqlServerName <serveur-mysql-approuve> `
  -MysqlDatabase <base-approuvee> `
  -MysqlAdminUser <administrateur-approuve> `
  -KeyVaultName <coffre-approuve> `
  -VnetName <vnet-approuve> `
  -AppSubnetName <sous-reseau-app-approuve> `
  -MysqlSubnetName <sous-reseau-mysql-approuve> `
  -MysqlPrivateDnsZone <zone-dns-privee-approuvee> `
  -ProvisioningPrincipalObjectId <object-id-entra> `
  -BackendImage 5eef/yazoo-api:<sha-git-40-caracteres> `
  -FrontendImage 5eef/yazoo-frontend:<sha-git-40-caracteres> `
  -AllowCreateResources
```

Le script est idempotent, cible deux Azure App Services conteneurises et n'utilise ni
Static Web Apps ni ACR. Tous les noms sont obligatoires. Sans
`-AllowCreateResources`, il inspecte seulement les ressources existantes. Verifier
d'abord sans mutation avec les memes parametres et `-WhatIf`; l'exemple abrege
ci-dessous doit etre complete avec tous les noms explicites:

```powershell
.\deploy\azure-setup.ps1 `
  -ResourceGroup <groupe-a-inspecter> `
  -Location <region-a-inspecter> `
  -AppServicePlanName <plan-a-inspecter> `
  -BackendWebAppName <app-backend-a-inspecter> `
  -FrontendWebAppName <app-frontend-a-inspecter> `
  -MysqlServerName <serveur-mysql-a-inspecter> `
  -MysqlDatabase <base-a-inspecter> `
  -MysqlAdminUser <administrateur-a-inspecter> `
  -KeyVaultName <coffre-a-inspecter> `
  -VnetName <vnet-a-inspecter> `
  -AppSubnetName <sous-reseau-app-a-inspecter> `
  -MysqlSubnetName <sous-reseau-mysql-a-inspecter> `
  -MysqlPrivateDnsZone <zone-dns-a-inspecter> `
  -ProvisioningPrincipalObjectId 00000000-0000-0000-0000-000000000000 `
  -BackendImage 5eef/yazoo-api:0000000000000000000000000000000000000000 `
  -FrontendImage 5eef/yazoo-frontend:0000000000000000000000000000000000000000 `
  -WhatIf
```

Ajouter un domaine et certificat gratuit App Service:

```powershell
az webapp config hostname add --resource-group yazoo-rg --webapp-name yazoo-api --hostname api.example.com
az webapp config ssl create --resource-group yazoo-rg --name yazoo-api --hostname api.example.com
az webapp config ssl bind --resource-group yazoo-rg --name yazoo-api --certificate-thumbprint <THUMBPRINT> --ssl-type SNI
```

Redis gratuit: utiliser Upstash Free, puis renseigner `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_PORT=6379`, `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis` dans les variables Azure. Azure Cache for Redis n'a generalement pas de niveau gratuit durable.

## GitHub Actions

Workflow: `.github\workflows\deploy.yml`

Secrets GitHub requis:

- `AZURE_CREDENTIALS`
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Variables de l'environnement GitHub `production`:

- `AZURE_RESOURCE_GROUP`
- `AZURE_BACKEND_WEBAPP_NAME`
- `AZURE_FRONTEND_WEBAPP_NAME`
- `AZURE_BACKEND_URL`
- `AZURE_FRONTEND_URL`
- `AZURE_MYSQL_SERVER_NAME`

L'environnement GitHub `production` doit exiger une approbation humaine avant le
job `build-and-deploy` et limiter les branches autorisees. GitHub ne versionne pas
ce reglage: s'il n'est pas configure dans les parametres du depot, un merge vers
`main` peut deployer automatiquement apres la CI. Le flux attendu est merge,
CI complete, attente d'approbation, approbation, push des images SHA, validation
MySQL, rollout Azure, puis publication de `latest`.

Le plan complet, le rollback, la migration unique et l'activation des services externes
sont documentes dans `.azure/deployment-plan.md`.
