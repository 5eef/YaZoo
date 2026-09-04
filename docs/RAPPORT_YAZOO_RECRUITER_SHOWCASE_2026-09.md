# Rapport YaZoo — recruiter showcase provider-neutral

Date de clôture locale : 4 septembre 2026
Branche : `main`

## 1. HEAD avant modifications

`24174e5256df61f08c6b8a524f5e92e3e5b295d3`

Le travail a été réalisé directement dans `C:\project\YaZoo`, en conservant les
modifications locales présentes au démarrage et sans reset, restore, clean ou
lecture d'un fichier `.env` secret.

## 2. HEAD final de l'implémentation

`9f0e81e98974ea640e731443443c7a3c7534a3e9`

Ce SHA contient l'ensemble du code, des captures et de la documentation technique.
Le rapport lui-même est livré dans le commit documentaire suivant afin de pouvoir
citer sans ambiguïté le SHA final de l'implémentation qu'il audite.

## 3. Fichiers modifiés

Le commit technique porte sur 104 chemins : 1 325 insertions et 800 suppressions.
L'inventaire exact et reproductible est obtenu avec :

```powershell
git show --name-status --format= 9f0e81e98974ea640e731443443c7a3c7534a3e9
```

Les groupes concernés sont :

- racine : `README.md`, `Dockerfile.demo`, `.env.example`, `.gitignore`,
  `.dockerignore`, `docker-compose.yml`, `CHANGELOG.md` et rapports historiques ;
- backend : exemples d'environnement, Docker/Nginx/startup, commandes Artisan,
  middleware, configuration, stockage média, migrations, seeders et tests ;
- frontend : exemples d'environnement, image Docker, SEO, i18n, pages publiques,
  configuration Vite/Nginx, verrou npm, Vitest et Playwright ;
- exploitation : `.github/workflows/ci.yml`, `infra/nginx/frontend.conf`,
  `deploy/README.md`, `scripts/README.md`, smoke tests et validateurs ;
- documentation : guide free-tier, compatibilité TiDB, archive Azure et deux
  captures Playwright réelles sous `docs/screenshots/`.

## 4. Dépendances Azure retirées de l'environnement actif

- suppression des hypothèses `azurewebsites.net`, `mysql.database.azure.com`,
  `WEBSITES_*` et `/home/site/...` du code et de la configuration actifs ;
- retrait du bloc Azure Blob inutilisé ;
- CSP, CORS, proxy HTTPS, stockage et health checks rendus provider-neutral ;
- remplacement de `BootstrapAzureShowcase` et
  `yazoo:bootstrap-azure-showcase` par `BootstrapShowcase` et
  `yazoo:bootstrap-showcase` ;
- retrait du workflow Azure automatique de `.github/workflows/` ;
- URL SEO/canonical/sitemap générées seulement avec `VITE_SITE_URL` vérifiée.

Le scan du périmètre actif ne laisse qu'une occurrence `azurewebsites.net` dans
une assertion négative de test qui vérifie précisément son absence du sitemap.

## 5. Éléments Azure conservés comme archive

`docs/archive/azure/` conserve les anciens guides App Service, persistance média,
rapports d'incident et de vérification, monitoring/backup et le workflow OIDC.
`docs/archive/azure/README.md` précise que les ressources Azure Student ont été
décommissionnées. Les anciens scripts restent présents pour l'historique mais
sont identifiés comme legacy dans `deploy/README.md` et `scripts/README.md` et ne
sont plus appelés par la CI active.

## 6. Architecture showcase finale

GitHub fournit le source à un service web Docker free-tier. Une seule image sert
la SPA React et l'API Laravel derrière le même Nginx et la même origine HTTPS.
TiDB Cloud Starter fournit la base MySQL-compatible. Brevo SMTP et Cloudflare R2
restent facultatifs. Aucun Redis, MongoDB, serveur Reverb, worker ou scheduler
séparé n'est requis pour afficher la démonstration de base.

## 7. Dockerfile utilisé

`Dockerfile.demo` est une image multi-stage : Node 22 construit React, Composer
installe Laravel, puis PHP 8.4 FPM et Nginx servent l'ensemble sur le port 8080.
`backend/nginx.demo.conf` route API, Sanctum, broadcasting, health et storage vers
Laravel, avec fallback `index.html` pour les deep links React.

## 8. Comportement storage

Le compute free-tier peut être éphémère. Les 21 PNG fictifs sont embarqués dans
l'image et `yazoo:ensure-showcase-media` restaure uniquement les médias
`marketplace/demo/*` manquants à chaque démarrage, sans duplication ni écrasement
hors showcase. Les uploads persistants sont refusés explicitement en showcase par
défaut avec une réponse « Demo mode ». R2 S3-compatible est documenté comme
évolution facultative.

## 9. Queue, cache et session

Le profil showcase utilise `SESSION_DRIVER=database`, `CACHE_STORE=database` et
`QUEUE_CONNECTION=sync`. Le worker et le scheduler séparés sont désactivés. Le
profil `production` conserve ses contrôles stricts, notamment stockage persistant,
mail opérationnel, scanner média et heartbeat scheduler quand ils sont exigés.

## 10. Realtime

`VITE_REALTIME_ENABLED=false` et `BROADCAST_CONNECTION=log` évitent toute boucle
WebSocket dans le showcase. Reverb reste disponible pour l'architecture complète
et le développement local. Les vues messages et notifications restent
consultables sans serveur temps réel dédié.

## 11. Stratégie TiDB

MySQL reste le contrat principal. Les migrations FULLTEXT et la recherche associée
sont pilotées par `YAZOO_FULLTEXT_SEARCH_ENABLED`; le showcase utilise le fallback
`LIKE`. Les raw SQL, `change()`, JSON, transactions et verrous ont été inventoriés
dans `docs/TIDB_SHOWCASE_COMPATIBILITY.md`. La migration initiale sur base vide est
documentée et le verrou de migration utilise un verrou fichier avant l'existence
des tables de cache.

## 12. Stratégie email

Sans credential, le showcase utilise le mailer `log` et ne prétend pas envoyer de
mail réel. Brevo SMTP Free peut être activé avec les variables Laravel 12
(`MAIL_SCHEME` notamment). Les secrets restent hors Git. SMS est `disabled`, CMI
est désactivé, et Google OAuth n'est affiché/activé qu'une fois ses trois variables
configurées ; la callback réelle est `/api/auth/google/callback`.

## 13. Tests exacts exécutés

- `composer validate --strict`, `composer audit --no-interaction` ;
- `php artisan test`, `composer test:coverage`, `vendor\bin\pint.bat --test` ;
- `npm ci`, `npm audit`, `npm audit --omit=dev` ;
- `npm run lint`, `typecheck`, `audit:i18n`, `test:coverage -- --run`,
  `build`, `audit:tailwind`, `test:e2e` ;
- `docker compose config --quiet`, builds backend/frontend/showcase ;
- `node scripts/validate-showcase-deployment.mjs` et le gate preflight POSIX ;
- smoke runtime des images, smoke HTTP/auth showcase, captures responsive et
  `python -m py_compile` des générateurs modifiés.

## 14. Résultats exacts

- backend : 394 tests, 2 142 assertions, couverture Clover et HTML générée ;
- frontend : 38 fichiers de tests et 131 tests réussis ; couverture V8 :
  32,44 % statements, 24,95 % branches, 31,70 % functions, 32,90 % lines ;
- i18n : 1 964 clés identiques en français, arabe et anglais ;
- Tailwind : 183 classes d'opacité numériques générées ;
- Pint, ESLint, TypeScript, build Vite, placeholders légaux, Compose, preflight et
  validateur provider-neutral : réussis.

## 15. Vulnérabilités audit

Composer : aucune advisory. Npm production : 0 vulnérabilité. L'audit npm complet
a d'abord trouvé trois vulnérabilités transitives de développement
(`@humanfs/node`, `browserslist`, `postcss-selector-parser`) ; `npm audit fix` a
mis à jour uniquement le verrou et les audits complet et production finaux
indiquent tous deux 0 vulnérabilité.

## 16. Résultat build Docker

`yazoo-backend:local`, `yazoo-frontend:latest` et `yazoo-demo:local` sont construits
avec succès. Le smoke runtime retourne `release-image-runtime-smoke=ok`. Une
inspection complémentaire montre les processus applicatifs backend sous
`www-data` et frontend sous `nginx`. Les conteneurs et le réseau de test
temporaires ont été supprimés après validation.

## 17. Résultat E2E

Playwright : 97 scénarios sur 97 réussis en Chromium, couvrant pages publiques,
auth simulée, routes applicatives, responsive, RTL, thème sombre et accessibilité.
Le lanceur réserve désormais un port libre au lieu de supposer 5173.

Le vrai conteneur showcase a aussi été contrôlé à 320, 768 et 1 440 px : 0 erreur
console inattendue, 0 requête échouée, 0 réponse HTTP inattendue et 0 WebSocket.
Le smoke HTTP a obtenu 200 pour `/`, les health checks, un deep link, la marketplace
publique et un PNG `/storage`; Sanctum CSRF a répondu 204. Le parcours réel
register → me → logout → login → me → logout a répondu respectivement
201/200/200/200/200/200.

## 18. État Git

Le commit technique est propre et utilise l'auteur local `Youssef BOUGHIOUL
<bough.youssef@gmail.com>`. Aucun `.env`, credential, token, vendor, node_modules,
coverage, dist, log ou base SQLite réelle n'est ajouté. `output/` et les caches
Python sont ignorés. `git diff --check` est réussi.

## 19. État GitHub metadata

Le remote est `https://github.com/5eef/YaZoo.git`. `gh auth status` échoue car les
jetons locaux des comptes `5eef` et `Seef590` sont invalides ; aucune métadonnée
GitHub n'a donc été modifiée et aucune homepage fictive n'a été ajoutée.

Après `gh auth login -h github.com`, la commande préparée est :

```powershell
gh repo edit 5eef/YaZoo --description "YaZoo — plateforme sociale et marketplace animalière full-stack construite avec React, Laravel, MySQL et Docker." --add-topic laravel --add-topic react --add-topic mysql --add-topic docker --add-topic marketplace --add-topic social-network --add-topic rest-api --add-topic vite --add-topic php --add-topic javascript --add-topic portfolio --add-topic morocco
```

## 20. État réel de la démonstration

**READY FOR MANUAL CLOUD SETUP**

La préparation locale est complète et testée. Aucun compte ou service cloud n'a
été créé automatiquement.

## 21. URL publique

Aucune URL publique n'existe ou n'a été vérifiée pendant cette intervention.
Le README indique honnêtement « Demo publique : en préparation ».

## 22. Limites connues du free tier

Koyeb Free fournit peu de CPU/RAM, scale-to-zero après inactivité, cold starts,
filesystem éphémère et aucun SLA commercial. TiDB Starter applique ses quotas et
limites de compatibilité/connexion TLS. Le scheduler n'est pas 24/7, le temps réel
est désactivé, les uploads ne sont pas annoncés persistants, et les emails réels
nécessitent un compte Brevo configuré.

## 23. Étapes manuelles restantes

1. Créer manuellement un cluster TiDB Starter gratuit vide et relever sa CA/TLS.
2. Créer un Web Service Koyeb gratuit depuis GitHub avec `Dockerfile.demo`.
3. Copier les variables de `.env.showcase.example` dans les secrets Koyeb.
4. Générer `APP_KEY`, mot de passe showcase, secret MFA et codes de récupération.
5. Renseigner exactement le host Koyeb et le host/base TiDB dans les garde-fous.
6. Déployer, attendre le cold start, puis exécuter les smoke tests HTTP/auth.
7. Configurer Brevo et/ou R2 uniquement si ces fonctions facultatives sont voulues.
8. Ajouter l'URL au README/homepage seulement après une réponse HTTPS 200 vérifiée.
