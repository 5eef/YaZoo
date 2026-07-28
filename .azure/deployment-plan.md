# Plan de deploiement Azure YaZoo

Status: Local Validation Complete - Azure account validation pending

## Exigences retenues

| Exigence | Decision |
| --- | --- |
| Cible | Azure App Service Linux, deux conteneurs |
| Registre | Docker Hub, tags SHA Git immuables |
| Base | Azure Database for MySQL Flexible Server |
| Etat partage | Redis TLS pour cache, sessions, queue et verrous |
| Migration | Demarrage controle du nouveau backend, verrou distribue |
| Exposition | HTTPS App Service, health checks backend et frontend |
| Infrastructure as code | Scripts PowerShell relancables, aucune mutation automatique depuis ce plan |

## Architecture canonique

- Backend: Azure App Service Linux, conteneur Docker Hub `yazoo-api:<git-sha>`,
  port interne 8080.
- Frontend: Azure App Service Linux, conteneur Docker Hub
  `yazoo-frontend:<git-sha>`, port interne 80.
- Donnees: Azure Database for MySQL Flexible Server, TLS, port 3306.
- Reseau: VNet `yazoo-vnet`; sous-reseau App Service
  `appservice-integration` delegue a `Microsoft.Web/serverFarms` et sous-reseau
  MySQL `mysql-private` delegue a `Microsoft.DBforMySQL/flexibleServers`.
  MySQL utilise la zone DNS privee `yazoo.private.mysql.database.azure.com`;
  aucun acces public n'est cree par le script canonique.
- Cache, sessions et queue: service Redis gere avec TLS.
- Medias: stockage persistant monte par App Service. Le stockage local ephemere ne
  convient pas a la production multi-instance.
- Images: Docker Hub. ACR et Azure Static Web Apps sont des chemins historiques,
  non utilises par les scripts et workflows canoniques.

Le workflow `.github/workflows/deploy.yml` appelle la CI reutilisable pour le meme
SHA avant toute publication. Il construit, pousse et deploie le tag immuable
`<github.sha>`; `latest` n'est mis a jour qu'apres un rollout completement valide.

## Ressources et noms attendus

- Groupe: variable GitHub `AZURE_RESOURCE_GROUP` (valeur courante attendue:
  `yazoo-rg`).
- Plan App Service: `yazoo-linux-plan`.
- Backend: variable `AZURE_BACKEND_WEBAPP_NAME` (attendu: `yazoo-api`).
- Frontend: variable `AZURE_FRONTEND_WEBAPP_NAME` (attendu: `yazoo`).
- MySQL: variable GitHub `AZURE_MYSQL_SERVER_NAME`; sa valeur doit correspondre
  au serveur existant et etre confirmee par l'operateur.
- Key Vault: `yazoo-kv`.
- VNet: `yazoo-vnet`, sous-reseaux `appservice-integration` et
  `mysql-private`.

Les noms peuvent etre adaptes avant le premier provisionnement. Ils ne doivent pas
etre changes en cours de deploiement.

## Prerequis et identites

1. Valider le budget Azure et Docker Hub.
2. Executer `az login`, choisir explicitement la souscription et verifier les
   quotas de la region.
3. Creer une identite de deploiement limitee au groupe de ressources cible.
   Noter son object ID Entra (pas son client ID) et son type (`ServicePrincipal`
   ou `User`). L'identite doit pouvoir creer les ressources et les affectations
   de role dans le groupe; le script lui attribue `Key Vault Secrets Officer`
   uniquement sur le coffre afin de stocker le secret MySQL.
4. Enregistrer son JSON dans le secret GitHub `AZURE_CREDENTIALS`. La commande
   exacte de creation depend de la politique Entra de l'organisation; ne pas
   versionner sa sortie.
5. Creer `DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN` dans GitHub Secrets.
6. Configurer les variables de l'environnement GitHub `production`:
   `AZURE_RESOURCE_GROUP`, `AZURE_BACKEND_WEBAPP_NAME`,
   `AZURE_FRONTEND_WEBAPP_NAME`, `AZURE_BACKEND_URL` et
   `AZURE_FRONTEND_URL`, ainsi que `AZURE_MYSQL_SERVER_NAME` apres verification
   du nom existant.
7. Proteger l'environnement `production` par approbation humaine requise et
   limiter les branches autorisees. Ce reglage GitHub est externe au depot:
   sans lui, un merge vers `main` peut deployer automatiquement apres la CI.

Le provisionnement local peut etre inspecte sans mutation:

```powershell
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

Tous les noms sont explicites. Sans `-AllowCreateResources`, le script reel fait
uniquement des lectures de controle; `-WhatIf` simule sans mutation. La creation
ou modification de fondation exige `-AllowCreateResources`, une autorisation
humaine et un mot de passe MySQL saisi de facon masquee.

## Configuration backend obligatoire

Copier les noms de `backend/.env.production.example` dans Azure App Settings.
Ne copier aucune valeur reelle dans Git. Avant ouverture au public, la commande
suivante doit reussir dans le conteneur:

```bash
php artisan yazoo:preflight-production
```

Elle exige notamment une cle d'application, SMTP reel, contact, informations
legales, administrateur actif, queue et scheduler. `ADMIN_BOOTSTRAP_ENABLED=false`,
`YAZOO_RUN_MIGRATIONS=false` et `CMI_ENABLED=false` restent les valeurs sures par
defaut. Le workflow canonique fixe `YAZOO_RUN_PRODUCTION_PREFLIGHT=true`; le
conteneur l'execute avant toute migration et avant PHP-FPM/Nginx. Un echec arrete
le conteneur. Hors production, le garde est ignore. En production, une desactivation
explicite permet le demarrage mais emet un avertissement et n'est pas admise par le
workflow canonique.

## Ordre migration, build et deploiement

1. Exiger l'approbation manuelle de l'environnement GitHub `production`.
2. Executer la CI complete du SHA: Composer, npm, couvertures, lint, TypeScript,
   i18n, Playwright, Compose, builds Docker, scan de secrets et SonarCloud si
   configure.
3. Construire et pousser uniquement les deux images `<github.sha>`.
4. Verifier par Azure Control Plane que le serveur designe par
   `AZURE_MYSQL_SERVER_NAME` existe, est `Ready`, conserve au moins 7 jours de
   sauvegardes automatiques et expose une date de restauration point-in-time.
   Tout echec arrete le workflow avant migration et avant changement d'image.
5. Memoriser les images actuellement deployees.
6. Arreter le backend, fixer simultanement son image au SHA,
   `YAZOO_RUN_PRODUCTION_PREFLIGHT=true` et
   `YAZOO_RUN_MIGRATIONS=true`, puis le demarrer. Le script `startup.sh` execute
   le preflight puis `php artisan yazoo:migrate-production` avant nginx; la
   commande de migration utilise `--force` en interne, un verrou de cache
   distribue et refuse un second proprietaire.
7. Attendre `/health/live` et `/health/ready`, verifier le SHA, remettre
   `YAZOO_RUN_MIGRATIONS=false`, redemarrer et verifier une seconde fois.
8. Fixer le frontend sur le meme SHA et le redemarrer.
9. Verifier `/health/live`, `/health/ready`, `/version.json`, la page frontend et
   la correspondance exacte du SHA.
10. Seulement apres ce succes, publier les alias Docker Hub `latest`. Un SHA en
    echec reste disponible pour diagnostic mais ne devient jamais `latest`.

Azure CLI ne fournit pas de commande distante non interactive via
`az webapp ssh --command` pour ce type de conteneur. Le workflow n'utilise donc
pas cette option invalide: l'unique migration est une phase de demarrage
fail-closed, protegee par le verrou distribue et des health checks. Tout echec
restaure les images precedemment memorisees avec les migrations au demarrage
desactivees.

Les migrations de schema doivent etre compatibles avec l'ancienne version pendant
la bascule. Aucun `migrate:fresh`, rollback de schema automatique ou seeder de
production n'est autorise.

## Queue, scheduler et sante

Le conteneur backend lance un worker lorsque `YAZOO_RUN_QUEUE_WORKER=true` et le
scheduler lorsque `YAZOO_RUN_SCHEDULER=true`. Les taches multi-instance utilisent
`withoutOverlapping` et `onOneServer`. Des heartbeats queue/scheduler sont verifies
par `/health/ready`; `YAZOO_REQUIRE_SCHEDULER_HEARTBEAT=true` permet aussi au
service web Compose de surveiller le scheduler dedie sans en lancer un second.
Une readiness degradee doit bloquer le deploiement.

Le Compose local utilise des services `queue` et `scheduler` dedies. Le MySQL
Docker est expose sur `127.0.0.1:3308`; MySQL local reste sur 3306 et XAMPP
MariaDB sur 3307.

## Sauvegarde et rollback

- Activer les sauvegardes automatiques MySQL et documenter la retention reelle.
- Le workflow bloque si la retention est inferieure a 7 jours ou si les metadonnees
  de restauration point-in-time sont absentes.
- Tester reellement une restauration dans une ressource isolee avant une migration
  majeure. Cette preuve reste externe et aucune restauration n'est revendiquee
  par la validation locale.
- Sauvegarder le volume de medias persistants avec une retention validee.
- Le workflow restaure automatiquement les deux images precedentes si la sante ou
  la version echoue, puis controle de nouveau backend et frontend.
- Un echec du rollback fait echouer explicitement le workflow. Il exige alors une
  intervention: garder le site en maintenance, restaurer les tags memorises,
  analyser les logs sans afficher les secrets et restaurer MySQL seulement si le
  plan de reprise de la migration le justifie.

## Premier administrateur et recuperation

Dans une console securisee du conteneur:

```bash
php artisan yazoo:create-admin
```

La commande demande email, nom et mot de passe de facon interactive, confirme
l'action, refuse les mots de passe faibles, promeut un utilisateur existant et est
idempotente pour un admin existant. Aucun mot de passe n'est accepte dans la ligne
de commande.

Recuperation: un operateur Azure autorise ouvre une console, promeut un utilisateur
existant avec `php artisan yazoo:create-admin --promote`, puis execute
`php artisan yazoo:preflight-production`. Ne jamais activer un seeder ou un compte
admin public par defaut.

## Activation des services externes

### SMTP et contact

1. Obtenir un compte SMTP transactionnel et valider le domaine d'envoi.
2. Renseigner `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`,
   `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`,
   `CONTACT_RECIPIENT` et `PRIVACY_CONTACT_EMAIL` dans Azure App Settings.
3. Executer le preflight puis un envoi vers une boite controlee. La production
   refuse les transports `log` et `array`.

### SMS

1. Choisir et financer un fournisseur supporte, obtenir ses identifiants et les
   stocker dans Azure/Key Vault.
2. Pour le pilote `twilio`, renseigner `TWILIO_SID`, `TWILIO_AUTH_TOKEN` et
   `TWILIO_FROM`; pour `orange`, renseigner `ORANGE_SMS_BASE_URL`,
   `ORANGE_SMS_TOKEN` et `ORANGE_SMS_SENDER`.
3. Passer `SMS_DRIVER` de `disabled` a `twilio` ou `orange` seulement apres
   recette avec le fournisseur. Avec
   `disabled`, l'API ne doit jamais annoncer qu'un OTP a ete envoye.

### CMI

1. Obtenir le kit marchand, les identifiants sandbox et la specification de
   signature officiels.
2. Valider le code contre le kit, la sandbox, les callbacks et les exigences PCI.
3. Configurer les variables `CMI_*` dans Azure, jamais dans Git.
4. Garder `CMI_MODE=sandbox` pendant la recette. `CMI_ENABLED=true` en production
   est interdit avant certification/validation officielle.

### Informations legales

Faire confirmer par le responsable et le conseil competent
`LEGAL_ENTITY_NAME`, `LEGAL_STATUS`, `LEGAL_ADDRESS`, `LEGAL_ICE`,
`DATA_CONTROLLER_NAME` et les textes publies. Le preflight echoue si les champs
obligatoires sont absents; aucune valeur ne doit etre inventee.

## Elements non actives

- SMTP reel, fournisseur SMS, CMI production et informations legales finales:
  bloques tant que les comptes ou donnees officielles ne sont pas fournis.
- Deploiement Azure reel: exige les secrets et une autorisation de production.
- SonarCloud: execute seulement quand `SONAR_TOKEN` et `SONAR_ORGANIZATION` sont
  configures; son absence n'est pas presentee comme un scan reussi.

## Role Assignment Verification

- Statut: verifie statiquement pour le script Azure CLI.
- Identite: `ProvisioningPrincipalObjectId`, fournie explicitement par
  l'operateur; aucun ID n'est devine.
- Role: `Key Vault Secrets Officer`, cree de maniere idempotente et limite au
  coffre `yazoo-kv`, pour permettre l'ecriture de `DB-PASSWORD`.
- Les App Services ne declarent actuellement aucune identite managee ni acces
  data-plane au coffre: leurs secrets sont fournis via App Settings par le
  script de configuration. Aucun role generique abonnement/groupe n'est ajoute
  par les scripts.
- Prerequis externe: l'identite de provisionnement doit deja posseder les droits
  de gestion et de creation d'affectations de role sur le groupe cible. Ce droit
  n'est pas cree automatiquement.

## Section 7: Validation Proof

- [x] Azure CLI installe: `az version` -> 2.87.0.
- [ ] Authentification, souscription et region confirmees: non execute, car cette
  mission interdit toute action ou validation sur les ressources de production.
- [x] Syntaxe PowerShell de tous les scripts `deploy/*.ps1`.
- [x] `azure-setup.ps1 -WhatIf` avec images SHA et principal factices: VNet,
  sous-reseaux delegues, MySQL prive, Key Vault, role borne et App Services
  apparaissent sans mutation.
- [x] `azure-dockerhub-deploy.ps1 -WhatIf`: aucune sentinelle de secret dans la
  sortie; les tags `latest` sont refuses. Ce script est reserve a la configuration
  initiale et exige une autorisation explicite hors simulation.
- [x] `docker compose config --quiet`.
- [x] Build local des images backend et frontend avec `APP_VERSION` fixe.
- [x] Workflows valides par Symfony YAML et actionlint 1.7.12.
- [ ] Compilation Bicep, `az deployment validate`, Azure Policy et preview
  Azure `what-if`: non applicables aux scripts CLI actuels ou impossibles sans
  souscription/autorisation. Aucun succes n'est revendique.
- [ ] Health checks, migration et rollback Azure reels: non executes sans
  secrets, comptes externes et autorisation de production.

Le statut n'est volontairement pas `Validated`: les controles Azure live,
l'approbation de souscription/region et le deploiement restent externes. Ne pas
invoquer `azure-deploy` dans le cadre de cette mission.
