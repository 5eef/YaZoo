# Deploiement gratuit du showcase YaZoo

## Architecture retenue

```text
GitHub -> Koyeb Free Web Service -> Dockerfile.demo
                                -> React + Laravel, meme origine HTTPS
                                -> TiDB Cloud Starter (MySQL compatible)
                                -> Brevo SMTP (facultatif)
                                -> Cloudflare R2 (evolution facultative)
```

Cette cible sert une demonstration portfolio, pas une production commerciale et pas un SLA. React et Laravel partagent le meme host : `/api`, `/sanctum`, `/health`, `/storage` et `/broadcasting` sont routes vers Laravel; les autres deep links retournent la SPA React.

## Verification locale

```powershell
docker build -f Dockerfile.demo -t yazoo-demo:local .
```

Le demarrage reel exige une base MySQL vide et des secrets de test non versionnes. Copier les noms de variables de [`backend/.env.showcase.example`](../backend/.env.showcase.example) dans le gestionnaire de secrets du fournisseur. Ne jamais committer le fichier rempli.

## TiDB Cloud Starter

1. Creer une instance **Starter** avec une limite de depense mensuelle egale a `0`.
2. Creer une base vide `yazoo_showcase` et generer un utilisateur dedie.
3. Copier exactement l'endpoint, le port et le nom utilisateur affiches par TiDB.
4. Conserver TLS actif et configurer `MYSQL_ATTR_SSL_CA` vers le magasin CA Alpine.
5. Tester la connexion, puis laisser `yazoo:migrate-production` migrer uniquement la base attendue.

TiDB indique actuellement cinq instances Starter gratuites au maximum par organisation, chacune avec 5 GiB de stockage ligne, 5 GiB colonne et 50 millions de RU mensuelles. Une instance a limite de depense `0` refuse les nouvelles connexions lorsque le quota est atteint. Ces limites doivent etre reverifiees avant creation : [quotas Starter officiels](https://docs.pingcap.com/tidbcloud/serverless-limitations/) et [creation avec spending limit](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter).

## Koyeb Free Web Service

1. Importer `https://github.com/5eef/YaZoo` dans Koyeb.
2. Choisir **Web Service**, builder Docker et `Dockerfile.demo`.
3. Selectionner exclusivement l'instance marquee **Free**; ne pas choisir d'instance payante.
4. Exposer le port HTTP `8080`; health check `/health/live`.
5. Ajouter les variables du fichier showcase comme secrets/variables Koyeb.
6. Renseigner `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, `YAZOO_SHOWCASE_APP_HOST` et `VITE_SITE_URL` avec le vrai host attribue.
7. Garder `VITE_REALTIME_ENABLED=false`, `SMS_DRIVER=disabled` et `CMI_ENABLED=false`.

La documentation Koyeb annonce actuellement 512 MiB RAM, 0,1 vCPU, 2 Go SSD, une seule region et une seule instance gratuite par organisation. Elle scale a zero apres une heure sans trafic, ne prend pas en charge les volumes persistants et son disque local est ephemere : [instances Koyeb](https://www.koyeb.com/docs/reference/instances), [scale-to-zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero), [stockage local](https://www.koyeb.com/docs/reference/storage).

Le bootstrap est idempotent. A chaque demarrage, `yazoo:ensure-showcase-media` restaure les 21 images versionnees manquantes dans `storage/app/public/marketplace/demo`. Les uploads utilisateur sont refuses avec une reponse explicite `showcase.uploads_disabled`; aucune persistance fictive n'est annoncee.

## Email Brevo facultatif

Sans credentials, conserver `MAIL_MAILER=log`. Pour activer les emails transactionnels, utiliser un sender verifie et une **cle SMTP** Brevo (pas une cle API) :

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME="YaZoo"
CONTACT_RECIPIENT=bough.youssef@gmail.com
```

Brevo documente le port 587 sans chiffrement SMTP explicite (STARTTLS negocie par le transport) et le port 465 avec SSL/TLS. Le plan Free annonce actuellement 300 envois par jour : [integration SMTP](https://developers.brevo.com/docs/smtp-integration), [limites Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan).

## Stockage R2 facultatif

Le showcase initial n'en depend pas. Pour une evolution avec uploads persistants, Laravel possede deja un disque S3 compatible. Configurer `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_ENDPOINT`, `AWS_URL` et `AWS_USE_PATH_STYLE_ENDPOINT`, puis activer les uploads seulement apres un test lecture/ecriture/suppression.

R2 expose une API S3-compatible. Son quota gratuit Standard annonce actuellement 10 Go-mois, 1 million d'operations classe A et 10 millions classe B par mois; l'usage au-dela est facturable : [API S3 R2](https://developers.cloudflare.com/r2/get-started/s3/), [tarification R2](https://developers.cloudflare.com/r2/pricing/).

## Validation apres deploiement

Verifier avec le vrai host : `/`, `/health/live`, `/health/ready`, `/api`, `/sanctum/csrf-cookie`, inscription, connexion, `/api/auth/me`, deconnexion, marketplace publique, feed authentifie, deep links, assets et les 21 fichiers `/storage/marketplace/demo/*`. Verifier aussi les largeurs 320, 768 et 1440 px et l'absence de boucle WebSocket dans la console.

OAuth Google reste facultatif. Le callback exact du projet est `https://<demo-host>/api/auth/google/callback`. Ne mettre `VITE_GOOGLE_AUTH_ENABLED=true` qu'apres configuration et test des trois variables Google.
