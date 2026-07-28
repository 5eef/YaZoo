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
.\deploy\azure-setup.ps1 `
  -ProvisioningPrincipalObjectId 00000000-0000-0000-0000-000000000000 `
  -BackendImage 5eef/yazoo-api:0000000000000000000000000000000000000000 `
  -FrontendImage 5eef/yazoo-frontend:0000000000000000000000000000000000000000 `
  -WhatIf

.\deploy\azure-dockerhub-deploy.ps1 -WhatIf `
  -BackendImage 5eef/yazoo-api:0000000000000000000000000000000000000000 `
  -FrontendImage 5eef/yazoo-frontend:0000000000000000000000000000000000000000 `
  -AppKey "<test>" `
  -FrontendUrl "https://frontend.example.test" `
  -DbHost "mysql.example.test" `
  -DbUsername "<test>" `
  -DbPassword "<test>" `
  -RedisHost "redis.example.test" `
  -RedisPassword "<test>" `
  -ContactRecipient "contact@example.test" `
  -LegalStatus "<test>" `
  -LegalAddress "<test>" `
  -LegalIce "<test>" `
  -PrivacyContactEmail "privacy@example.test" `
  -MailHost "smtp.example.test" `
  -MailPort "587" `
  -MailUsername "<test>" `
  -MailPassword "<test>" `
  -MailFromAddress "noreply@example.test"
```

Le mode `-WhatIf` expurge les arguments sensibles. Un deploiement reel exige les
comptes, secrets, informations legales, budget et autorisation de production; il
n'est jamais simule comme reussi.
