# Archive — rapport incident frontend Azure

> Historique uniquement. Cet environnement a ete decommissionne et ne constitue plus la cible active.

Date: 2026-07-09
Fenetre de diagnostic: environ 11:20-11:31 UTC
Ressource: App Service Linux Container `yazoo`
Region: Germany West Central

## Resume executif

Le frontend `https://yazoo.azurewebsites.net` est confirme disponible depuis des points de sortie externes multiples. Les echecs observes depuis la machine locale ne sont pas un incident global Azure ni un probleme applicatif React/Nginx. La cause la plus probable est une connectivite locale / FAI / routage / filtrage vers l'IP App Service `51.116.145.45`.

Aucune mitigation Azure n'a ete appliquee, car les preuves externes et AppLens indiquent un service sain. Aucun push, aucun changement de code, aucun changement `.env`, aucun secret, aucune migration, aucun rollback image, aucune modification DockerHub et aucune modification backend n'ont ete effectues.

## Etat Git local

- `git log --oneline -n 12`: commit `ac02b2a docs: add production monitoring and backup report` present en tete.
- `git status --short` avant mise a jour du rapport: `?? docs/FRONTEND_AZURE_INCIDENT_REPORT.md`.
- Aucun push effectue.

## Tests depuis la machine locale

Commandes locales executees:

- `curl.exe -I https://yazoo.azurewebsites.net/ --connect-timeout 15`: echec TCP, `curl: (7) Failed to connect`.
- `curl.exe -4 -I https://yazoo.azurewebsites.net/ --connect-timeout 15`: echec TCP.
- `curl.exe -I https://yazoo.azurewebsites.net/trust --connect-timeout 15`: echec TCP.
- `curl.exe -I https://yazoo.azurewebsites.net/login --connect-timeout 15`: echec TCP.
- `curl.exe -I https://yazoo.azurewebsites.net/marketplace --connect-timeout 15`: echec TCP.
- `curl.exe -I https://yazoo.scm.azurewebsites.net/ --connect-timeout 15`: echec TCP.
- `curl.exe --dns-servers 1.1.1.1 ...`: non supporte par la version locale de curl.

DNS / reseau local:

- `Resolve-DnsName yazoo.azurewebsites.net`: resolution OK vers CNAME Azure puis A `51.116.145.45` et AAAA `2c0f:fa18:0:10::3374:912d`.
- `nslookup yazoo.azurewebsites.net`, `nslookup ... 1.1.1.1`, `nslookup ... 8.8.8.8`: timeouts DNS depuis cette machine.
- `Test-NetConnection 51.116.145.45 -Port 443`: ping OK, TCP failed.
- `tracert yazoo.azurewebsites.net`: atteint le reseau Microsoft (`ntwk.msn.net`) puis timeouts.
- Proxy WinHTTP: acces direct, aucun proxy.
- Proxy utilisateur Windows: aucun `ProxyServer` / `AutoConfigURL`.
- Fichier hosts Windows: aucune entree `yazoo` ou `azurewebsites`.

Observation importante: le backend `yazoo-api` reste accessible en curl depuis la meme machine, mais `Test-NetConnection` echoue aussi en TCP vers `51.116.145.45`. Cela rend `Test-NetConnection` moins conclusif que curl, et renforce le besoin de s'appuyer sur les sondes HTTP externes.

## Tests externes multi-points

Service externe utilise: Check-host HTTP checks. Les rapports sont publics et ne contiennent pas de secrets.

Site principal:

- Rapport `https://check-host.net/check-report/440070ddk15`
- Finlande Helsinki: 200 OK, `51.116.145.45`
- Israel Netanya: 200 OK, `51.116.145.45`
- Serbie Belgrade: 200 OK, `51.116.145.45`
- Turquie Istanbul: 200 OK, `51.116.145.45`
- Pologne Poznan: connect timeout

`/trust`:

- Rapport `https://check-host.net/check-report/440071aak54a`
- Hongrie, Inde, Iran, Portugal, Ukraine: 200 OK, `51.116.145.45`

`/login`:

- Rapport `https://check-host.net/check-report/4400808dka86`
- Suisse, Kazakhstan, Turquie: 200 OK, `51.116.145.45`

`/marketplace`:

- Rapport `https://check-host.net/check-report/44008091ka8f`
- Espagne et Italie: 200 OK, `51.116.145.45`
- Roumanie: resultat non retourne au moment du poll

SCM/Kudu:

- Rapport `https://check-host.net/check-report/440071aek60c`
- Bulgarie, Canada, Inde, Iran, Pays-Bas: 401 Unauthorized, `51.116.145.45`
- Interpretation: le endpoint SCM est joignable globalement; le 401 est attendu sans authentification.

Decision sur les tests externes: le site principal, les routes SPA testees et SCM sont accessibles globalement. L'incident n'est pas global Azure.

## Azure App Service

Configuration lue sans modification:

- App Service `yazoo`: `Running`
- `availabilityState`: `Normal`
- `publicNetworkAccess`: `Enabled`
- `httpsOnly`: `true`
- `linuxFxVersion`: `DOCKER|5eef/yazoo-frontend:latest`
- `WEBSITES_PORT`: `80`
- `healthCheckPath`: `/`
- `alwaysOn`: `true`
- `minTlsVersion`: `1.2`
- Workers: `1`
- Plan: `yazoo-linux-plan`, Linux Basic B1, capacity `1`
- Hostname par defaut: `yazoo.azurewebsites.net`
- Aucun domaine custom pertinent pour le hostname par defaut.

Access restrictions:

- Main site: Allow all.
- SCM site: Allow all.
- `scmIpSecurityRestrictionsUseMain`: `false`.

Networking:

- Private endpoint connections: `[]`.
- AppLens `PrivateEndpoint`: "Private Endpoints are not enabled for this Web App."
- AppLens `NetworkingOneStop`: Linux Basic, not connected to VNet, inbound IP `51.116.145.45`, HTTPS only enabled.
- `vnetName`: vide.

## Service Health / Resource Health

Service Health via ARM:

- Aucun incident App Service courant bloquant identifie pour l'app.
- Evenement visible: `Routine advance maintenance advisory for your App Service plan in Germany West Central`, maintenance planifiee future au 2026-07-13T16:26:42Z.
- Evenement visible sans lien direct: `Azure Managed Redis metric reporting issue`.

Resource Health detaille:

- `Microsoft.ResourceHealth` est `NotRegistered` dans l'abonnement.
- Les appels `availabilityStatuses/current` retournent `AuthError`.
- Aucun enregistrement de provider n'a ete effectue, car cela modifierait l'abonnement.
- Signal de substitution utilise: `availabilityState=Normal` sur l'App Service et metriques/AppLens saines.

## AppLens / Diagnose and Solve Problems

Detecteurs App Service consultes via ARM, sans action appliquee:

- `LinuxAppDown` / Web App Down: aucune indisponibilite identifiee entre 2026-07-08 11:10 UTC et 2026-07-09 11:10 UTC; Organic SLA 100%.
- `LinuxContainerStartFailure` / Container Issues: "Your container started successfully"; aucun container start failure trouve.
- `LinuxAvailabilityAndPerformance`: Failed Requests `0%`, App Performance 90th percentile environ `110 ms`.
- `NetworkingOneStop`: pas de VNet, inbound IP `51.116.145.45`, HTTPS only enabled.
- `PrivateEndpoint`: private endpoints non actives.

Aucune recommandation AppLens ne justifie une mitigation Azure.

## Metriques Azure Monitor

Fenetre observee autour de 2026-07-09 10:57-11:22 UTC:

- `HealthCheckStatus`: 100.
- `Http5xx`: 0.
- `Requests`: compteur non nul.
- `AverageResponseTime`: bas, de l'ordre de quelques millisecondes sur les points observes.

Ces metriques sont coherentes avec les tests externes 200 OK.

## Backend / CMI / realtime

Retests backend:

- `https://yazoo-api.azurewebsites.net/health/ready`: 200 OK.
- `https://yazoo-api.azurewebsites.net/api/payments/config`: 200 OK.
- `https://yazoo-api.azurewebsites.net/api/auth/me`: 401 propre pour invite.

Etat fonctionnel:

- `CMI_ENABLED=false` cote backend.
- `/api/payments/config` retourne `providers.cmi.enabled=false`.
- `VITE_REALTIME_ENABLED=false` cote frontend.
- Aucun changement backend effectue.
- Aucun effet negatif observe du monitoring precedent sur le backend.

## Decision

Incident classe: connectivite locale / FAI / DNS / route / filtrage vers le frontend App Service, pas incident global Azure.

Preuves principales:

- Le site principal est 200 OK depuis plusieurs pays.
- `/trust`, `/login`, `/marketplace` repondent 200 OK depuis plusieurs pays.
- SCM/Kudu repond globalement 401 Unauthorized, comportement attendu sans auth.
- Azure indique `Running`, `Normal`, health check 100, 0 HTTP 5xx.
- AppLens ne detecte ni downtime, ni echec de container, ni private endpoint, ni blocage access restrictions.
- La machine locale echoue encore en TCP vers `yazoo.azurewebsites.net` et `yazoo.scm.azurewebsites.net`.

## Actions prises

- Aucune mitigation Azure appliquee.
- Aucun scale out / scale up / restart plan.
- Aucun re-apply container config.
- Aucun rollback vers tag SHA.
- Aucune creation d'App Service temporaire.
- Aucun ticket support ouvert.
- Aucune action GitHub Actions lancee.
- Aucun push.

## Risques restants

- L'acces depuis le reseau local actuel peut rester KO tant que le probleme DNS/FAI/routage/filtrage local n'est pas corrige.
- Un seul noeud Check-host a timeoute sur `/`; cela ne suffit pas a caracteriser une panne globale.
- Resource Health detaille n'a pas pu etre interroge tant que `Microsoft.ResourceHealth` reste non enregistre.

## Recommandations

1. Ne pas modifier Azure pour cet incident a ce stade.
2. Tester depuis telephone 4G/5G hors Wi-Fi ou partage mobile.
3. Tester depuis Azure Cloud Shell si disponible:
   - `curl -I https://yazoo.azurewebsites.net/ --connect-timeout 15`
   - `curl -I https://yazoo.azurewebsites.net/trust --connect-timeout 15`
   - `curl -I https://yazoo.scm.azurewebsites.net/ --connect-timeout 15`
4. Cote poste local: essayer DNS 1.1.1.1 ou 8.8.8.8, `ipconfig /flushdns`, autre navigateur, sans VPN/proxy/filtrage antivirus, et partage 4G.
5. Ne pas rollback l'image frontend.
6. Feu vert technique pour committer ce rapport localement; push docs possible seulement apres confirmation utilisateur.
