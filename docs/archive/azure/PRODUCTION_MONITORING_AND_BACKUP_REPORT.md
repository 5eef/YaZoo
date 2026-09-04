# Archive — rapport monitoring et backup Azure YaZoo

> Historique uniquement. Ces preuves ne decrivent pas la demonstration active.

Date: 2026-07-08

## Contexte verifie

- Branche production: `main`
- Dernier commit local observe: `2e9c9f3` (`docs: update post-deployment verification after https pagination fix`)
- Backend App Service: `yazoo-api`
- Frontend App Service: `yazoo`
- Resource group: `yazoo-rg`
- Base de donnees: Azure Database for MySQL Flexible Server `yazoo-mysql-0c2b09`
- Redis: Azure Redis Enterprise `yazoo-redis-0c2b09`

Aucun secret, mot de passe, token, DSN ou connection string n'est stocke dans ce document.

## Health checks production

Derniers smoke checks non connectes:

- `https://yazoo-api.azurewebsites.net/health/live`: 200 OK
- `https://yazoo-api.azurewebsites.net/health/ready`: 200 OK
- `https://yazoo-api.azurewebsites.net/api/auth/me`: 401 propre en invite
- `https://yazoo-api.azurewebsites.net/api/payments/config`: 200 OK, CMI desactive
- `https://yazoo-api.azurewebsites.net/api/veterinarians`: 200 OK, pagination en `https://`
- `https://yazoo.azurewebsites.net/`: 200 OK
- `https://yazoo.azurewebsites.net/login`: 200 OK
- `https://yazoo.azurewebsites.net/trust`: 200 OK
- `https://yazoo.azurewebsites.net/marketplace`: 200 OK

## Monitoring actuel

Etat actuel:

- Application Insights: aucune ressource detectee dans `yazoo-rg`.
- Log Analytics workspace: aucune ressource detectee dans `yazoo-rg`.
- Azure Monitor metric alerts: aucune alerte detectee dans `yazoo-rg`.
- Azure Monitor action groups: aucun action group detecte dans `yazoo-rg`.
- Diagnostic settings App Service / MySQL vers Log Analytics: aucun diagnostic setting detecte.

Conclusion: observabilite reelle encore partielle. Les logs filesystem existent, mais il manque un backend d'observabilite durable et des alertes.

## Logs Azure

Backend `yazoo-api`:

- Application logs filesystem: `Warning`
- HTTP logs filesystem: enabled
- Retention HTTP logs: 3 jours
- Detailed error messages: disabled
- Failed request tracing: disabled

Frontend `yazoo`:

- Application logs filesystem: `Warning`
- HTTP logs filesystem: enabled
- Retention HTTP logs: 3 jours
- Detailed error messages: disabled
- Failed request tracing: disabled

Politique recommandee:

- Garder `Warning` ou `Error` en production.
- Ne passer en `Debug` que temporairement pendant une fenetre de diagnostic.
- Revenir a `Warning` apres diagnostic.
- Ne jamais logger payloads de carte, secrets, documents professionnels, `document_path`, tokens ou connection strings.

## Application Insights / Sentry

Rien n'a ete active pendant cette phase, car aucune ressource Application Insights existante n'a ete trouvee et aucun DSN officiel n'a ete fourni.

Backend:

- Peut recevoir `APPINSIGHTS_CONNECTION_STRING` ou `SENTRY_DSN` via Azure App Settings.
- Les valeurs doivent rester dans Azure App Settings ou GitHub Secrets, jamais dans Git.

Frontend:

- Le frontend Vite lit `import.meta.env.*` au build time.
- Un `VITE_SENTRY_DSN` ou une configuration equivalent frontend necessiterait un build/deploiement propre.
- Ne pas injecter de DSN fictif.

Commandes proposees apres confirmation explicite:

```powershell
az monitor log-analytics workspace create `
  --resource-group yazoo-rg `
  --workspace-name yazoo-law `
  --location germanywestcentral

$workspaceId = az monitor log-analytics workspace show `
  --resource-group yazoo-rg `
  --workspace-name yazoo-law `
  --query id -o tsv

az monitor app-insights component create `
  --app yazoo-appinsights `
  --resource-group yazoo-rg `
  --location germanywestcentral `
  --application-type web `
  --workspace $workspaceId
```

Ces commandes peuvent creer des ressources Azure persistantes et potentiellement payantes. Elles ne doivent etre lancees qu'apres validation budgetaire.

## Alertes recommandees

Aucune alerte n'a ete creee, car aucun action group n'existe et aucun destinataire officiel n'a ete confirme.

Alertes minimales a creer apres creation d'un action group:

- Backend App Service `Http5xx` superieur a un seuil faible sur 5 minutes.
- Frontend App Service `Http5xx` superieur a un seuil faible sur 5 minutes.
- Backend `/health/ready` indisponible via availability test ou test externe.
- CPU App Service eleve.
- Memory working set App Service eleve.
- MySQL `cpu_percent` eleve.
- MySQL `storage_percent` eleve.
- MySQL `active_connections` ou `aborted_connections` anormal.
- Redis `usedmemorypercentage` eleve.
- Redis `serverLoad` ou `percentProcessorTime` eleve.

Action group a preparer apres confirmation:

```powershell
az monitor action-group create `
  --resource-group yazoo-rg `
  --name yazoo-prod-alerts `
  --short-name yzprod `
  --action email primary-contact <email-confirmee>
```

Exemple d'alerte 5xx backend apres action group:

```powershell
az monitor metrics alert create `
  --resource-group yazoo-rg `
  --name yazoo-api-http5xx `
  --scopes <backend-app-service-resource-id> `
  --condition "total Http5xx > 5" `
  --window-size 5m `
  --evaluation-frequency 1m `
  --severity 2 `
  --action <action-group-resource-id>
```

## Backup MySQL

Serveur:

- Nom: `yazoo-mysql-0c2b09`
- Etat: `Ready`
- Region: Sweden Central
- Zone: 1
- Version: MySQL 8.0.21
- SKU: `Standard_B1ms`
- Stockage: 32 GB
- Backup retention: 7 jours
- Geo-redundant backup: Disabled
- High availability: Disabled
- Maintenance window: Default
- Firewall visible: regle Azure services `0.0.0.0` vers `0.0.0.0`

Risques:

- RPO limite a la retention 7 jours.
- Pas de geo-redundant backup.
- Pas de high availability.
- Restore non teste.

Recommandations:

- Planifier un test de point-in-time restore vers un serveur temporaire.
- Ne jamais restaurer par-dessus la production.
- Creer un snapshot/backup controle avant CMI sandbox, migrations majeures ou changement schema sensible.
- Evaluer l'augmentation de retention backup si le budget le permet.
- Evaluer geo-redundant backup / HA selon cout et criticite.

## Plan restore test securise

Restore non execute pendant cette phase, car cela cree un nouveau serveur Azure potentiellement payant.

Plan propose apres confirmation explicite:

- Source: `yazoo-mysql-0c2b09`
- Serveur restaure propose: `yazoo-mysql-restore-test-2026-07-08`
- Resource group: `yazoo-rg`
- Region: identique a la source
- Point de restauration: maintenant moins 15 minutes, ou dernier point disponible valide
- Ne jamais connecter l'application production a ce serveur.

Commande indicative a verifier avant execution:

```powershell
$restoreTime = (Get-Date).ToUniversalTime().AddMinutes(-15).ToString("yyyy-MM-ddTHH:mm:ssZ")

az mysql flexible-server restore `
  --resource-group yazoo-rg `
  --name yazoo-mysql-restore-test-2026-07-08 `
  --source-server yazoo-mysql-0c2b09 `
  --restore-time $restoreTime
```

Verification post-restore a faire sans lire de donnees personnelles:

- Verifier existence des tables:
  - `users`
  - `reservations`
  - `payments`
  - `payment_transactions`
  - `favorites`
  - `professional_verifications`
  - `reservation_reviews`
- Verifier que le serveur restaure n'est pas reference par l'App Service production.
- Supprimer le serveur temporaire apres confirmation et fin du test.

## Migrations production

Verification directe `php artisan migrate:status` non effectuee:

- `az webapp ssh --command` n'est pas disponible dans cette CLI.
- Aucun endpoint public de debug ne doit etre cree.
- Aucune migration manuelle n'a ete lancee.

Signaux indirects:

- `YAZOO_RUN_MIGRATIONS=true`
- `YAZOO_RUNTIME_OPTIMIZE=true`
- `backend/startup.sh` execute `php artisan migrate --force` au demarrage.
- `/health/ready` retourne 200 OK.
- Les endpoints publics testes repondent correctement.

Risque restant: statut detaille des migrations non prouve par une commande directe.

## Smoke tests connectes

Non realises faute de compte test confirme.

Plan minimal:

1. Creer ou identifier un compte utilisateur test non sensible.
2. Tester login/logout.
3. Tester feed, marketplace, favoris, messages, notifications et reservations.
4. Tester un upload de verification professionnelle avec un faux document non sensible.
5. Tester un compte admin de test si disponible.
6. Ne jamais utiliser de CIN, ICE, document professionnel reel ou paiement reel.

## Donnees sensibles et conformite

- Aucun secret n'a ete affiche ou stocke dans ce rapport.
- Aucun `.env` reel n'a ete modifie.
- Aucun APP_KEY, token, DSN, connection string ou mot de passe n'a ete change.
- CMI reste desactive.
- Realtime reste desactive.
- CNDP/ONSSA restent a valider juridiquement; aucune conformite officielle n'est revendiquee.

## Prochaines actions

1. Confirmer budget et destinataires d'alertes.
2. Creer Log Analytics + Application Insights si valide.
3. Creer action group officiel.
4. Creer alertes minimales.
5. Planifier test restore MySQL.
6. Preparer compte test production.
7. Revoir Sonar UI.
8. Preparer sandbox CMI uniquement avec kit officiel.
