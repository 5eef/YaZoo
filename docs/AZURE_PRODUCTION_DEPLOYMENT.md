# Deploiement Azure de production YaZoo

La cible canonique est:

- backend sur Azure App Service Linux conteneur;
- frontend sur Azure App Service Linux conteneur;
- images immuables `<github.sha>` sur Docker Hub;
- MySQL Flexible Server et Redis gere;
- MySQL en acces prive via deux sous-reseaux delegues et integration VNet des
  App Services;
- queue et scheduler actifs et controles par heartbeat.

Les anciens chemins Azure Static Web Apps et Azure Container Registry ne sont plus
supportes par les scripts de production. Ils ne doivent pas etre utilises pour
provisionner une seconde architecture.

Le document faisant autorite est
[`../.azure/deployment-plan.md`](../.azure/deployment-plan.md). Il contient les
prerequis, secrets et variables GitHub, l'ordre migration/deploiement, les tests de
sante, le rollback, les sauvegardes, le premier administrateur et les activations
SMTP/SMS/CMI/legales.

Commandes locales sans mutation:

```powershell
# Fournir tous les noms reels a inspecter; aucune valeur par defaut ne les devine.
.\deploy\azure-setup.ps1 `
  -ResourceGroup <groupe-a-inspecter> `
  -Location <region-a-inspecter> `
  -AppServicePlanName <plan-a-inspecter> `
  -BackendWebAppName <backend-a-inspecter> `
  -FrontendWebAppName <frontend-a-inspecter> `
  -MysqlServerName <mysql-a-inspecter> `
  -MysqlDatabase <base-a-inspecter> `
  -MysqlAdminUser <administrateur-a-inspecter> `
  -KeyVaultName <coffre-a-inspecter> `
  -VnetName <vnet-a-inspecter> `
  -AppSubnetName <sous-reseau-app-a-inspecter> `
  -MysqlSubnetName <sous-reseau-mysql-a-inspecter> `
  -MysqlPrivateDnsZone <dns-prive-a-inspecter> `
  -ProvisioningPrincipalObjectId 00000000-0000-0000-0000-000000000000 `
  -BackendImage 5eef/yazoo-api:0000000000000000000000000000000000000000 `
  -FrontendImage 5eef/yazoo-frontend:0000000000000000000000000000000000000000 `
  -WhatIf
```

Sans `-AllowCreateResources`, `azure-setup.ps1` ne fait que des lectures Azure;
`-WhatIf` simule les commandes sans mutation. La creation exige tous les noms
explicites et `-AllowCreateResources`.

`azure-dockerhub-deploy.ps1` est reserve a la configuration initiale. Il exige
`-AllowInitialConfiguration` hors `-WhatIf`, utilise des parametres `SecureString`
pour les valeurs sensibles et ne doit pas servir aux releases courantes. Les
secrets sont saisis avec `Read-Host -AsSecureString` ou fournis par un magasin
securise; ils ne doivent pas apparaitre dans une ligne de commande ou un fichier.
Le chemin canonique des releases est `.github/workflows/deploy.yml`, avec SHA
immuable, preflight, health checks et rollback.

Pour la release DATABASE #2 autorisee, le backend embarque uniquement les
fixtures marketplace suivies dans `backend/database/seeders/assets/marketplace`.
Le bootstrap garde les copie dans le stockage App Service persistant et peuple
`yazoo_azure_test` une seule fois. Il ne lit, ne migre et ne modifie jamais la
base protegee `yazoo`.

## Garde-fous du workflow de production

L'environnement GitHub `production` doit contenir:

- `AZURE_RESOURCE_GROUP`;
- `AZURE_BACKEND_WEBAPP_NAME` et `AZURE_FRONTEND_WEBAPP_NAME`;
- `AZURE_BACKEND_URL` et `AZURE_FRONTEND_URL`;
- `AZURE_MYSQL_SERVER_NAME`, dont la valeur existante doit etre verifiee par
  l'operateur.
- `AZURE_DATABASE2_HOST`, `AZURE_DATABASE2_PORT` et `AZURE_DATABASE2_NAME`;
  le nom `yazoo` est refusé car il désigne DATABASE #1 protégée.
- les secrets administrateur, profil legal/SMTP et
  `YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD`, configures sans les publier dans le
  depot.

En cas d'indisponibilite confirmee de l'API des secrets d'environnement, les
scripts acceptent `-UseRepositoryScope`. Les secrets restent chiffres et sont
accessibles au workflow via `secrets.*`, mais doivent etre redeplaces vers
`production` lorsque l'API est retablie afin de retrouver la portee minimale.

Cet environnement doit avoir une approbation manuelle requise et une restriction
de branche. Ce reglage est externe au depot. Sans protection d'environnement, un
merge vers `main` peut enchainer automatiquement CI et deploiement.

Avant toute migration ou modification d'image App Service, le workflow lit le
serveur MySQL existant via Azure Control Plane et exige l'etat `Ready`, au moins
7 jours de retention automatique et une date de debut de restauration point-in-time.
Il ne cree ni ne modifie le serveur. Un test de restauration dans une ressource
isolee reste une validation humaine externe obligatoire avant une migration
majeure; aucune restauration reelle n'est revendiquee ici.

Les images SHA sont poussees pour diagnostic avant le rollout. Les alias `latest`
ne sont pousses qu'apres validation du backend, du frontend, de la readiness et
des versions. Un echec declenche le rollback des deux App Services et laisse
`latest` sur la derniere version validee.
