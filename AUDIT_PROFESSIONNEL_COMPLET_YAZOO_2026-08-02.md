# Audit professionnel complet de YaZoo

**Date de l'audit :** 2 août 2026  
**Référentiel audité :** `C:\Users\seef7\OneDrive\Desktop\YaZoo`  
**Branche locale :** `fix/free-production-readiness` — commit `720f597`  
**Cible déclarée :** Laravel + React, déployée sur Microsoft Azure  
**Niveau de confiance global :** élevé sur l'analyse statique et les tests locaux ; moyen sur l'expérience navigateur ; élevé sur les faits Azure interrogés ; faible sur la tenue en charge faute de test de charge.

---

# 1. Synthèse exécutive

## Verdict sans détour

YaZoo est un **produit logiciel substantiel et démontrable**, pas une coquille vide. Le backend dispose d'une couverture automatisée inhabituelle pour un projet de ce stade, les domaines fonctionnels sont nombreux, les migrations et transactions montrent un vrai effort d'ingénierie, et le frontend possède une base SEO, i18n et responsive sérieuse.

Cependant, **YaZoo n'est pas prêt pour une production commerciale, une due diligence technique, ni une présentation institutionnelle non encadrée**. Les obstacles ne sont pas cosmétiques : contrôle d'accès incomplet sur les contenus privés/modérés, propriété des médias non garantie, MFA administrateur fail-open, intégration de paiement non homologuée, incohérence probable du flux CSRF entre sous-domaines, production Azure en retard sur le code local, identité légale publique incomplète, réseau MySQL trop ouvert et CI courante rouge.

La situation exacte est la suivante :

```text
Code local actuel ────── 21 commits non présents sur main ──────┐
  tests PHP/JS solides                                          │
  correctifs récents nombreux                                   ├─ écart de livraison
  CI courante rouge                                              │
                                                                │
Production Azure ─────── image :latest / version ancienne ──────┘
  pages légales incomplètes
  endpoint marketplace récent absent
  configuration et sécurité d'infrastructure insuffisantes
```

Le score global est **58/100**. Une démo contrôlée est possible après correction des éléments de présentation les plus visibles. Une bêta fermée exige les P0 sécurité et intégrité. La production exige en plus une vraie chaîne de déploiement, une homologation paiement, une architecture de stockage et de données adaptée, ainsi que des preuves d'exploitation.

## Décision de readiness

| Cible | Décision | Justification synthétique |
|---|---|---|
| Démo interne | ☑ Oui, sous conditions | Scénario maîtrisé, données fictives, paiement désactivé, pages légales non présentées comme finales |
| Démo Fondation/partenaires | ☐ Pas aujourd'hui | Production ancienne, mentions légales incomplètes, feedback factice, CI rouge |
| Bêta fermée | ☐ Non | P0 ACL, médias, MFA, CSRF et upload à corriger et retester |
| Production | ☐ Non | Sécurité, paiement, données, Azure, exploitation et conformité insuffisants |
| Investisseurs | ⚠ Prototype présentable | Présentable comme MVP en développement, pas comme plateforme prête au marché |
| Clients réels | ☐ Non | Risque de confidentialité, d'intégrité et d'indisponibilité |
| Forte montée en charge | ☐ Non | B1 mono-instance, stockage local, N+1, absence de test de charge et de HA |

## Les signaux les plus importants

✔ **302 tests backend, 1 705 assertions**, tous réussis.  
✔ Couverture backend mesurée : **84,54 % des instructions** et **70,43 % des méthodes**.  
✔ **109 tests frontend** réussis en série ; lint, typecheck et build réussis.  
✔ `composer audit` et `npm audit` : **aucune vulnérabilité connue** au moment de l'audit.  
✔ 1 958 clés i18n alignées en français, arabe et anglais.  
⚠ 14 fichiers PHP échouent au contrôle de style Pint.  
⚠ La couverture frontend globale apparente de 73,91 % porte sur un sous-ensemble explicitement inclus ; elle ne décrit pas tout le frontend.  
❌ La CI du commit audité échoue : deux contrastes Axe sérieux et un job Gitleaks bloqué par permissions GitHub.  
❌ La production Azure publique ne correspond pas au commit audité.  
❌ Plusieurs vulnérabilités logiques ne sont détectables ni par les audits de dépendances ni par le taux de couverture.

---

# 2. Méthodologie, périmètre et limites

## Périmètre réellement parcouru

L'inventaire, y compris les fichiers cachés et ignorés, contient plus de 22 000 entrées. Après exclusion des dépendances tierces générées (`vendor`, `node_modules`) et des objets internes Git, **1 450 fichiers de projet** ont été inventoriés. Le périmètre de code, configuration, tests et documentation sélectionné représente **641 fichiers et environ 71 012 lignes**. Le backend de première partie représente 373 fichiers inspectés et expose 162 routes.

Les catégories suivantes ont été examinées :

| Catégorie | Vérification effectuée |
|---|---|
| Laravel | contrôleurs, modèles, policies, middlewares, services, requêtes, ressources, événements, jobs, notifications, commandes, providers, routes, exceptions et tests |
| React | pages, composants, hooks, contexts, API client, routing, i18n, styles, tests et configuration de build |
| Base de données | toutes les migrations, factories, seeders, contraintes, index et relations visibles dans le dépôt |
| Infrastructure | Dockerfiles, Compose, Nginx, scripts de démarrage, workflows GitHub Actions, exemples d'environnement et scripts de garde |
| Azure | ressources réelles, App Services, plan, réglages, MySQL, Redis, Key Vault, santé publique et en-têtes HTTP |
| Git | branches, historique, écarts `main`/branche, fichiers suivis/ignorés et artefacts |
| Documentation | README, runbooks, rapports antérieurs, exports Sonar et livrables bureautiques/archives |
| Exécution | tests, couverture, lint, typecheck, build, audits de dépendances, route listing, preflight disponibles et requêtes HTTP non destructives |

Les fichiers de dépendances n'ont pas été relus ligne par ligne comme du code de première partie : leur contenu est déterminé par les lockfiles et a été évalué par les gestionnaires de paquets et les audits de sécurité. Les binaires ZIP, GZ, DOCX et PPTX ont été inventoriés par type, taille et contenu d'archive lorsque pertinent ; ils ne sont pas assimilés à du code source.

## Limites et absence de suppositions

- Le navigateur intégré n'était pas disponible dans cette session (`agent.browsers.list()` ne retournait aucun navigateur). Les conclusions UI visuelles reposent donc sur le DOM, le CSS généré, les tests Axe et le code ; **aucune validation visuelle humaine multi-écran n'est revendiquée**.
- Aucun test de charge, test de restauration de sauvegarde, scan DAST authentifié, audit externe CMI, audit juridique marocain, test réel SMS/e-mail ou test réel multi-utilisateur concurrent n'a été exécuté.
- Les tests backend utilisent SQLite en mémoire. Ils ne prouvent pas tous les comportements MySQL : FULLTEXT, collations, verrous, migrations et courses.
- Les secrets ont été contrôlés par présence, historique et mécanisme de stockage sans afficher leurs valeurs.
- Deux appels Azure CLI destinés à lire la configuration des logs ont été enregistrés par Azure comme opérations `Update web sites config/logs`. Aucun paramètre de changement n'avait été fourni et les valeurs observées sont restées identiques. Par transparence, cet effet de contrôle-plane est consigné ; aucun rollback non autorisé n'a été tenté.
- L'absence d'une fonctionnalité dans la production publique ne signifie pas qu'elle n'existe pas localement : c'est précisément l'un des écarts majeurs établis.

## Tests à exécuter pour lever les limites

1. Parcours Playwright sur la vraie production avec deux utilisateurs, une communauté privée, un modérateur et un administrateur MFA.
2. Tests MySQL 8 réels, y compris migrations from-zero, rollback, FULLTEXT et transactions concurrentes.
3. DAST OWASP ZAP authentifié sur un slot de staging.
4. Test de charge k6/Artillery sur feed, recherche, médias, messagerie et paiements, avec budgets p95/p99.
5. Restauration complète MySQL + médias dans un environnement vierge.
6. Revue juridique marocaine des mentions, consentements, facturation, conservation, CNDP et CGU.
7. Homologation CMI et tests de réconciliation/remboursement avec le fournisseur.

---

# 3. Score global

| Domaine | Note | Appréciation |
|---|---:|---|
| Architecture | 6,5/10 | Bonne base, domaines riches, composants et responsabilités encore trop concentrés |
| Backend Laravel | 6,3/10 | Fonctionnel et testé, mais ACL, médias, MFA et paiements bloquants |
| Frontend React | 6,0/10 | Large couverture fonctionnelle, dette structurelle et défauts de rendu/accessibilité |
| Base de données | 6,5/10 | Index et contraintes corrects, rétention et invariants métier insuffisants |
| Azure | 3,8/10 | Santé nominale mais dérive de version, mono-instance, réseau/secrets et exploitation faibles |
| Performance | 5,2/10 | Bundle acceptable, mais N+1, collections non bornées, stockage local et aucune preuve de charge |
| Sécurité | 4,8/10 | Bons contrôles de base, plusieurs failles logiques critiques |
| UX | 6,0/10 | Parcours riches, incohérences, actions trompeuses et états destructifs mal protégés |
| UI | 5,5/10 | Direction visuelle présente, mais 658 classes Tailwind invalides et contrastes insuffisants |
| Qualité du code | 6,0/10 | Tests et conventions utiles, monolithes, duplication, code mort et style inégal |
| Business readiness | 3,5/10 | Proposition démontrable, crédibilité juridique/opérationnelle non atteinte |
| Documentation | 8,0/10 | Documentation exceptionnellement abondante, parfois en avance sur la réalité |
| Tests | 7,5/10 | Très bon backend, frontend et intégration réelle trop partiels |
| Maintenance | 5,5/10 | Automatisation existante, mais dérive, dépendance à une personne et complexité croissante |
| **Global pondéré** | **58/100** | **MVP avancé ; non prêt production** |

---

# 4. Architecture

## Architecture Laravel

✔ La séparation `Controllers` / `FormRequests` / `Resources` / `Policies` / `Services` est réellement utilisée.  
✔ Les domaines marketplace, paiement, réservation, modération, confidentialité et messagerie disposent de services dédiés.  
✔ Des transactions et verrous pessimistes existent sur plusieurs opérations sensibles.  
✔ Les routes et middlewares expriment des frontières d'accès compréhensibles.

⚠ Plusieurs contrôleurs conservent de la logique d'orchestration et de requête importante.  
⚠ Il n'existe pas de couche de visibilité unique : feed, recherche, policy et endpoints directs reconstruisent chacun des règles différentes. C'est la cause structurelle du défaut ACL.  
⚠ Les `Resources` exécutent parfois des requêtes (`exists`, follow state), ce qui couple sérialisation et accès aux données.  
⚠ Le modèle média n'est pas un agrégat propriétaire ; des chaînes de chemins circulent entre client, requêtes, modèles et suppression physique.  
⚠ Les machines d'état paiement/rendez-vous sont implicites et dispersées.

💡 Cible recommandée : des services applicatifs fins autour de quatre invariants centraux — `ContentVisibility`, `OwnedMediaAsset`, `PaymentStateMachine`, `ReservationLifecycle` — avec politiques et tests matriciels partagés.

## Architecture React

✔ Routing lazy et `Suspense` présents.  
✔ Client Axios centralisé, cookies HTTP plutôt que jetons stockés dans `localStorage`.  
✔ Contextes et hooks métier identifiables.  
✔ i18n FR/AR/EN et prise en charge RTL réelles.

❌ Plusieurs pages sont devenues des micro-applications monolithiques : `FeedPage.jsx` (1 235 lignes), `ProfilePage.jsx` (975), `Layout.jsx` (909), `MessagesPage.jsx` (906), `CommunitiesPage.jsx` (825), `ReservationsPage.jsx` (787).  
⚠ Des primitives similaires (`StateBox`, `HeroStatCard`, `Field`, `LinkButton`, normalisation de recherche) sont recopiées.  
⚠ Les hooks animaux/produits dupliquent chargement, filtres et mutations.  
⚠ Aucun `ErrorBoundary` applicatif global n'assure une dégradation maîtrisée.  
⚠ Les context values ne sont pas systématiquement mémorisées.

## Diagramme actuel simplifié

```text
[React SPA / Nginx App Service]
       | cookies + CORS, deux sous-domaines
       v
[Laravel API App Service] ---- [Redis Enterprise]
       |                       [App Insights / Log Analytics]
       v
[MySQL Flexible Server]
       |
       +-- réseau public activé / HA désactivée

[Médias sur filesystem App Service]
[Key Vault présent, mais App Settings non référencés au coffre]
```

## Architecture cible minimale

```text
Internet -> Front Door/WAF -> domaine YaZoo unique
                         +-> /       React CDN/static
                         +-> /api    Laravel App Service
                                      | managed identity
                  +-------------------+------------------+
                  v                   v                  v
          MySQL privé + HA       Redis privé       Blob privé/CDN
                  |                                      |
             PITR testé                         AV + URLs temporaires

CI verte -> image signée par SHA -> slot staging -> smoke/DAST -> swap
                                           |
                                  App Insights + alertes + runbooks
```

## Note architecture : **6,5/10**

---

# 5. Backend Laravel

## Contrôleurs, validation, API et routes

Les contrôleurs exploitent largement les FormRequests et Resources, ce qui est positif. Les requêtes SQL brutes visibles sont paramétrées et aucun chemin d'injection SQL direct n'a été identifié. Les 162 routes montrent une API riche et structurée.

Les défauts essentiels sont comportementaux :

- `SearchController.php` révèle des communautés privées et des posts dont la visibilité/modération n'est pas alignée avec le feed.
- `PostPolicy.php` autorise l'interaction sans réappliquer l'appartenance communautaire et la modération.
- Les FormRequests de profil, animaux, produits et vétérinaires acceptent des chemins de médias sous contrôle client.
- `User::$fillable` inclut `is_admin`, des états de modération et des champs MFA : les contrôleurs actuels filtrent souvent correctement, mais le rayon d'impact d'un futur `create($request->all())` est excessif.
- La création d'un administrateur n'exige pas toujours le middleware MFA.

## Models, services, repositories et design patterns

Les modèles expriment bien les relations principales. Les services marketplace, réservation et paiement apportent une valeur réelle. L'absence de repositories génériques n'est pas un défaut en soi : Eloquent joue déjà ce rôle. En revanche, les règles transversales ne sont pas suffisamment encapsulées.

💡 Ne pas ajouter une couche Repository artificielle. Introduire plutôt :

- un scope `Post::visibleTo($user)` et une policy unique ;
- un agrégat `MediaAsset` avec propriétaire et références ;
- une machine d'état de paiement testée ;
- des actions/commands explicites pour les opérations admin et financières.

## Events, listeners, jobs, queues et notifications

Le projet possède les éléments nécessaires, mais `after_commit=false` et `ShouldBroadcastNow` permettent d'émettre un message avant validation de la transaction SQL. Le lancement de queue et scheduler en arrière-plan depuis `startup.sh`, sans superviseur robuste, ne garantit pas leur survie.

❌ Un événement externe ne doit jamais annoncer une donnée qui peut encore être rollbackée.  
💡 Activer `after_commit`, utiliser les interfaces Laravel after-commit et isoler queue/scheduler en processus supervisés ou services dédiés.

## Authentification, autorisation, sessions, CSRF et rate limiting

✔ Sanctum et cookies évitent le stockage d'un bearer token dans le navigateur.  
✔ Des policies et throttles existent.  
✔ Les flux OTP, récupération, Google et MFA ont une base sérieuse.

❌ Le MFA admin est désactivable et fail-open par défaut.  
❌ Le couple `yazoo.azurewebsites.net` / `yazoo-api.azurewebsites.net`, avec `SESSION_DOMAIN=null`, est probablement incompatible avec la lecture par Axios du cookie XSRF déposé sur l'API. Les tests unitaires injectent cookie et header et ne reproduisent pas le navigateur.  
⚠ Le rate limit de connexion mêle IP et identité ; un botnet peut distribuer les tentatives contre un compte.  
⚠ Les jetons Sanctum utilisent l'ability `*` et n'offrent pas une gestion complète des appareils.  
⚠ `TRUSTED_PROXIES=*` agrandit la confiance au-delà du proxy Azure attendu.  
⚠ L'inscription exige 8 caractères quand le reset en exige 12 avec règles plus fortes.  
⚠ `BCRYPT_ROUNDS=8` dans l'exemple production est plus faible que l'exemple local à 12.

## Erreurs, logging et observabilité

La gestion globale journalise fichier, ligne et stack trace dans un fichier local. Le masquage du contexte frontend n'est pas suffisamment récursif pour toutes les variantes de secrets. Les variables App Insights/Sentry sont documentées, mais leur intégration de bout en bout n'est pas prouvée. Le health endpoint est utile mais divulgue publiquement les composants testés.

## Cache, storage et filesystem

Le filesystem local `/home/site` et les symlinks conviennent à une instance de démonstration, pas à plusieurs instances. Les disques configurés avec `throw=false` et `report=false` peuvent masquer des pertes. Le chemin vers Azure Blob n'est pas un adapter de production effectif dans le code observé.

## Transactions et concurrence

✔ Réservations, inventaire, paiements et certaines vérifications utilisent transactions et `lockForUpdate`.  
❌ Rendez-vous vétérinaires, avis et création de conversations présentent des fenêtres de course `check-then-create/update`.  
❌ Les callbacks paiement peuvent rétrograder un paiement finalisé vers `failed` ou `cancelled`.  
❌ Notifications et broadcasts peuvent partir avant commit.

## Uploads

Le runtime PHP observé fixe `upload_max_filesize=2M`, `post_max_size=8M` et `memory_limit=128M`, alors que Nginx accepte 64 Mo et Laravel valide jusqu'à 50 Mo. Les fichiers supérieurs à 2 Mo échouent avant d'atteindre la validation Laravel. C'est un bug certain, pas une optimisation facultative.

## Grille exhaustive des composants Laravel

| Composant demandé | Évaluation |
|---|---|
| Controllers | Couverture fonctionnelle large ; logique/queries encore concentrées dans recherche, feed, messaging, rendez-vous et admin |
| Models | Relations utiles ; champs système sensibles trop fillable, invariants insuffisamment encapsulés |
| Policies | Présentes mais la visibilité des posts n'est pas centralisée ; défaut critique |
| Middleware | CSRF cookie et MFA personnalisés intéressants ; MFA fail-open et proxies trop larges |
| Services | Bonne extraction marketplace/paiement/média ; machines d'état et ownership à renforcer |
| Repositories | Absence acceptable avec Eloquent ; ne pas ajouter de couche générique sans besoin |
| Events | Messagerie temps réel présente ; émission `ShouldBroadcastNow` avant commit |
| Listeners | Utiles pour découplage, mais leur fiabilité dépend de l'after-commit et des workers |
| Jobs | Base présente ; export confidentialité et tâches lourdes doivent davantage y migrer |
| Queues | Configurées Redis, mais `after_commit=false` et worker live non activé |
| Notifications | Fonctionnelles mais couverture faible et livraison live non prouvée |
| Validation | FormRequests largement utilisés ; règles mot de passe/temps/uploads incohérentes et chemins internes acceptés |
| API Resources | Formatage cohérent ; certaines Resources font de l'I/O et exposent données/chemins sensibles |
| Routes | 162 routes, lisibles ; matrice throttle/MFA/ACL à automatiser |
| Migrations | Domaine riche, index utiles ; conditionnelles, cascades et rollbacks à risque |
| Seeders | Seeders métier volumineux, notamment marketplace ; séparer démo, tests et production |
| Factories | Bon support des tests ; ajouter cas privés/modérés/concurrents et états paiement terminaux |
| Configuration | Nombreux garde-fous ; exemples production incomplets et live divergent |
| `.env.example` | Les secrets ne sont pas suivis ; exemple racine incomplet pour Reverb, exemple production sans MFA forcé |
| Gestion des erreurs | Handler central présent ; détails stack locaux et mapping conflits SQL à améliorer |
| Logging | Logs structurables mais locaux ; masquage imbriqué et centralisation non démontrés |
| Exceptions | Base correcte ; courses uniques peuvent encore sortir en 500 plutôt que 409/422 |
| Transactions SQL | Bonnes sur réservation/inventaire/paiement ; lacunes rendez-vous/conversation/after-commit |
| Optimisation | Eager loading présent par endroits ; N+1 et collections non bornées subsistent |
| Cache | Redis prévu ; stratégie d'invalidation/SLO et résilience live non démontrées |
| Storage/filesystem | Filesystem local non scalable ; erreurs masquées et ownership incomplet |
| Sanctum | Choix adapté SPA ; validation cross-domain réelle indispensable |
| Authentification | Riche ; MFA/password/device/rate-limit à durcir |
| Autorisation | Policies/admin présentes ; défauts IDOR critiques |
| Sessions | Redis prévu ; Redis public/sans persistance et cookies multi-domaines à éprouver |
| CSRF | Middleware explicite ; architecture live probablement incompatible, preuve navigateur absente |
| Rate limiting | Plusieurs limites utiles ; protection par identité et spam métier incomplète |

## Note backend : **6,3/10**

---

# 6. Frontend React

## Architecture et organisation

Le lazy loading des routes, la centralisation réseau, la prise en charge RTL et l'organisation pages/composants/hooks sont de bonnes bases. La maintenabilité se dégrade néanmoins sous l'effet des fichiers géants et de la duplication.

Les cinq extractions prioritaires sont :

1. `FeedComposer`, `FeedList`, `PostActions`, `CommentThread` hors de `FeedPage`.
2. `ProfileHeader`, `ProfileTabs`, `ProfileEditor`, relations et paramètres hors de `ProfilePage`.
3. navigation desktop/mobile, drawer, notifications et compte hors de `Layout`.
4. liste conversations, thread, composer et panneau info hors de `MessagesPage`.
5. un hook générique de collection marketplace avec stratégies animaux/produits.

## Défaut systémique Tailwind

Le code contient **658 occurrences réparties dans 73 fichiers** de classes d'opacité qui n'existent pas dans la configuration Tailwind 3 générée, notamment `bg-white/92`, `border-violet-300/14` et `text-violet-100/78`. L'inspection du CSS de production confirme l'absence de 70 tokens distincts. `text-stone-650` est également invalide.

Conséquence : le design affiché ne correspond pas au code intentionnel ; bordures, fonds et textes perdent silencieusement leurs styles. Ce défaut touche notamment `App.jsx`, `Layout.jsx`, `PublicPageShell.jsx`, `FeedPage.jsx` et `ProfilePage.jsx`.

💡 Convertir vers les valeurs arbitraires Tailwind (`bg-white/[0.92]`) ou vers un petit vocabulaire de tokens supportés, puis ajouter une vérification CI des classes inconnues.

## État, erreurs et réseau

- Absence d'ErrorBoundary global.
- Les hooks animaux et produits déclenchent des chargements redondants, sans `AbortController`, et peuvent afficher une réponse obsolète.
- Les suppressions animaux/produits partent sans confirmation.
- Les uploads n'annoncent ni taille client, ni progression, ni raison claire du rejet serveur.
- Plusieurs états de succès/erreur ne sont pas annoncés avec `aria-live`.

## Fonctionnalités trompeuses ou incomplètes

❌ `FeedbackPage.jsx` n'appelle aucune API mais affiche un succès et efface le formulaire. C'est une fausse confirmation utilisateur.  
❌ Dans le feed, « modifier » et « partager » redirigent tous deux vers `/profile`.  
⚠ La revue vétérinaire envoie toujours une note de 5 et ne valide pas correctement les dates côté client.  
⚠ Le mode propriétaire vétérinaire est piloté par `?owner=1`, ce qui est une logique UI fragile même si le backend doit rester l'autorité.  
⚠ Le service worker ne met en cache qu'un petit nombre d'assets ; l'application ne doit pas se présenter comme réellement offline.

## Performance frontend

Le build produit environ :

| Chunk | Taille | Gzip |
|---|---:|---:|
| CSS | 112,41 kB | 17,47 kB |
| entrée principale | 346,44 kB | 101,24 kB |
| React vendor | 230,63 kB | 73,95 kB |
| realtime | 72,49 kB | 20,54 kB |
| Layout | 58,13 kB | 13,80 kB |
| Feed | 44,41 kB | 11,43 kB |

Ce n'est pas catastrophique pour un SaaS riche, mais le module realtime est importé même si la fonctionnalité est inactive, les traductions vivent dans un fichier de 8 175 lignes et il n'existe ni virtualisation du feed ni cache de données applicatif.

## Dark mode, responsive et animations

Le dark mode et le RTL sont pris en compte, ainsi que `prefers-reduced-motion`. En revanche, une partie du dark mode repose sur des sélecteurs CSS par sous-chaîne et `!important`, fragiles à maintenir. Le drawer reste monté avec des éléments focusables lorsqu'il est fermé. Les animations ne compensent pas l'absence de focus trap dans les modales.

## Grille exhaustive React

| Composant demandé | Évaluation |
|---|---|
| Architecture | Pages lazy, API centralisée et domaines lisibles ; monolithes et duplication importants |
| Composants | Bibliothèque réelle mais primitives communes insuffisamment normalisées |
| Hooks | Hooks métier présents ; animaux/produits dupliqués, double fetch et pas d'annulation |
| Contexts | Approche raisonnable ; valeurs pas toujours mémorisées et rerenders à mesurer |
| Routing | Couverture large et lazy ; quelques destinations métier incorrectes et routes privées SEO incomplètes |
| Gestion d'état | État local/context simple ; absence de cache/revalidation pour collections réseau |
| Optimisation | Code splitting positif ; realtime/i18n/lists encore coûteux |
| Lazy loading | Routes lazy ; images et données longues à optimiser davantage |
| Responsive | Mobile/desktop explicitement testés ; revue visuelle manuelle encore requise |
| Animations | Direction moderne, réduction de mouvement respectée ; focus/sémantique prioritaires |
| Réutilisation | Moyenne ; primitives et hooks recopiés |
| Organisation | Compréhensible, mais gros fichiers nuisent aux frontières |
| Erreurs | États locaux présents ; pas d'ErrorBoundary global et messages pas toujours annoncés |
| UX | Fonctionnelle et riche ; actions trompeuses/destructives à corriger |
| Accessibilité | Fondations utiles ; contrastes, modales, drawer, clavier et statuts insuffisants |
| Dark mode | Présent ; tokens invalides et règles `!important` fragiles |

## Note frontend : **6,0/10**

---

# 7. Base de données

## Points positifs

✔ Relations principales lisibles et migrations nombreuses.  
✔ Contraintes uniques sur follows, likes, favoris, vues de stories, avis et identifiants/idempotence paiement.  
✔ Index métier et FULLTEXT déjà utilisés dans une partie de la marketplace.  
✔ Les migrations récentes ajoutent MFA, récupération, rendez-vous et index KPI.  
✔ Les requêtes SQL brutes identifiées sont paramétrées.

## Problèmes d'intégrité et de rétention

1. La suppression d'un produit ou animal peut supprimer les réservations associées ; les paiements sont alors détachés via `nullOnDelete`. Une transaction commerciale ne doit pas disparaître avec une annonce.
2. `moderation_actions.admin_id` est en cascade : supprimer un admin peut supprimer la piste d'audit.
3. Les réservations ne conservent pas toujours un snapshot immuable complet du titre, prix, description et conditions au moment de la transaction.
4. Il manque des contraintes DB pour note 1–5, montants/quantités non négatifs, ordre des dates et certains ensembles d'états.
5. Les migrations conditionnelles `Schema::hasColumn` peuvent conduire à des schémas divergents selon l'historique.
6. Un rollback de migration de statuts ne peut pas restaurer les valeurs métier initiales.
7. Le conteneur local actif au moment de l'audit ne listait pas cinq migrations source du 30 juillet, signe d'une image locale obsolète ; cela ne prouve pas l'état Azure.

## Normalisation et colonnes inutiles

La normalisation est globalement acceptable. L'audit ne permet pas de qualifier une table de « totalement inutilisée » sans télémétrie de production. En revanche, des champs calculés ou de statut sont parfois codés en dur dans les Resources : par exemple `averageRating=null` et `reviewsCount=0` pour les vétérinaires. Ce sont des fonctionnalités incomplètes, pas des colonnes à supprimer.

## Performance SQL

- `UserResource`, `PostResource`, `UserProfileResource` et `ConversationResource` peuvent provoquer des N+1.
- Le feed charge toutes les réactions et certaines réponses au lieu d'agrégats bornés.
- La recherche globale utilise `%terme%` sur plusieurs tables ; les B-tree n'aident pas ce motif.
- L'export RGPD charge des collections complètes sous `memory_limit=128M`.

💡 Ajouter `withExists`, agrégats, curseurs/pagination, budgets de requêtes, recherche FULLTEXT ou Azure AI Search, et jobs streamés.

## Note base de données : **6,5/10**

---

# 8. Azure, déploiement et DevOps

## État réel vérifié

| Élément | Production observée |
|---|---|
| App Services | `yazoo-api` et `yazoo`, Linux containers, publics |
| Plan | Basic B1, capacité 1, aucune zone, aucun autoscale |
| Image | `5eef/yazoo-api:latest` et `5eef/yazoo-frontend:latest` |
| Backend | Always On désactivé, HTTP/2 désactivé, health `/health/ready` |
| Frontend | Always On activé, HTTP/2 désactivé, health `/` seulement |
| MySQL | Flexible Server B1ms, public, HA off, géobackup off, rétention 7 jours |
| Redis | Managed Redis Balanced_B0, public, sans persistance ni cluster |
| Key Vault | présent, public, aucune identité managée ni référence runtime |
| Observabilité | Log Analytics, App Insights et 9 alertes présents ; instrumentation applicative non prouvée |
| Slots | aucun |
| Réseau privé | aucun VNet/private endpoint pour les composants principaux |

## Dérive de version

Le HEAD local `720f597` contient **21 commits et 335 fichiers de différence** avec `main`/`origin/main` (`88bcd0d`). Le dernier déploiement réussi correspond à `main`, le 23 juillet. Le frontend live indique un `Last-Modified` du 23 juillet ; `/version.json` renvoie l'HTML générique et `/health/live` n'expose aucun SHA. La production consomme `latest`.

Conclusion rigoureuse : la production est très probablement issue du commit du 23 juillet, mais **aucun marqueur ne permet de le prouver**. Des indices fonctionnels le confirment : le nouvel endpoint public marketplace retourne 404 et les améliorations SEO locales ne figurent pas dans l'HTML live.

Le workflow actuel de la branche corrige une partie de cette faiblesse par des images SHA et une vérification de version, mais il n'a pas encore atteint la production.

## CI/CD

### Bonnes pratiques

✔ Audits Composer/npm, tests, couverture, lint, typecheck, i18n, build, Playwright, conteneurs et secret scan sont prévus.  
✔ Les Actions de la branche sont épinglées par SHA.  
✔ Le nouveau déploiement sérialise la production, vérifie les health endpoints et prévoit un rollback coordonné.  
✔ L'alias `latest` n'est publié qu'après rollout dans le workflow amélioré.

### Bloquants actuels

❌ La CI de `720f597` est rouge.  
❌ Deux tests Axe sérieux échouent avec un contraste de 2,52:1 au lieu de 4,5:1.  
❌ SonarCloud signale 3,3 % de duplication sur nouveau code et un Security Rating D.  
❌ Gitleaks ne s'exécute pas : le token Actions manque de `pull-requests: read` et reçoit un 403.  
❌ `AZURE_CREDENTIALS`, requis par le nouveau workflow, est absent ; les anciens publish profiles existent encore.  
❌ Aucun reviewer obligatoire sur l'environnement production, aucun ruleset/protection de `main`, `can_admins_bypass=true`.

Références vérifiées : [CI échouée du commit audité](https://github.com/Seef590/YaZoo/actions/runs/30713017254) et [dernier déploiement `main` réussi](https://github.com/Seef590/YaZoo/actions/runs/30046846621).

## Sécurité et fiabilité Azure

- MySQL autorise le réseau public et la règle `0.0.0.0 → 0.0.0.0`, soit les services Azure au sens large.
- Aucun App Service n'a d'identité managée ; tous les secrets observés sont des App Settings directs, sans référence Key Vault.
- Key Vault n'a ni purge protection, ni private endpoint ; trois secrets actifs n'ont pas d'expiration.
- Les restrictions site et SCM sont ouvertes ; FTPS reste en mode `FtpsOnly` plutôt que désactivé.
- Le backend exécute les migrations au démarrage, mais aucun worker/scheduler n'est activé dans le live.
- La readiness peut être verte avec DB/Redis tandis que queue, scheduler, notifications et purges sont inactifs.
- Aucune restauration PITR Azure ni restauration média n'a été démontrée.
- Les médias sont encore sur le filesystem App Service.

## Performance Azure

Sur les dernières 24 heures observées, les 5xx étaient nuls et la santé à 100 %, mais le trafic était très faible. Le plan affichait environ 17,36 % de CPU moyen et **73,4 % de mémoire moyenne**, avec un maximum de 74,6 %. Cette mémoire à faible trafic laisse peu de marge sur l'unique B1.

Les cinq mesures HTTP légères observées donnaient approximativement :

- frontend TTFB : 181–370 ms, médiane proche de 199 ms ;
- backend readiness : 654–787 ms, médiane proche de 719 ms.

Ces chiffres ne valent pas test de charge. Ils décrivent seulement quelques requêtes chaudes.

## Configuration recommandée avant bêta publique

1. Domaine unique et reverse proxy `/api`.
2. Images immuables par SHA/digest, `APP_VERSION` exposée et déploiement OIDC.
3. Slot staging avec migration job unique puis smoke/DAST et swap.
4. Au minimum Premium v3, deux instances et zone redundancy selon disponibilité régionale.
5. MySQL privé, HA, sauvegarde adaptée et exercice PITR.
6. Identités managées et références Key Vault avec rotation.
7. Blob privé pour médias, versioning, lifecycle, antivirus et CDN.
8. Workers et scheduler supervisés avec heartbeats bloquants.
9. OpenTelemetry/Application Insights réellement instrumenté et tests de disponibilité.
10. Restrictions SCM, FTPS désactivé et politique WAF/Front Door selon exposition.

Les recommandations suivent les principes officiels de [sécurité App Service](https://learn.microsoft.com/en-us/azure/app-service/overview-security), de [bonnes pratiques de déploiement App Service](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices) et du [Well-Architected Framework pour App Service](https://learn.microsoft.com/en-us/azure/well-architected/service-guides/app-service-web-apps).

## Note Azure : **3,8/10**

---

# 9. Audit de sécurité OWASP

La grille est alignée sur l'[OWASP Top 10:2025](https://owasp.org/Top10/). L'absence d'advisory de dépendance ne compense pas les vulnérabilités logiques.

| Domaine | Niveau | Constat |
|---|---|---|
| Broken Access Control / IDOR | ❌ Critique | Recherche de communautés privées/posts modérés et interactions sans scope de visibilité complet |
| Cryptographic Failures | ⚠ Élevé | secrets directs dans App Settings, rounds bcrypt production faibles, Key Vault non utilisé ; TLS présent |
| Injection SQL | ✔ Faible observé | Eloquent et paramètres employés ; aucun vecteur direct identifié, à confirmer par DAST |
| Insecure Design | ❌ Critique | chemins média contrôlés par client, machine paiement non monotone, workflow admin fail-open |
| Security Misconfiguration | ❌ Critique | DB publique, secrets hors coffre, CI secret scan cassée, proxies larges, versions serveur exposées |
| Vulnerable Components | ✔ Faible actuel | audits npm/composer à zéro ; images non scannées et non fixées par digest |
| Auth Failures | ❌ Critique | MFA admin optionnel/fail-open, politique mot de passe incohérente, limite identité distribuable |
| Integrity Failures | ❌ Critique | images `latest`, pas de signature/SBOM, callbacks paiement rétrogradables, broadcasts avant commit |
| Logging/Monitoring Failures | ⚠ Élevé | infrastructure de monitoring présente, instrumentation/diagnostics/queue non prouvés |
| SSRF | ⚠ Non démontré | aucun vecteur direct confirmé ; tester les URLs/imports et drivers externes avec DAST |
| XSS | ⚠ Modéré | React échappe par défaut ; contenu riche, URLs, previews et retours API doivent être fuzzés |
| CSRF | ❌ Critique à valider | architecture inter-sous-domaines probablement incompatible avec le double-submit cookie Axios |
| Mass assignment | ⚠ Élevé | champs admin, MFA et modération fillable, même si les chemins actuels filtrent souvent |
| Upload de fichiers | ❌ Élevé | limites incohérentes, chemins bruts, ownership, stockage privé/AV/type réel insuffisants |
| Fuite d'information | ❌ Élevé | identifiants et chemins documents animaux, health détaillé, versions serveur, pages légales placeholder |
| Cookies/sessions | ⚠ Élevé | Sanctum correct conceptuellement ; comportement cross-domain non prouvé ; Redis sans persistance |
| Autorisation admin | ❌ Critique | création admin et confirmation paiement sans garantie MFA stricte |

## Scénarios d'exploitation prioritaires

### 9.1 Contenu privé ou modéré

Un utilisateur authentifié peut rechercher des métadonnées de communauté privée ou retrouver un post public rattaché à une communauté privée. S'il connaît l'ID, la policy d'interaction ne garantit pas l'appartenance. Le correctif doit être unique et appliqué à toute lecture et mutation, pas seulement au feed.

### 9.2 Suppression horizontale de médias

Un client peut réutiliser le chemin exposé d'un média d'un autre utilisateur dans sa propre ressource puis le remplacer. Les services de cleanup suppriment le chemin sans vérifier propriétaire ou références. C'est une forme de broken object authorization appliquée au stockage.

### 9.3 Compte administrateur persistant

Si MFA n'est pas explicitement imposé, un administrateur non enrôlé passe le middleware et peut atteindre des mutations sensibles, dont la création d'un autre administrateur. Un jeton compromis devient une persistance de privilège.

### 9.4 Paiement incohérent

Un callback ultérieur valide peut changer un paiement payé en échec/annulé tandis que la réservation reste payée. Sans réconciliation, idempotence fournisseur et états terminaux immuables, l'intégrité comptable n'est pas défendable.

### 9.5 Documents sensibles

Les ressources animales authentifiées exposent origine, identifiant et chemins de documents sanitaires/vaccination/ONSSA. L'API publique les omet, ce qui confirme leur nature sensible. Ces documents doivent rester privés et être servis par autorisation explicite ou URL courte signée.

## Headers HTTP

Le déploiement utilise déjà plusieurs en-têtes de sécurité, mais le CSP live est plus large que la version locale et autorise des connexions générales `https:`/`wss:`. Les regex `X-Robots-Tag` n'excluent pas toutes les routes privées. Il faut versionner un test de headers sur l'URL live et réduire chaque directive à des origines nécessaires.

## Secrets dans Git

Aucun `.env` réel n'est suivi dans les références Git accessibles, et aucun préfixe évident de PAT, clé privée ou clé de fournisseur majeur n'a été trouvé dans le texte atteignable. Les `.env`, dumps, snapshots et logs sont toutefois sous OneDrive : ils peuvent quitter le poste sans passer par Git. Le job Gitleaks officiel n'a pas tourné sur la PR ; il est donc incorrect d'affirmer une absence absolue de secret.

## Note sécurité : **4,8/10**

---

# 10. Performance

## Laravel et SQL

| Problème | Effet attendu | Correction |
|---|---|---|
| `exists()` depuis des Resources | N+1 par item | `withExists`, préchargement de contexte utilisateur |
| Toutes les réactions chargées | mémoire/latence sur posts viraux | agrégats SQL + fenêtre/pagination |
| Réponses de commentaires non bornées | réponse API volumineuse | limites explicites + endpoint de pagination |
| Recherche `%LIKE%` globale | scans et p95 croissant | FULLTEXT/Azure AI Search, recherche typée |
| Export RGPD synchrone | OOM/self-DoS à 128 Mo | job, cursor/stream, archive chiffrée |
| Sérialisation très contextuelle | requêtes invisibles | DTO/resources sans I/O et query budgets |

## React

✔ Code splitting par routes.  
⚠ Bundle initial total encore significatif et realtime importé sans nécessité.  
⚠ Fichier i18n de 8 175 lignes chargé comme un monolithe.  
⚠ Feed et longues listes sans virtualisation.  
⚠ Hooks marketplace sans annulation et avec double fetch.  
⚠ Images PNG de 241–283 kB sans `srcset`, formats modernes systématiques ou dimensionnement adaptatif.  
⚠ Pas de couche de cache/revalidation type TanStack Query.

## Azure

Le B1 mono-instance partage CPU/mémoire entre frontend et backend et atteint déjà environ 73 % de mémoire à très faible charge. La séparation régionale applications/données ajoute une latence réseau inutile sans constituer un plan de reprise. Le filesystem média bloque un scale-out fiable.

## Budgets recommandés

| Parcours | Budget cible avant lancement |
|---|---:|
| API simple p95 | < 300 ms hors réseau externe |
| Feed p95 | < 700 ms, < 25 requêtes SQL |
| Recherche p95 | < 500 ms à volume cible |
| LCP mobile p75 | < 2,5 s |
| INP p75 | < 200 ms |
| CLS p75 | < 0,1 |
| Taux 5xx | < 0,1 % |
| Jobs en attente p95 | < 60 s |

🚀 Ces budgets doivent être instrumentés puis testés avec des volumes réalistes ; aucune preuve actuelle ne permet de les déclarer atteints.

## Note performance : **5,2/10**

---

# 11. Qualité du code

## Lisibilité, conventions et Clean Code

Le code est généralement nommé par intention et la séparation Laravel est supérieure à celle d'un prototype standard. Les tests servent de documentation. La qualité chute dans les très gros composants React, certaines fonctions orchestration, les duplications et les règles métier dispersées.

### SOLID

- **S — Single Responsibility :** insuffisant dans les grandes pages React et plusieurs contrôleurs.
- **O — Open/Closed :** stratégies de paiement et services métier vont dans la bonne direction ; visibilité et médias sont câblés dans trop de lieux.
- **L — Liskov :** aucun défaut notable identifié.
- **I — Interface Segregation :** acceptable, mais les services média/paiement gagneraient à exposer des interfaces plus étroites.
- **D — Dependency Inversion :** Laravel container bien exploitable ; quelques intégrations restent concrètes et difficiles à substituer.

### DRY, KISS, YAGNI

- DRY est violé par les primitives UI, hooks marketplace et règles de visibilité.
- KISS est menacé par une i18n contenant des langues mortes et des couches documentaires nombreuses.
- YAGNI : certains documents décrivent une architecture cible non déployée comme si elle existait ; garder la cible, mais la séparer strictement de l'état live.

## Complexité et dette mesurable

- 14 fichiers PHP ne respectent pas Pint.
- SonarCloud signale 3,3 % de duplication sur nouveau code et Security Rating D.
- Les exports Sonar locaux datent du 1er juillet : 225 issues ouvertes et 20 hotspots à l'époque. Ils sont **obsolètes** et ne doivent pas être présentés comme l'état courant.
- `i18n.js` atteint 8 175 lignes.
- Au moins six pages/composants majeurs dépassent 700 lignes.
- Des composants/assets et langues restent inutilisés.

## Dette documentaire

La documentation est riche mais confond parfois : architecture cible, état local, état de `main` et état Azure. Une documentation volumineuse qui surestime le live augmente le risque de mauvaise décision.

## Note qualité du code : **6,0/10**

---

# 12. UX/UI — critique écran par écran

## Principes transversaux

La direction violet/rose, les cartes arrondies et la densité fonctionnelle donnent une identité. Le produit ne paraît toutefois pas encore « premium » pour trois raisons : tokens Tailwind silencieusement absents, hiérarchie trop chargée, et comportements peu fiables (succès factice, suppression immédiate, liens incorrects). Les meilleurs SaaS réduisent l'incertitude : chaque action a un résultat prévisible, une confirmation proportionnée et un état lisible.

Le jugement visuel doit être confirmé par une vraie revue navigateur ; l'audit n'en simule pas une.

## Écran de connexion

✔ Parcours identifiable et internationalisé.  
❌ Contraste sérieux Axe en arabe mobile.  
⚠ Le contexte de confiance — confidentialité, aide, statut du service — doit être plus clair sans surcharger.

```text
+--------------------------------------------------+
| YaZoo                         FR | AR | EN        |
|                                                  |
| Bienvenue sur YaZoo                              |
| Gérez élevage, services et communauté            |
| [ Email ou téléphone                         ]   |
| [ Mot de passe                           (œil)]   |
| [ Se connecter ]                                 |
| Mot de passe oublié ?                            |
| -------- ou --------                             |
| [ Continuer avec Google ]                        |
| Conditions · Confidentialité · Assistance        |
+--------------------------------------------------+
```

💡 Corriger le token de texte secondaire, afficher une erreur liée au champ et garantir 44×44 px pour les cibles tactiles.

## Inscription

❌ Contraste sérieux Axe en français desktop.  
❌ Aucun consentement explicite aux CGU/confidentialité/SMS alors que des clés de traduction existent.  
⚠ La politique mot de passe affichée doit être identique à l'inscription et au reset.

💡 Ajouter cases non précochées, liens datés/versionnés, consentements séparés pour nécessaire et marketing, résumé de confidentialité et statut d'envoi OTP.

## Accueil / pages publiques

⚠ Le shell public utilise plusieurs classes Tailwind invalides et une couleur `stone-650` inexistante.  
⚠ La valeur métier doit précéder les cartes décoratives.  
⚠ Les preuves de confiance (partenaires, chiffres vérifiables, statut juridique) sont insuffisantes.

💡 Structure : promesse en une phrase, deux CTA maximum, trois bénéfices prouvables, fonctionnement en trois étapes, sécurité/conformité, témoignages vérifiés, FAQ, identité légale complète.

## Feed

✔ Fonctionnalités riches : publication, médias, commentaires et réactions.  
❌ Les actions « modifier » et « partager » peuvent envoyer vers le profil.  
⚠ Densité élevée, pas de virtualisation, toutes les réactions/réponses peuvent gonfler.  
⚠ Les états privés/modérés ne sont pas exprimés de façon cohérente avec le backend.

```text
[Composer compact : texte | photo | publier]

[Avatar] Auteur · contexte · temps       [•••]
Contenu limité à 4–6 lignes [Voir plus]
[média adaptatif]
[réactions agrégées]     [commentaires] [partager]
   aperçu de 2 commentaires
   [écrire un commentaire...]
```

💡 Corriger les destinations, rendre les réactions agrégées, charger les threads à la demande et afficher clairement audience/modération.

## Profil

⚠ Page de 975 lignes, trop de responsabilités et densité importante.  
⚠ Les chemins médias sont un risque backend, les uploads n'expliquent pas les limites.  
⚠ Les modales de relations et suppression nécessitent une sémantique/focus complète.

💡 Séparer identité, activité, annonces et paramètres ; rendre l'édition progressive ; afficher visibilité de chaque champ et statut de vérification.

## Marketplace animaux/produits/services

✔ Domaine fonctionnel différenciant.  
❌ Suppression sans confirmation.  
⚠ Double fetch et résultats périmés possibles.  
⚠ Documents/identifiants animaux sensibles et statut documentaire ambigu.  
⚠ Pages dynamiques sans previews sociales spécifiques.

```text
[Recherche____________] [Catégorie v] [Région v] [Filtres]
Résultats (N)                         [Trier : pertinent v]

[Photo 4:3]  Titre              Badge vérifié
Prix / unité  Région            disponibilité
[Voir la fiche]                 ♡
```

💡 Confirmation destructive avec nom de l'objet, filtres persistants dans l'URL, skeletons stables, taille/prix/unité normalisés, badge vérifié seulement après preuve serveur.

## Fiche et réservation

⚠ Les snapshots transactionnels et politiques d'annulation doivent être visibles avant confirmation.  
⚠ Les erreurs doivent distinguer indisponibilité, conflit, authentification et paiement.  
💡 Afficher récapitulatif immuable, frais, conditions, données du fournisseur, étapes, preuve et assistance.

## Vétérinaires et rendez-vous

❌ La note envoyée est toujours 5 ; les agrégats vétérinaires sont codés en dur.  
⚠ Dates invalides et courses de statut possibles.  
⚠ `?owner=1` ne doit pas déterminer le rôle visible.

💡 Calendrier avec fuseau explicite, créneaux serveur, validation fin > début, notation 1–5 accessible, rôle issu de l'autorisation backend et états de rendez-vous non ambigus.

## Messagerie

✔ Architecture conversationnelle riche.  
⚠ Une interaction `div role=button` contient un lien, ce qui crée une navigation clavier ambiguë.  
⚠ Message broadcasté avant commit possible et realtime pas garanti dans le live.  
💡 Utiliser des éléments natifs, annoncer nouveaux messages, afficher état d'envoi/retry et garder un fallback polling borné.

## Administration

✔ Modération et vérification étendues.  
❌ MFA non garanti ; certaines pages n'ont pas de H1 visible.  
⚠ Les actions doivent exposer motif, avant/après, auteur et trace immuable.  
💡 Tableau de risque, filtres sauvegardés, double confirmation pour privilèges/paiements, MFA step-up et journal exportable.

## Feedback

❌ Le formulaire ment : il annonce un succès sans envoyer les données.  
💡 Le masquer jusqu'à implémentation ou créer endpoint, anti-spam, ticket ID, SLA indicatif et consentement.

## Pages légales

❌ En production, statut juridique, adresse et ICE sont vides ; l'adresse de confidentialité est `privacy@example.com`.  
❌ Le texte indique lui-même que les informations doivent être validées juridiquement.  
💡 Aucun partenaire institutionnel ne doit recevoir ce site comme « final » avant validation et publication des données exactes.

## Note UX : **6,0/10** — Note UI : **5,5/10**

---

# 13. Fonctionnalités détectées

| Fonctionnalité | Statut | Qualité | Commentaires | Priorité |
|---|---|---:|---|---|
| Auth email/téléphone/OTP/Google | Avancée | 7/10 | base sérieuse, mots de passe et test réel fournisseurs à aligner | Haute |
| Sessions Sanctum | À valider | 4/10 | risque CSRF cross-domain non reproduit par navigateur | Critique |
| MFA administrateur | Incomplète | 3/10 | fail-open et variable production absente | Critique |
| Profil utilisateur | Fonctionnelle risquée | 6/10 | UX riche, propriété/suppression média à corriger | Critique |
| Feed/posts | Fonctionnelle | 6/10 | ACL recherche/interactions, N+1 et mauvaises actions UI | Critique |
| Commentaires/réactions | Fonctionnelle | 6/10 | collections non bornées, policy insuffisante | Haute |
| Stories | Fonctionnelle partielle | 6/10 | upload >2 Mo cassé, tests réels médias requis | Haute |
| Follows/relations | Fonctionnelle | 6/10 | N+1 et throttling à améliorer | Moyenne |
| Communautés | Incomplète sécurité | 5/10 | fuite privée via recherche et modales à rendre accessibles | Critique |
| Marketplace animaux | Bêta | 5/10 | documents sensibles, ownership média, rétention | Critique |
| Marketplace produits | Bêta avancée | 6/10 | suppression historique et UX destructive | Haute |
| Services | Fonctionnelle | 7/10 | modèle cohérent, performance/SEO à consolider | Moyenne |
| Vétérinaires | Incomplète | 5/10 | agrégats codés en dur et rôle UI fragile | Haute |
| Rendez-vous vétérinaires | Bêta | 5/10 | courses et validation des créneaux | Haute |
| Réservations | Avancée | 7/10 | bon verrouillage principal, snapshots/rétention à corriger | Haute |
| Paiement CMI | Non production | 2/10 | préparatoire, refund absent, machine d'état dangereuse | Critique |
| Messagerie temps réel | Bêta | 5/10 | émission avant commit, workers/realtime live non prouvés | Haute |
| Notifications | Bêta | 5/10 | faible couverture et queue live absente | Haute |
| Recherche globale | Petite échelle | 4/10 | ACL et scans `%LIKE%` | Critique |
| Feedback | Factice | 1/10 | succès affiché sans requête | Critique |
| Export/suppression RGPD | Bêta | 5/10 | export synchrone, workflow et restore à tester | Haute |
| Vérification professionnelle | Avancée | 6/10 | stockage/accès/trace à durcir | Haute |
| Admin/modération | Avancée risquée | 5/10 | MFA fail-open et audit trail destructible | Critique |
| Internationalisation FR/AR/EN | Avancée | 8/10 | 1 958 clés alignées, langues mortes à retirer | Basse |
| Dark mode / RTL | Fonctionnelle | 7/10 | bonne intention, sélecteurs fragiles/classes invalides | Moyenne |
| SEO statique | Correct localement | 6/10 | prod ancienne, domaine Azure, dynamique/client-only | Haute |
| PWA/service worker | Minimale | 4/10 | cache très partiel, ne pas promettre offline | Basse |
| Health/monitoring | Partiel | 5/10 | DB/Redis verts, queue/scheduler et APM non prouvés | Haute |

---

# 14. Bugs potentiels et anomalies vérifiées

## Bugs confirmés ou fortement probables

1. Uploads >2 Mo rejetés avant Laravel malgré des validations jusqu'à 50 Mo.
2. Feedback affiche un faux succès sans appel API.
3. Classes Tailwind invalides : styles intentionnels absents du CSS.
4. Deux contrastes WCAG sérieux cassent l'E2E.
5. Recherche de contenus privés/modérés incohérente avec le feed.
6. Interaction possible sur post non visible si l'ID est connu.
7. Suppression possible du média d'un tiers via réutilisation de chemin.
8. Callback paiement capable de rétrograder un état terminal.
9. Notification/broadcast avant commit.
10. Course lors de création de conversation.
11. Course rendez-vous/avis pouvant aboutir à une 500.
12. Suppression d'annonce pouvant détruire l'historique de réservation.
13. Suppression d'admin pouvant détruire la piste d'audit.
14. `averageRating` et `reviewsCount` vétérinaire codés à des valeurs vides.
15. Actions feed « modifier » et « partager » vers `/profile`.
16. Review vétérinaire toujours notée 5.
17. Double fetch et réponses obsolètes marketplace.
18. Drawer fermé encore focusable.
19. `/version.json` live sert `index.html`.
20. Endpoint public marketplace local absent du live.

## Imports cassés, routes et code mort

Le lint, le typecheck, le build et le listing des routes réussissent : aucun import cassé généralisé ni route PHP impossible à charger n'a été confirmé. Cela ne supprime pas les routes UI mal ciblées décrites ci-dessus.

Le code mort le plus visible est constitué des langues ES/NL/PT/IT/RU encore présentes dans le gros fichier i18n alors que le sélecteur n'expose que FR/AR/EN, de composants/assets non référencés et d'un `backend/package.json` sans lockfile ni usage clair dans la CI.

## Migrations

Les migrations conditionnelles et rollbacks non réversibles sont des risques. Un cycle from-zero et upgrade depuis une copie anonymisée de production sous MySQL 8 doit être un gate de release.

---

# 15. Dépendances et supply chain

## Composer

`composer validate --strict` et `composer audit --locked` réussissent sans package abandonné ni advisory. Laravel 12.61.1 est utilisé. Des mises à jour mineures existent, notamment Sanctum 4.3.3, Socialite 5.29, Pail 1.2.7, Pint 1.30.3 et Sail 1.64. Laravel 13, Tinker 3 et PHPUnit 13 sont des migrations majeures à planifier, pas des correctifs urgents.

⚠ `minimum-stability=dev` est inutilement permissif.  
⚠ Les versions de base/extension du conteneur ne sont pas toutes épinglées.

## npm

`npm audit` complet et production retournent zéro vulnérabilité sur 375 dépendances. Versions centrales : React 19.2.7, React Router 8.3.0, Axios 1.18.1 et Vite 8.1.2. Des mises à jour mineures sont disponibles ; Tailwind 4, TypeScript 7, jsdom 29 et jest-dom 7 sont des migrations majeures à traiter séparément.

## Risques de supply chain

- aucun Dependabot ou Renovate ;
- aucun scan CVE des images ;
- aucun SBOM ;
- aucune signature Cosign/provenance ;
- bases `php`, `composer`, `node` et `nginx` non fixées par digest ;
- conteneur backend sans directive `USER`, démarrant donc avec privilèges root avant éventuelle descente ;
- versions PHP/Nginx exposées dans les en-têtes live ;
- Gitleaks prévu mais non exécuté sur la PR courante.

💡 Le meilleur ordre est : rétablir Gitleaks, ajouter Trivy/Grype, produire un SBOM CycloneDX/SPDX, fixer les digests, signer les images et vérifier la signature au déploiement.

## Note dépendances : **8/10** ; supply chain : **4,5/10**

---

# 16. Git et gouvernance

## Historique

✔ Worktree suivi propre avant création de ce rapport.  
✔ Commits souvent petits et nommés par intention.  
✔ Historique linéaire et dépôt compact, environ 18,2 Mio.  
✔ `.gitignore` et `.dockerignore` couvrent environnements, dépendances, clés, dumps, logs, backups et archives.

⚠ 108 commits, tous non signés, un seul contributeur : bus factor 1.  
⚠ Aucun tag ni release.  
⚠ Deux PR ouvertes se chevauchent ; la seconde contient la première et dix commits additionnels.  
⚠ Aucune protection de `main` disponible dans l'état actuel du plan GitHub ; aucun reviewer de production obligatoire.  
⚠ Un PPTX de près de 6,9 Mio est suivi directement.  
⚠ L'audit principal du 19 juillet est ignoré par `.gitignore` et n'est donc pas gouverné comme preuve.

## Fichiers oubliés et artefacts

Trois archives d'export INDH d'environ 10,11 Mio chacune contiennent un contenu très proche mais ont des hashes différents, probablement en raison de métadonnées d'archive. Plusieurs snapshots et backups MySQL existent localement et sont ignorés. Le plus gros log ignoré, `backend/storage/logs/laravel.log`, atteint environ 4,12 Mio.

Ces artefacts ne doivent pas vivre dans OneDrive avec les `.env` et dumps sensibles. Utiliser un stockage chiffré avec rétention et classification.

## Gouvernance recommandée

1. Une PR unique et lisible, revue par au moins une seconde personne.
2. Ruleset `main` : CI obligatoire, reviews, conversations résolues, pas de force-push.
3. Environnement production avec reviewer sans bypass admin.
4. Releases et tags signés ; changelog généré.
5. CODEOWNERS pour backend, frontend, infrastructure, sécurité et paiements.
6. ADR pour décisions majeures ; registre des risques ; preuve d'approbation légale/CMI.

## Note Git/gouvernance : **5/10**

---

# 17. SEO

## État local

✔ Meta title/description, canonical, OpenGraph, Twitter cards et JSON-LD sont présents dans le code local.  
✔ Robots, sitemap et génération d'environ 15 pages statiques existent.  
✔ Le build et le contrôle légal/SEO passent localement.

## Lacunes

1. `SITE_URL` est ancré sur le sous-domaine Azure au lieu d'un domaine de marque.
2. Les fiches dynamiques restent essentiellement client-side : les crawlers sociaux peuvent recevoir une page générique.
3. Nginx sert certaines routes détail via la page catégorie ; les canonical/OG dynamiques ne sont pas garantis côté serveur.
4. Les regex `X-Robots-Tag` oublient des routes privées comme forgot/reset et rendez-vous vétérinaires.
5. Pas de `hreflang` complet entre FR/AR/EN.
6. Sitemap non dynamique pour les annonces et sans stratégie `lastmod` robuste.
7. Image sociale 512×512 plutôt qu'un visuel 1200×630 optimisé.
8. La production live sert encore l'ancien HTML et n'intègre pas les améliorations locales.

## Recommandation

Mettre un domaine propre, rendre côté serveur ou pré-rendre les pages publiques indexables, générer metas et données structurées par fiche, produire sitemap dynamique et `hreflang`, exclure explicitement toutes les routes privées et surveiller Search Console/Bing Webmaster.

## Note SEO : **6/10 local**, **4/10 live**

---

# 18. Accessibilité WCAG

L'objectif recommandé est WCAG 2.2 niveau AA, conformément à la [recommandation W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Points positifs

✔ Skip links présents.  
✔ Styles `focus-visible` et prise en compte de `prefers-reduced-motion`.  
✔ RTL réel.  
✔ Tests Axe automatisés sur huit combinaisons de pages/langues/largeurs.  
✔ Usage fréquent d'éléments natifs et de labels.

## Non-conformités et risques

| Critère | Constat | Niveau |
|---|---|---|
| 1.4.3 Contraste | deux échecs Axe, ratio 2,52:1 | Sérieux |
| 2.1.1 Clavier | drawer fermé focusable, interactions div/lien imbriquées | Élevé |
| 2.4.3 Ordre du focus | modales sans trap/restauration complète | Élevé |
| 2.4.6 Titres et labels | H1 visible absent sur plusieurs pages | Moyen |
| 2.4.7 Focus visible | base présente, à vérifier sur tous états dark/RTL | Moyen |
| 3.3.1 Identification erreur | erreurs et statuts pas toujours liés/annoncés | Élevé |
| 3.3.2 Labels/instructions | contraintes upload/date/consentement insuffisantes | Élevé |
| 4.1.2 Nom/rôle/valeur | modales et faux boutons non homogènes | Élevé |
| 4.1.3 Messages de statut | `aria-live` absent sur plusieurs feedbacks | Moyen |

Les modales de suppression de compte, report, gestion admin, suppression communauté et relations profil n'offrent pas toutes `role=dialog`, `aria-modal`, titre référencé, Escape, focus initial, trap et restitution du focus.

Les tests Axe actuels n'épuisent pas WCAG : un seul scénario clavier Tab et huit combinaisons ne couvrent ni tous les écrans, ni zoom 200/400 %, lecteur d'écran, orientation, reflow 320 CSS px ou erreurs de formulaire.

## Plan de conformité

1. Corriger les deux contrastes et ajouter les tokens de couleur à un design system testable.
2. Créer une primitive `AccessibleDialog` unique.
3. Ajouter `inert`/unmount au drawer, focus trap et retour focus.
4. Remplacer les faux boutons par `button`/`a` natifs.
5. Ajouter H1, régions, `aria-live` et messages liés aux champs.
6. Tester clavier complet, NVDA/VoiceOver, zoom 200/400 %, reflow et RTL.
7. Élargir Playwright/Axe à toutes les routes critiques, dark/light, FR/AR/EN et mobile/desktop.

## Note accessibilité : **5,2/10**

---

# 19. Business readiness

## Fondation

Une Fondation jugera autant la confiance et l'impact que la quantité de fonctionnalités. Le produit peut démontrer une vision pertinente pour les acteurs agricoles/animaliers marocains. Mais une adresse légale vide, un ICE vide, `privacy@example.com`, une mention « à faire valider juridiquement » et un formulaire feedback factice détruisent rapidement la confiance institutionnelle.

**Verdict : non prêt pour une présentation officielle du site live.** Une démonstration privée cadrée comme MVP est possible après correction immédiate des éléments de crédibilité et avec une slide transparente sur risques/roadmap.

## Investisseurs

Points favorables : profondeur fonctionnelle, effort de tests, documentation, domaine métier différenciant, capacité d'exécution visible. Points défavorables : bus factor 1, aucune release, CI rouge, sécurité logique, paiement non homologué, architecture Azure fragile et absence de métriques utilisateurs/business prouvées.

**Verdict : présentable comme prototype avancé recherchant financement pour sécurisation et pilote ; non présentable comme produit scalable prêt au revenu.**

## Fournisseurs marocains

Ils attendront identité contractuelle, conditions de paiement, factures, support, protection documentaire, processus de litige et stabilité. Les suppressions historiques, états paiement et documents animaux sensibles sont incompatibles avec cette attente.

**Verdict : recruter au plus quelques partenaires pilotes sous contrat pilote explicite, paiement réel désactivé ou traité manuellement avec contrôles.**

## Grandes entreprises et partenaires

Une due diligence demandera DPA, registre de traitements, SLA, RTO/RPO, pentest, sauvegardes/restores, IAM, revue fournisseur, SBOM, gestion d'incident et architecture réseau. Les preuves ne sont pas disponibles.

## Crédibilité et maturité

| Critère | État |
|---|---|
| Vision produit | ✔ Crédible |
| Richesse fonctionnelle | ✔ Forte |
| Qualité perçue visuelle | ⚠ Moyenne/inégale |
| Confiance juridique | ❌ Insuffisante |
| Sécurité démontrable | ❌ Insuffisante |
| Exploitation/SLA | ❌ Insuffisante |
| Scalabilité prouvée | ❌ Absente |
| Gouvernance équipe | ❌ Bus factor 1 |
| Transparence documentaire | ⚠ Bonne quantité, réalité parfois surestimée |

## Note business readiness : **3,5/10**

---

# 20. Production readiness détaillée

## Démo

☑ **Oui, après une journée de préparation**, si : données fictives, scénario fixe, feedback masqué/corrigé, contrastes corrigés, pages légales non présentées comme finales, aucune promesse CMI/haute disponibilité.

## Bêta

☐ **Non aujourd'hui.** Requis : ACL centrale, propriété média, MFA strict, CSRF navigateur, uploads, CI verte, version SHA en staging, données légales minimales, sauvegarde/restauration et support incident.

## Production

☐ **Non.** Les risques sécurité/integrité/infra sont bloquants.

## Fondation

☐ **Non en l'état live.** Le décalage entre discours, pages légales et réalité technique est trop visible. Une présentation privée de la vision/MVP reste possible avec transparence.

## Investisseurs

⚠ **Oui comme MVP avancé, non comme produit prêt au scale.** Il faut présenter le score, le registre des risques, le budget et la roadmap, pas masquer les lacunes.

## Clients réels

☐ **Non**, sauf pilote fermé, données non critiques, engagements réduits et procédures manuelles documentées.

## Forte montée en charge

☐ **Non.** Mono-instance B1, stockage local, mémoire élevée, DB sans HA, recherche/N+1 et absence de load test.

---

# 21. Comparaison avec les audits antérieurs

## Points d'accord

Les anciens audits avaient raison sur : MVP riche mais non production, images `latest`, migrations au démarrage, absence de HA/restauration Azure prouvée, paiement CMI incomplet, identité légale, persistance média, instrumentation applicative et dette de conformité.

Plusieurs recommandations ont été réellement implémentées dans la branche actuelle : réaction commentaires, état OAuth, workflows confidentialité/suppression, masquage callback paiement, fondation MFA, production preflight, workflow image SHA et garde-fous de release. C'est un progrès important du code local.

## Points de désaccord

1. `docs/RAPPORT_CORRECTIONS_GRATUITES_YAZOO_2026.md` qualifie le local de prêt et mentionne huit tests Axe sans violation sérieuse. La CI courante prouve maintenant deux échecs sérieux ; « prêt » est trop optimiste compte tenu des défauts ACL, média, MFA, CSRF, upload, Tailwind et feedback.
2. `docs/PRODUCTION_CONNECTED_SMOKE_TEST_REPORT.md` conclut à l'absence de bug critique de production. Il vérifiait une version plus ancienne et des HTTP 200, pas le commit actuel, les parcours navigateur, l'intégrité paiement, la traçabilité ou la restauration.
3. Les plans Azure présentent parfois MySQL privé, workers, CDN/object storage et scaling comme architecture canonique ; le live n'implémente pas ces éléments.
4. Certains rapports assimilaient redémarrage de `latest` et HTTP 200 à une validation de déploiement. Cela prouve disponibilité, pas identité du code ni rollback.

## Éléments oubliés

- accès privés/modérés via recherche/interactions ;
- suppression de médias d'un tiers ;
- MFA admin fail-open et création admin ;
- problème CSRF inter-sous-domaines ;
- PHP limité à 2 Mo ;
- 658 classes Tailwind invalides ;
- feedback factice ;
- queue/scheduler absents du live ;
- secret OIDC Azure manquant et Gitleaks cassé ;
- Key Vault non utilisé ;
- mémoire B1 à ~73 % ;
- historique financier/audit destructible ;
- aucune signature/SBOM/scan image ;
- aucun marqueur de version live.

## Exports Sonar

`sonar-issues.json` et exports associés datent du 1er juillet et le serveur local Sonar n'était pas disponible. Le document `SONAR_SECURITY_REVIEW.md` a raison de les qualifier d'obsolètes. Ils servent de tendance historique, pas de preuve courante.

---

# 22. Roadmap priorisée

## Priorité CRITIQUE — P0, avant tout pilote

- [ ] Corriger visibilité/interaction des communautés et posts privés/modérés.
- [ ] Remplacer les chemins média client par des assets possédés et référencés.
- [ ] Imposer MFA admin et step-up sur privilèges/paiements.
- [ ] Valider/corriger le CSRF sous un domaine unique avec vrai navigateur.
- [ ] Corriger la machine d'état paiement et maintenir CMI désactivé.
- [ ] Aligner limites PHP/Nginx/Laravel.
- [ ] Corriger feedback factice et les deux contrastes Axe.
- [ ] Corriger les 658 classes Tailwind invalides.
- [ ] Rendre la CI verte, exécuter réellement Gitleaks et traiter Sonar.
- [ ] Finaliser identité légale, confidentialité, CGU et consentements.
- [ ] Déployer le commit qualifié par SHA/digest avec version vérifiable.
- [ ] Préserver réservations, paiements et audit trail.

## Priorité HAUTE — P1, avant production

- [ ] MySQL privé, HA/sauvegardes, exercice PITR.
- [ ] Identités managées et Key Vault references.
- [ ] Blob privé, antivirus, versioning et backup média.
- [ ] Queue/scheduler supervisés, after-commit et heartbeats.
- [ ] Corriger courses conversations/rendez-vous/avis.
- [ ] Supprimer N+1 et borner réactions/réponses/exports.
- [ ] Primitive modale accessible, focus, H1 et `aria-live`.
- [ ] Slot staging, migration job et smoke/DAST avant swap.
- [ ] OpenTelemetry/App Insights et diagnostics durables.
- [ ] Tests MySQL, concurrence, browser, restauration et charge.

## Priorité MOYENNE — P2

- [ ] Refactorer les six composants React géants.
- [ ] Extraire primitives UI et hook marketplace générique.
- [ ] Recherche FULLTEXT/Azure AI Search.
- [ ] SSR/prérendu des pages publiques dynamiques, sitemap/hreflang.
- [ ] Cache/revalidation frontend et virtualisation feed.
- [ ] Images AVIF/WebP, `srcset`, CDN et lazy loading contrôlé.
- [ ] Supply chain : Dependabot, Trivy, SBOM, Cosign.
- [ ] Désactiver FTPS, restreindre SCM, réduire CSP/proxies.
- [ ] Ajouter contraintes CHECK et snapshots transactionnels.
- [ ] Harmoniser politique mot de passe et tokens appareils.

## Priorité BASSE — P3

- [ ] Retirer langues, composants et assets morts.
- [ ] Charger Poppins correctement ou utiliser une police système.
- [ ] Décider honnêtement si la PWA/offline est un objectif.
- [ ] Signer commits et releases.
- [ ] Sortir PPTX/archives des sources vers Releases/stockage documentaire.
- [ ] Mettre à jour les dépendances mineures.
- [ ] Uniformiser Pint et conventions frontend.
- [ ] Consolider documentation cible/live/preuves.

---

# 23. Plan d'amélioration précis

Les estimations sont des jours-ingénieur, hors délais fournisseurs, validation juridique et observation en production. Elles supposent un développeur senior connaissant le dépôt et incluent tests/revue.

| # | Problème / impact | Gravité | Fichiers principaux | Modification exacte et pratique | Estimation | Bénéfice attendu |
|---:|---|---|---|---|---:|---|
| 1 | Contenus privés/modérés accessibles indirectement ; confidentialité/IDOR | Critique | `SearchController.php`, `PostController.php`, `PostPolicy.php`, `routes/api.php` | Créer `visibleTo(User)` et `interactableBy(User)`, les appliquer à toute query et policy ; matrice de tests négatifs | 2–4 j | Une règle unique, fermeture de l'ACL |
| 2 | Chemins média contrôlés par client ; suppression de fichier tiers | Critique | Requests profil/marketplace, `MediaStorage.php`, services animaux/produits, Resources | Table `media_assets` avec UUID, owner, disk, path, état ; accepter seulement UUID possédé ; suppression si référence nulle | 4–7 j | Propriété, audit et lifecycle sûrs |
| 3 | MFA admin fail-open ; persistance de privilège | Critique | `config/auth.php`, `EnsureAdminMfaVerified.php`, `StoreUserRequest.php`, `PaymentController.php`, routes admin | Production fail-closed, enrollment obligatoire, step-up MFA, retirer `is_admin` du fillable/Request public, test automatique de toutes routes sensibles | 2–4 j | Réduit compromission admin |
| 4 | CSRF inter-sous-domaines probablement cassé | Critique | `frontend/src/api/client.js`, `.env.production.example`, Sanctum/CORS/session, proxy Nginx | Domaine propriétaire unique ; proxy `/api` et `/sanctum`; supprimer localhost prod ; E2E navigateur login + mutation | 2–5 j | Sessions fiables et surface CORS réduite |
| 5 | Paiement non monotone/non homologué | Critique | `PaymentService.php`, `CmiGateway.php`, `PaymentController.php`, migrations/tests paiement | Enum/transitions explicites, états terminaux immuables, idempotence provider, reconciliation/refund, locks et audit ; feature flag off jusqu'à homologation | 5–10 j + CMI | Intégrité financière défendable |
| 6 | Upload PHP 2 Mo vs validation 50 Mo | Haute | Dockerfile/php.ini, `nginx.conf`, FormRequests | Versionner `php.ini`, choisir une limite produit cohérente, valider MIME réel/dimensions, tests 1,9/2,1/limite+ε | 0,5–1 j | Supprime échecs utilisateur certains |
| 7 | Classes Tailwind invalides ; UI différente de l'intention | Critique présentation | 73 fichiers frontend, `tailwind.config.js`, `index.css` | Codemod `/92` → `/[0.92]` ou tokens supportés ; retirer `stone-650`; test CI des sélecteurs/classes | 1–2 j | Rendu stable, design cohérent |
| 8 | Feedback mensonger | Critique réputation | `FeedbackPage.jsx`, nouvelle Request/route/controller, tests | Masquer ou implémenter endpoint, stockage/ticket, throttle/CAPTCHA progressif, e-mail/queue, ID de confirmation | 0,5–2 j | Rétablit confiance et boucle produit |
| 9 | CI rouge et secret scan absent | Critique livraison | `.github/workflows/ci.yml`, styles login/register, exclusions Sonar justifiées | Ajouter `pull-requests: read`, corriger contrastes/duplication/security findings, exiger tous les jobs | 1–3 j | Gate crédible et fusion qualifiée |
| 10 | Production `latest` et 21 commits de dérive | Critique | `.github/workflows/deploy.yml`, App Settings, health/version | OIDC, image SHA+digest, `APP_VERSION/GIT_SHA`, slot staging, smoke, swap, rollback digest ; révoquer publish profiles | 2–5 j | Traçabilité et rollback réels |
| 11 | Identité légale et consentements incomplets | Critique business | config légal, pages legal/privacy/terms/register, contenu live | Validation juriste Maroc, identité/ICE/adresse/contact réels, versions horodatées, consent log, politique cookies/SMS | 2–5 j + juriste | Présentabilité institutionnelle |
| 12 | MySQL public et sans HA/restore prouvé | Haute | `deploy/azure-setup.ps1`, `.azure`, Azure live, runbooks | VNet/private DNS/private access, fermer firewall large, HA, rétention/RPO, géobackup selon besoin, PITR drill | 2–5 j | Réduit intrusion et perte de données |
| 13 | Secrets hors Key Vault | Haute | scripts Azure, App Settings, workflow | Managed identity, RBAC, KV references, expiration/rotation, purge protection, private endpoint selon cible | 2–3 j | Suppression de secrets statiques applicatifs |
| 14 | Médias locaux sans backup/AV/scale-out | Haute | `filesystems.php`, `startup.sh`, `MediaStorage.php`, Azure | Adapter Blob privé, SAS/URLs temporaires, scan AV, metadata ownership, versioning/lifecycle, restore test, CDN public dérivé | 4–8 j | Scale-out et confidentialité |
| 15 | Queue/scheduler absents et émissions avant commit | Haute | `queue.php`, `startup.sh`, events/controllers, Azure | `after_commit=true`, interfaces after-commit, workers dédiés/supervisés, scheduler unique, failed jobs et heartbeat readiness | 2–5 j | Cohérence et jobs fiables |
| 16 | Historique commercial/audit destructible | Critique conformité | services marketplace/admin, migrations FK, modèles réservation/paiement/modération | Soft-delete listings, interdire cascade financière, `nullOnDelete` + actor snapshot pour audit, snapshots immuables transactionnels | 3–6 j | Preuves commerciales et conformité |
| 17 | N+1, collections/export non bornés | Haute | Resources, `PostController.php`, `SearchController.php`, `PrivacyController.php` | `withExists`, agrégats, pagination/cursors, job export streamé, query-count tests, index/recherche dédiée | 3–7 j | p95 stable et moins de mémoire |
| 18 | Courses conversation/rendez-vous/avis | Haute | `ConversationController.php`, `VeterinarianAppointmentController.php` | Transactions, tuple canonique `firstOrCreate`, `lockForUpdate`, capture unique violation en 409, tests parallèles | 1–3 j | Élimine 500 intermittentes |
| 19 | Accessibilité modales/drawer/contrastes | Haute | `Layout.jsx`, modales compte/report/admin/community/profile, login/register | `AccessibleDialog`, focus trap/Escape/restore, `inert`, éléments natifs, H1/aria-live, palette AA et suite Axe élargie | 3–6 j | WCAG AA et UX clavier fiable |
| 20 | Absence de preuve production à l'échelle | Haute | CI, tests, runbooks, Azure Monitor | MySQL test, E2E live/staging, DAST, k6, chaos léger, restore drill, SLO/alertes, dossier de preuves signé | 5–10 j | Décision de lancement factuelle |

## Exemples de correction

### Scope central de visibilité Laravel

```php
// Post.php
public function scopeVisibleTo(Builder $query, User $viewer): Builder
{
    return $query
        ->where('moderation_status', 'approved')
        ->where(function (Builder $query) use ($viewer) {
            $query->whereNull('community_id')
                ->orWhereHas('community', function (Builder $community) use ($viewer) {
                    $community->where('visibility', 'public')
                        ->orWhereHas('members', fn (Builder $members) =>
                            $members->whereKey($viewer->getKey())
                        );
                });
        });
}
```

La policy doit réutiliser la même règle, idéalement via un service de domaine, et les tests doivent couvrir utilisateur anonyme/authentifié, membre/non-membre, propriétaire, modérateur et admin.

### État paiement terminal

```php
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Pending => in_array($next, [self::Paid, self::Failed, self::Cancelled], true),
            self::Paid => $next === self::Refunded,
            self::Failed, self::Cancelled, self::Refunded => false,
        };
    }
}
```

La transition doit être exécutée sous verrou, avec identifiant événement fournisseur unique et journal append-only.

### Classe Tailwind compatible

```jsx
// Invalide avec les tokens actuels
<section className="bg-white/92 border-violet-300/14" />

// Valeur arbitraire explicite
<section className="bg-white/[0.92] border-violet-300/[0.14]" />
```

Une meilleure cible est de définir des tokens sémantiques (`surface-elevated`, `border-subtle`) dans le design system afin d'éviter des centaines de fractions différentes.

### Dispatch après commit

```php
DB::transaction(function () use ($conversation, $payload) {
    $message = $conversation->messages()->create($payload);

    ConversationMessageSent::dispatch($message)->afterCommit();
});
```

Le worker doit être un processus supervisé et sa heartbeat doit faire partie d'une readiness interne ou d'une alerte, sans exposer de détail sensible au public.

---

# 24. Les 20 problèmes les plus critiques

1. **Broken Access Control** sur contenus privés/modérés entre recherche, policy et endpoints directs.
2. **Suppression horizontale de médias** par chemins client sans ownership.
3. **MFA administrateur fail-open**, y compris opérations sensibles et création admin.
4. **Flux CSRF cross-domain non validé et probablement incompatible** avec les deux sous-domaines Azure.
5. **Paiement CMI non prêt**, transitions non monotones et remboursement absent.
6. **Production non traçable** sur images `latest`, aucun SHA/version fiable.
7. **21 commits/335 fichiers de dérive** entre source locale et production.
8. **CI actuelle rouge** et Gitleaks non exécuté faute de permission.
9. **Identité légale live incomplète** : statut/adresse/ICE vides et e-mail placeholder.
10. **Feedback factice** annonçant un succès sans envoi.
11. **MySQL public**, règle large Azure, HA et géobackup désactivés.
12. **Secrets directs dans App Settings**, Key Vault non utilisé et aucune identité managée.
13. **Limite PHP 2 Mo**, incompatible avec les promesses d'upload jusqu'à 50 Mo.
14. **658 classes Tailwind invalides**, rendant le design non déterministe par rapport au code.
15. **Historique financier et piste d'audit destructibles** par cascades/suppressions.
16. **Médias/documents sensibles** exposés ou stockés sans architecture privée, AV et backup prouvé.
17. **Queue/scheduler absents du live** et événements diffusés avant commit.
18. **B1 mono-instance**, mémoire ~73 %, aucune zone, slot, autoscale ou failover.
19. **N+1, collections et export non bornés**, sans test de charge.
20. **Accessibilité insuffisante** : contrastes CI, modales/drawer/focus et consentements.

---

# 25. Les 20 améliorations au meilleur ROI

| Rang | Amélioration | Pourquoi le ROI est élevé |
|---:|---|---|
| 1 | Scope/policy de visibilité central | ferme une faille critique et réduit la duplication |
| 2 | Asset média avec owner | élimine une classe entière d'IDOR/suppression |
| 3 | Corriger les trois gates CI | rend de nouveau possible une livraison qualifiée |
| 4 | Déployer par SHA avec OIDC et version | forte amélioration de traçabilité en peu de jours |
| 5 | Finaliser identité légale et masquer/corriger feedback | gain immédiat de crédibilité Fondation/partenaires |
| 6 | Imposer MFA admin fail-closed | forte réduction du risque de compromission |
| 7 | Domaine unique `/api` + E2E CSRF | fiabilise auth et simplifie CORS/cookies |
| 8 | Versionner un `php.ini` cohérent | corrige un bug utilisateur certain en moins d'un jour |
| 9 | Codemod Tailwind | corrige des centaines de défauts visuels en 1–2 jours |
| 10 | Primitive modale + correction contrastes | améliore WCAG sur de nombreux écrans d'un coup |
| 11 | Machine paiement explicite, CMI off | évite incidents financiers et fausses promesses |
| 12 | Préserver historique et snapshots | réduit risque juridique/comptable |
| 13 | `after_commit` + workers supervisés | fiabilise messages, notifications et tâches |
| 14 | Corriger N+1 et borner le feed/export | gain de performance avant achat massif de capacité |
| 15 | MySQL privé + exercice PITR | réduit deux risques majeurs : intrusion et perte |
| 16 | Managed identity + Key Vault refs | rotation et moindre exposition des secrets |
| 17 | Blob privé + backup/AV | prépare scale-out et protège les documents |
| 18 | Slot staging + smoke/DAST | réduit le risque de chaque déploiement |
| 19 | Tests MySQL/concurrence/browser | couvre précisément les angles morts actuels |
| 20 | OpenTelemetry + SLO/alertes | transforme les incidents en signaux actionnables |

---

# 26. Checklist finale « Prêt pour la production »

## Produit et juridique

- [ ] Entité, statut, adresse, ICE/RC et contacts réels publiés.
- [ ] CGU, confidentialité, cookies, consentements SMS/marketing validés par juriste marocain.
- [ ] Processus support, litige, remboursement et modération documentés.
- [ ] Feedback réellement transmis et traçable.
- [ ] CMI homologué ou totalement désactivé et non annoncé.

## Sécurité

- [ ] Toutes les matrices ACL/IDOR passent, y compris contenus privés/modérés.
- [ ] Médias possédés, privés, scannés et servis par autorisation/URL temporaire.
- [ ] MFA admin obligatoire et step-up sur actions sensibles.
- [ ] CSRF/session/CORS validés dans un navigateur sur les vrais domaines.
- [ ] Aucun champ système sensible mass-assignable.
- [ ] Gitleaks, SAST, DAST, scan images et dépendances verts.
- [ ] Pentest indépendant réalisé et P0/P1 fermés.
- [ ] Headers/CSP/cookies/proxies validés en production.

## Données et paiements

- [ ] Paiements avec transitions monotones, idempotence, reconciliation et refund.
- [ ] Réservations/factures/audit trail immuables ou retenus légalement.
- [ ] Contraintes DB métier et tests MySQL réels.
- [ ] RPO/RTO approuvés, PITR MySQL testé.
- [ ] Backup/restauration médias testé.
- [ ] Export/suppression RGPD asynchrones, audités et testés.

## Qualité et accessibilité

- [ ] CI complète verte sur le SHA de release.
- [ ] Pint, lint, typecheck, unit/integration/E2E verts.
- [ ] Aucun contraste Axe sérieux/critique.
- [ ] Revue clavier, lecteur d'écran, zoom, reflow, RTL et dark mode achevée.
- [ ] Classes Tailwind invalides éliminées.
- [ ] ErrorBoundary et états d'erreur/réessai cohérents.

## Infrastructure et exploitation

- [ ] Image déployée par SHA/digest, signature vérifiée, version exposée.
- [ ] Slot staging, migration job, smoke/DAST et rollback testés.
- [ ] OIDC GitHub→Azure ; anciens publish profiles révoqués.
- [ ] App Service multi-instance/zone selon SLO, Always On et health probes utiles.
- [ ] MySQL/Redis/Key Vault privés selon architecture cible.
- [ ] Managed identities et Key Vault references actifs.
- [ ] Blob/CDN versionné et sauvegardé.
- [ ] Queue/scheduler supervisés avec heartbeats et failed-job process.
- [ ] OpenTelemetry/App Insights, diagnostics, availability tests et alertes actives.
- [ ] Test de charge conforme aux budgets p95/p99.
- [ ] Runbooks incident, astreinte, rollback, restore et communication testés.
- [ ] SBOM, scan CVE et provenance des images archivés avec la release.

## Gouvernance

- [ ] `main` protégée, reviews obligatoires, CODEOWNERS.
- [ ] Environnement production avec approbateur sans bypass.
- [ ] Tag/release signé et changelog.
- [ ] Au moins deux personnes capables de déployer/restaurer.
- [ ] Documentation distingue clairement cible, état live et preuve datée.
- [ ] Registre de risques et acceptations formelles signé.

---

# 27. Verdict final

## YaZoo est-il prêt à être présenté à une Fondation et à des partenaires professionnels au Maroc ?

**Pas dans son état public actuel, si la présentation prétend montrer une plateforme prête au marché.**

La réponse n'est pas « non » parce que le projet serait faible. Au contraire, il possède assez de profondeur pour mériter une présentation. Mais la production exposée est ancienne et non traçable, les informations légales sont manifestement incomplètes, une page annonce un faux succès, la CI du code actuel est rouge et plusieurs défauts sécurité/intégrité seraient rédhibitoires en due diligence.

Une présentation devient raisonnable sous la forme suivante :

1. **MVP/pilote en développement**, pas production finalisée.
2. Démo privée sur un staging épinglé au SHA, après correction feedback, contrastes, Tailwind et pages légales.
3. Paiement réel désactivé ; données fictives ou explicitement consenties.
4. Transparence sur les P0, budget, responsables et dates de la roadmap.
5. Dossier séparé de preuves : tests, architecture, sécurité, conformité, restore et plan pilote.

Après fermeture des P0, YaZoo pourrait soutenir une **bêta fermée crédible**. Après P1, homologation, audit juridique, pentest, tests de restauration et charge, il pourra prétendre à une production professionnelle. En l'état, le positionnement honnête est :

> **MVP avancé et prometteur, démontrable de façon encadrée ; non prêt pour clients réels, engagement institutionnel ou montée en charge.**

---

# 28. Commandes et preuves principales

| Vérification | Résultat |
|---|---|
| `php artisan test` | 302 réussis, 1 705 assertions |
| `composer test:coverage` | 84,54 % statements ; 70,43 % méthodes |
| lint syntaxe PHP première partie | réussi |
| `composer validate --strict` | réussi |
| `composer audit --locked` | 0 advisory |
| `php artisan route:list --except-vendor` | 162 routes |
| frontend lint/typecheck/build | réussis |
| Vitest coverage sériel | 109 tests réussis ; 73,91 % statements sur périmètre inclus |
| Playwright/Axe CI | 95 réussis, 2 échecs sérieux |
| `npm audit` | 0 vulnérabilité |
| audit i18n | 1 958 clés FR/AR/EN alignées |
| audit légal/release guards/headers local | réussi |
| `docker compose config --quiet` local | échec : variables Reverb absentes de l'exemple racine |
| endpoints Azure live/ready | HTTP 200, DB et Redis OK au moment de l'audit |
| endpoint marketplace public live | HTTP 404, confirmant la dérive de version |

Ce rapport n'est ni un certificat ISO, ni un avis juridique, ni un rapport de pentest externe. Il est une revue technique approfondie, reproductible à partir du dépôt local et des observations datées de l'environnement Azure.
