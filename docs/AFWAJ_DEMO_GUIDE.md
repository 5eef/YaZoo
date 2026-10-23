# AFWAJ — YaZoo 2026 : guide de démonstration

Préparation mise à jour le 10 octobre 2026. Les modifications locales doivent encore être
commitées par le propriétaire, validées en CI et déployées. Ce guide ne constitue
pas une attestation de disponibilité du nouveau dataset en ligne.

## Accès jury

- **Web :** https://yazoo-showcase.pages.dev
- **Backend :** https://yazoo-showcase.onrender.com ; Render Free, susceptible de démarrer à froid. Contrôle du 9 octobre : Web HTTP 200, proxy santé HTTP 503 `waking`, origine sans réponse dans le délai de 20 secondes. Disponibilité à revérifier avant la présentation via `/health/live` et `/demo-backend-status`.
- **Android preview APK :** À REMPLIR avec l’URL réelle après le build EAS réussi.
- **QR Android :** À GÉNÉRER à partir de cette URL réelle après le build. Aucun QR provisoire.
- **Compte non-admin :** `client.fes@yazoo.test` — « Client DEMO AFWAJ ».
- **Mot de passe :** fourni séparément au jury par le propriétaire. Aucun mot de passe dans ce document, Git, l’APK ou le frontend.
- Ne fournir aucun compte administrateur au jury. Les comptes professionnels et la maintenance restent au propriétaire.

## Parcours Web — trois minutes

1. 0:00–0:25 : accueil, expliquer le pilote Sefrou → Fès → Meknès et la mention DEMO.
2. 0:25–0:55 : professionnels, filtrer Sefrou ; ouvrir « Cabinet fictif DEMO AFWAJ Sefrou ».
3. 0:55–1:20 : montrer spécialités, horaires et créneaux ; consulter aussi les services de garde/éducation fictifs de la ville.
4. 1:20–1:55 : se connecter avec le compte jury, demander un créneau libre ou montrer un rendez-vous déjà enregistré. Les consultations vétérinaires se réservent depuis le vétérinaire ; les services de garde/éducation conservent leur parcours existant.
5. 1:55–2:20 : Messages, ouvrir une conversation DEMO avec un vétérinaire ; préciser qu’aucun soin réel n’est organisé.
6. 2:20–3:00 : Feed, posts image/vidéo, commentaire, Like, suivi et Story image/vidéo.

## Parcours Android — trois minutes

1. 0:00–0:25 : ouverture app → nouveau logo YaZoo → transition Login → authentification avec le même compte non-admin. La langue de l’entrée suit automatiquement celle du téléphone (ar/en, sinon fr), sans sélecteur avant connexion.
2. 0:25–1:05 : Feed → Search (« DEMO » ou « Sefrou ») → Stories → Reels. Les deux animations synthétiques portent « YaZoo DEMO ».
3. 1:05–1:45 : professionnel/vétérinaire → profil → service/créneau ; montrer les services puis revenir au vétérinaire pour le RDV.
4. 1:45–2:20 : RDV, choisir un créneau libre ou consulter les exemples pending/confirmed/completed.
5. 2:20–3:00 : Messages → conversation fictive → Profile ; le choix volontaire FR/EN/AR reste dans les paramètres après connexion.

Les deux clients utilisent exactement le même backend et la même base TiDB
`yazoo_showcase` : une action Web doit se retrouver après actualisation Android.

## Données fictives et durée de vie

Le bootstrap v2 contient 20 comptes, 3 vétérinaires DEMO (Sefrou, Fès, Meknès),
10 services existants localisés dans ces villes, 12 disponibilités au total,
3 exemples de RDV, 5 conversations et 10 messages, 5 posts (3 images et 2 vidéos),
2 Stories (image et vidéo), 6 likes, 4 commentaires et 3 suivis.
Les réservations marketplace et autres fonctionnalités existantes sont conservées.

Les spécialités vétérinaires décrivent consultation préventive, vaccination et
suivi. Les services marketplace restent les catégories métier supportées : garde
et éducation. Aucun type de service artificiel n’est ajouté pour les seeds.

Neuf créneaux libres sont créés à J+1/J+2/J+3 du bootstrap. Le propriétaire doit
renouveler les disponibilités depuis le compte professionnel avant une présentation
ultérieure. Les créneaux 2030 restent des exemples historiques de fixtures.
Les Stories AFWAJ expirent le 1er janvier 2027 ; les Stories normales conservent
leur durée métier. Publier de nouvelles Stories DEMO après cette date.

Les deux MP4 locaux de quatre secondes font environ 80 Ko chacun ; ils montrent
le fonctionnement des lecteurs, sans images de vrais soins. Ils sont inclus dans
`Dockerfile.api-demo` et restaurés au redémarrage par `yazoo:ensure-showcase-media`.
Les uploads utilisateur sur le disque Render Free ne sont pas persistants.

Un showcase v1 intact peut être enrichi une seule fois après les mêmes garde-fous
de cible. Une base v1 comportant de nouveaux posts/Stories/suivis est refusée :
examiner et sauvegarder la base avant toute décision manuelle ; ne pas la vider
pour réussir la démonstration. La mise à niveau conserve les credentials existants.
Une nouvelle installation applique `YAZOO_SHOWCASE_PASSWORD` à tous les comptes.

## Démarrage à froid Render

Le proxy peut répondre `503`, `code=DEMO_BACKEND_WAKING`, `Retry-After: 4`.
Le mobile préserve ces informations et affiche :

- FR : « Le serveur de démonstration démarre. Réessayez dans quelques secondes. »
- EN : « The demo server is starting. Try again in a few seconds. »
- AR : « خادم العرض التوضيحي قيد التشغيل. أعد المحاولة بعد بضع ثوانٍ. »

Utiliser Réessayer / Retry après quelques secondes. À l’écran Login, ce bouton
vérifie seulement la disponibilité ; appuyer ensuite explicitement sur Connexion.
Aucun POST n’est rejoué automatiquement, aucune boucle de retry mobile.
Le Web conserve son polling de santé borné à 90 secondes, puis son bouton Réessayer.

## Configuration Cloudflare Pages

Branche de production à sélectionner après validation : `startup-2026`.
Racine du projet : `frontend`. Commande : `npm ci && npm run build`.
Répertoire de sortie : `dist`. Node : `22.22.0` ou une version compatible avec les engines.
Les Functions du dossier `frontend/functions` doivent être déployées avec les assets.

```dotenv
VITE_API_URL=/api
VITE_STORAGE_URL=/storage
VITE_SITE_URL=https://yazoo-showcase.pages.dev
VITE_STARTUP_PILOT=true
VITE_ANIMAL_LISTINGS_PUBLIC=false
VITE_REALTIME_ENABLED=false
VITE_GOOGLE_AUTH_ENABLED=false
```

Secret serveur Cloudflare, à définir dans les bindings Functions de production
et de preview si utilisé : `BACKEND_ORIGIN=https://yazoo-showcase.onrender.com`.
Ne jamais utiliser un préfixe `VITE_` pour ce binding. Authorization Bearer Sanctum,
Accept-Language et Content-Type sont conservés par le proxy et testés automatiquement.

## Image Render et commandes Docker

À exécuter par le propriétaire **après** commit et CI verte. Le tag est le SHA
complet du futur commit validé, pas `ad77546` qui précède ces corrections.
Depuis la racine du dépôt, PowerShell :

```powershell
$releaseSha = git rev-parse HEAD
docker build --platform linux/amd64 --build-arg "APP_VERSION=$releaseSha" -f backend/Dockerfile -t "5eef/yazoo-api:$releaseSha" .
docker build --platform linux/amd64 --build-arg "APP_VERSION=$releaseSha" -f frontend/Dockerfile -t "5eef/yazoo-frontend:$releaseSha" .
docker build --platform linux/amd64 --build-arg "APP_VERSION=$releaseSha" -f Dockerfile.api-demo -t "5eef/yazoo-api-demo:$releaseSha" .
```

Smoke Linux/Git Bash :

```sh
sh scripts/smoke-test-release-images.sh "5eef/yazoo-api:$(git rev-parse HEAD)" "5eef/yazoo-frontend:$(git rev-parse HEAD)"
```

Image exacte à sélectionner dans Render après publication autorisée :
`docker.io/5eef/yazoo-api-demo:<SHA_COMPLET_VALIDÉ>`, idéalement son digest immuable.
Ne pas choisir `yazoo-api` ni un tag `latest` pour le showcase.
Port `8080`, health check `/health/live`. Aucun push ni déploiement n’est fait par
la préparation de ce guide.

Partir de `backend/.env.showcase.example`, fournir les credentials exclusivement
dans Render et conserver les paramètres TiDB/TLS existants. Valeurs publiques :

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yazoo-showcase.pages.dev
FRONTEND_URL=https://yazoo-showcase.pages.dev
PUBLIC_STORAGE_URL=/storage
YAZOO_DEPLOYMENT_PROFILE=showcase
YAZOO_SHOWCASE_APP_HOST=yazoo-showcase.pages.dev
YAZOO_SHOWCASE_DATABASE_NAME=yazoo_showcase
DB_DATABASE=yazoo_showcase
SANCTUM_STATEFUL_DOMAINS=yazoo-showcase.pages.dev,yazoo-showcase.onrender.com
CORS_ALLOWED_ORIGINS=https://yazoo-showcase.pages.dev,https://yazoo-showcase.onrender.com
```

`APP_KEY`, `DB_USERNAME`, `DB_PASSWORD`, `YAZOO_SHOWCASE_PASSWORD` (20 caractères
minimum), secret MFA et codes de récupération restent dans le secret store.
Conserver les garde-fous d’égalité de host/base et la confirmation exacte existante.
Utiliser les flags migrations/bootstrap du modèle showcase lors de l’initialisation
ou mise à niveau autorisée, puis désactiver le bootstrap. La réhydratation des
médias reste nécessaire à chaque redémarrage. Aucun port local DB n’est modifié.

## EAS preview APK — étapes propriétaire

SDK Expo 57 ; `preview` utilise l’environnement `preview`, la distribution interne,
les credentials distants et un APK. `production` reste un AAB.
Depuis `C:\project\YaZoo\mobile`, après validation :

```powershell
npx eas-cli@latest login
npx eas-cli@latest project:info
# Seulement si le projet n’est pas encore associé au bon compte :
npx eas-cli@latest init
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://yazoo-showcase.pages.dev/api --environment preview --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

Le propriétaire valide l’association du projet et les credentials Android distants.
Ne pas commiter de keystore, credentials.json, token Expo ou credentials de service.
Après succès, recopier l’URL APK réelle en tête de ce guide et générer son QR.
Ne lancer aucun EAS build automatique nécessitant login/association humaine.
Références : [environnements EAS](https://docs.expo.dev/eas/environment-variables/),
[distribution interne](https://docs.expo.dev/build/internal-distribution/).

## Limites et présentation publique

La démo ne prouve aucune traction, vente, partenariat ou consultation réelle.
Les noms, interactions et avis sont des données fictives. Paiement CMI, SMS,
Google Login et temps réel ne sont pas activés par le profil showcase ; les
messages se démontrent avec actualisation. Les uploads sont désactivés par défaut.
L’export Android automatisé ne remplace pas une validation sur appareil : aucun
test téléphone/ADB n’a été réalisé pour cette préparation.

Après CI verte, recommandation B : conserver `startup-2026` et utiliser
https://github.com/5eef/YaZoo/tree/startup-2026 dans le dossier de candidature pour
éviter une arrivée sur une ancienne version de `main`. Aucune fusion automatique.
Tag recommandé après accord : `afwaj-2026-demo-v1`. Aucun tag créé ici.

## Identité et entrée mobile — 10 octobre 2026

Le nouveau logo de `docs/logo` est intégré aux assets runtime Web et mobile, sans changer ses formes ni ses couleurs. Voir [mapping des assets](BRAND_ASSETS.md). La palette et les thèmes clair/sombre sont conservés ; une surface claire derrière le logo complet assure sa lecture en mode sombre.

Sans session : logo centré, présence de 800 ms puis translation verticale et apparition du formulaire sur 550 ms. Le formulaire devient interactif dès le début de la transition. Reduce Motion affiche directement l’état final. Avec une session restaurée : logo → Feed, sans flash Login. FR/EN/AR et RTL sont conservés. La QA physique Expo Go/TalkBack/clavier/grandes polices reste à faire par le propriétaire. Aucun EAS build ou déploiement n’a été lancé.
# Release cloud finale

La configuration et les commandes propriétaire sont regroupées dans [AFWAJ_DEPLOYMENT_FINAL](AFWAJ_DEPLOYMENT_FINAL.md). Compte jury non-admin : `client.fes@yazoo.test`, password privé fourni séparément via `YAZOO_SHOWCASE_PASSWORD`. La commande protégée `yazoo:sync-showcase-credentials` permet une rotation sans reseed. Les admins sont exclus ; toute rotation admin historique reste une opération privée propriétaire.
