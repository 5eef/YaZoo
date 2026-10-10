# Rapport AFWAJ YaZoo â€” 9 octobre 2026

Branche `startup-2026`, base de dÃ©part `ad77546d60348577b9095cf230d5c6802a9c32b1`.
Travail local non commitÃ©. Aucun push, dÃ©ploiement, tag, merge, EAS build,
test tÃ©lÃ©phone ou commande ADB. Architecture et fonctionnalitÃ©s conservÃ©es.

## Les deux Ã©checs GitHub

Logs lus du run CI `37824019486` au SHA indiquÃ©.

**Playwright :** la prÃ©misse des cartes dupliquÃ©es nâ€™est pas confirmÃ©e.
`14 Ã— locator resolved` dÃ©crit 14 tentatives de polling sur le mÃªme titre.
La carte rend une seule occurrence. Le badge DEMO FR, non rÃ©ductible et sans
retour Ã  la ligne, peut absorber toute la largeur de son voisin flex.
Le titre devient un rectangle de largeur zÃ©ro et Playwright le considÃ¨re masquÃ©.

Reproduction sur lâ€™image frontend originale, APIs mockÃ©es, viewport 320 Ã— 800 :
une seule carte de 254 px ; `Pilot Demo Vet` mesure **0 px**. MÃªme erreur
`Received: hidden`, `14 Ã— locator resolved`. Ã€ 1280 px sur Windows, le titre
mesurait seulement 13,66 px ; le dÃ©faut dÃ©pend donc de la largeur et des fontes.
Le test original isolÃ©, la suite originale de 101 tests et 30 rÃ©pÃ©titions passaient
sur Windows Ã  la largeur par dÃ©faut : ce passage ne rÃ©futait pas le dÃ©faut Linux.

Correction ciblÃ©e de `PublicListingCard` : en-tÃªte flex avec retour Ã  la ligne,
espace de base rÃ©servÃ© au titre et badges autorisÃ©s Ã  se rÃ©partir sur plusieurs
lignes. Aucun timeout augmentÃ©, aucune sÃ©lection `.first()` ni erreur masquÃ©e.
Le test pilote vÃ©rifie une carte unique et un titre visible de largeur >100 px
aux largeurs 320/768/1280, en FR/AR/EN.

**Docker :** nginx rÃ©sout lâ€™upstream au dÃ©marrage. Un Linux sans le hostname
spÃ©cifique Docker Desktop quitte avec `host not found in upstream
"host.docker.internal"`. Reproduit sur lâ€™image originale avec rÃ©seau isolÃ©.
Lâ€™ancien `--rm` effaÃ§ait alors le conteneur avant `docker logs`, dâ€™oÃ¹ `No such container`.

Correction du script : rÃ©seau temporaire unique, nom backend unique, frontend
avec `BACKEND_UPSTREAM=http://<nom-backend>:8080`. Suppression de `--rm` au
dÃ©marrage ; rÃ©cupÃ©ration des logs avant cleanup, y compris sur Ã©chec du contrÃ´le
des processus. Cleanup des deux conteneurs et du rÃ©seau. ContrÃ´le non-root
conservÃ© et connexion frontend â†’ backend vÃ©rifiÃ©e par DNS Docker.

## Validations locales

| Gate | RÃ©sultat |
|---|---|
| Backend `composer validate --strict`, `composer audit` | PASS, aucun advisory Composer |
| Backend `php artisan test` | 427 tests PASS ; suite SQLite en mÃ©moire dans PHP Docker |
| Tests showcase ciblÃ©s | 6 tests PASS : bootstrap, compte jury/RDV, upgrade v1, refus de contenu modifiÃ©, idempotence, rÃ©hydratation |
| Pint complet et nouveau seeder explicite | PASS |
| Frontend `npm ci`, lint, typecheck | PASS |
| Frontend Vitest | 156 tests PASS |
| Frontend build avec les variables Pages | PASS ; 13 entrÃ©es SEO gÃ©nÃ©rÃ©es |
| Frontend Playwright, configuration standard CI | 101 tests PASS |
| Mobile `npm ci`, lint, typecheck | PASS |
| Mobile tests | 44 tests PASS, aucun skip |
| Expo `install --check`, Expo Doctor | PASS ; Doctor 21/21 |
| Export Android preview avec URL Cloudflare et source maps | PASS |
| Build images backend, frontend, API demo | PASS |
| Smoke rÃ©seau et non-root release/API demo | PASS |
| Gitleaks fichiers livrables incluant modifications non commitÃ©es | PASS, aucun secret dÃ©tectÃ© |
| Gitleaks historique `startup-2026` | PASS, 145 commits scannÃ©s, aucun secret dÃ©tectÃ© |
| Trivy Ã©pinglÃ© CI, seuil HIGH/CRITICAL | PASS sur les trois images locales |
| Release guards et headers frontend | PASS |

Total des suites principales : **728 tests** (427 + 156 + 101 + 44), sans
additionner une seconde fois les six tests showcase dÃ©jÃ  inclus au backend.
Les commandes PHP utilisent le conteneur PHP 8.4 avec extensions, et non le PHP
XAMPP local ; aucune configuration des ports MySQL/MariaDB/MongoDB nâ€™est modifiÃ©e.

Les audits npm restent non nuls : **5 HIGH frontend**, **19 HIGH mobile** dans
les arbres dâ€™outillage dÃ©jÃ  documentÃ©s. Les gates existants
`audit-dependency-policy.mjs` passent : runtime navigateur sans advisory, graphe
Android exportÃ© sans ces modules vulnÃ©rables et adaptateur URI corrigÃ© prÃ©sent.
Aucune exception ajoutÃ©e ni seuil abaissÃ©. Voir `DEPENDENCY_SECURITY_AFWAJ_2026.md`.

Une exÃ©cution supplÃ©mentaire de toute la suite avec `E2E_STARTUP_PILOT=true`
a exposÃ© deux tests historiques dâ€™accueil/Cold-start qui attendent une annonce
animale publique ; cette configuration les exclut volontairement du produit.
Leurs tests nâ€™ont pas Ã©tÃ© dÃ©sactivÃ©s ou modifiÃ©s. La suite standard identique au
job quality passe ; le test pilote FR/AR/EN passe aussi avec le flag pilote.
Cette observation reste visible ici, sans prÃ©tendre Ã  une suite complÃ¨te verte
dans tous les modes de feature flags.

## Dataset showcase

| Ã‰lÃ©ment | DonnÃ©es v2 |
|---|---|
| Comptes | 20 ; jury : `client.fes@yazoo.test`, non-admin |
| VÃ©tÃ©rinaires | 3 cabinets fictifs explicitement DEMO : Sefrou, FÃ¨s, MeknÃ¨s |
| Services | 10 services garde/Ã©ducation conservÃ©s, localisÃ©s dans le corridor pilote |
| DisponibilitÃ©s | 12 ; dont 9 crÃ©neaux libres Ã  J+1/J+2/J+3 du bootstrap |
| RDV | 3 exemples pending/confirmed/completed ; crÃ©ation rÃ©elle via lâ€™API testÃ©e avec le compte jury |
| Messages | 5 conversations, 10 messages ; trois Ã©changes client/vÃ©tÃ©rinaire ajoutÃ©s |
| Feed | 5 posts publics : 3 images et 2 vidÃ©os |
| Stories | 1 image et 1 vidÃ©o actives jusquâ€™au 1er janvier 2027 |
| Reels | 2 posts vidÃ©o publics/actifs consommables par le parcours Reels existant |
| Interactions | 6 likes, 4 commentaires, 3 follows |

Les vÃ©tÃ©rinaires prÃ©sentent leurs spÃ©cialitÃ©s et crÃ©neaux. Les services restent
les catÃ©gories mÃ©tier supportÃ©es, sans inventer un type de consultation marketplace.
Les autres annonces, rÃ©servations et fonctionnalitÃ©s ne sont pas supprimÃ©es.
Tous les personnages non-admin sont marquÃ©s DEMO ; les textes sociaux indiquent
leur caractÃ¨re fictif. Aucun vrai partenaire ni traction nâ€™est inventÃ©.

MP4 H.264 baseline locaux, 240 Ã— 426, 4 secondes, sans audio : **80 577** et
**80 240 octets**. Animations synthÃ©tiques portant Â« YaZoo DEMO Â», versionnables
et sans URL externe. `Dockerfile.api-demo` les inclut dÃ©jÃ  via `COPY backend/`.
La commande de rÃ©hydratation restaure images et vidÃ©os aprÃ¨s redÃ©marrage Render.

Le marqueur passe Ã  v2. Mise Ã  niveau dâ€™un v1 intact sous les mÃªmes garde-fous,
transactionnelle et idempotente, avec conservation des credentials existants.
Une base v1 avec contributions sociales nouvelles est refusÃ©e, sans effacement.
Les nouveaux crÃ©neaux et lâ€™expiration des Stories doivent Ãªtre renouvelÃ©s avant
une dÃ©monstration ultÃ©rieure ; dÃ©tails dans le guide.

## Web et Android

Architecture inchangÃ©e : Pages â†’ Functions â†’ Render Laravel â†’ TiDB showcase.
Les tests proxy couvrent un appel Bearer sans cookie Ã  `/api/auth/me`, les
rÃ©ponses 200/401, Authorization, Accept-Language, Content-Type et lâ€™absence de
rejeu automatique des mutations.

`ApiError` conserve le code public connu et `Retry-After` bornÃ©, sans exposer
un message upstream arbitraire. Lâ€™Ã©tat `DEMO_BACKEND_WAKING` est traduit en
FR/EN/AR dans les Ã©crans mobile. Bouton RÃ©essayer ; Ã  Login il vÃ©rifie la
disponibilitÃ© par GET, puis lâ€™utilisateur soumet explicitement sa connexion.
Aucun retry infini ou POST automatique.

Le profil EAS preview utilise explicitement lâ€™environnement preview, APK interne,
credentials distants. `app.config.ts` et `app.json` acceptent lâ€™URL Cloudflare,
vÃ©rifiÃ©e par tests et par export Android. Aucun build EAS distant lancÃ©.

Constat public du 9 octobre : Web HTTP 200 ; `/demo-backend-status` HTTP 503
`waking` ; origine Render sans rÃ©ponse dans le dÃ©lai de 20 secondes. La nouvelle
version nâ€™est pas dÃ©ployÃ©e, sa disponibilitÃ© distante ne peut pas Ãªtre certifiÃ©e.
La CI GitHub demeure celle du SHA initial en Ã©chec jusquâ€™au commit/push autorisÃ©
et Ã  une nouvelle exÃ©cution ; les gates locaux ne sont pas prÃ©sentÃ©s comme un
nouveau run GitHub vert.

## Commandes et dossier de candidature

`AFWAJ_DEMO_GUIDE.md` est crÃ©Ã©, sans secret, avec les deux parcours de trois
minutes, les limites honnÃªtes et les emplacements APK/QR encore vides.
Il contient les commandes Docker exactes, les settings Cloudflare/Render et les
Ã©tapes EAS propriÃ©taire vÃ©rifiÃ©es dans la documentation officielle.

- Cloudflare : racine `frontend`, build `npm ci && npm run build`, sortie `dist`.
- Build public : `VITE_API_URL=/api`, `VITE_STORAGE_URL=/storage`,
  `VITE_SITE_URL=https://yazoo-showcase.pages.dev`.
- Binding secret serveur : `BACKEND_ORIGIN=https://yazoo-showcase.onrender.com`.
- Android : `EXPO_PUBLIC_API_URL=https://yazoo-showcase.pages.dev/api`.
- Render : `docker.io/5eef/yazoo-api-demo:<SHA_COMPLET_DU_FUTUR_COMMIT_VALIDÃ‰>`,
  port 8080, health `/health/live`. Le SHA final nâ€™existe pas encore : aucun faux
  tag de release nâ€™est annoncÃ©. Images de vÃ©rification : `yazoo-api:afwaj-local`,
  `yazoo-frontend:afwaj-local`, `yazoo-api-demo:afwaj-local`.
- EAS : `npx eas-cli@latest login`, `project:info`, `init` si nÃ©cessaire,
  `env:set --name EXPO_PUBLIC_API_URL --value https://yazoo-showcase.pages.dev/api --environment preview --visibility plaintext`,
  puis `build --platform android --profile preview`.
- AprÃ¨s CI rÃ©ellement verte : recommandation **B**, lien candidature vers
  `https://github.com/5eef/YaZoo/tree/startup-2026`. Pas de merge automatique.
- Tag recommandÃ© aprÃ¨s accord : `afwaj-2026-demo-v1`, non crÃ©Ã©.

## Fichiers modifiÃ©s ou ajoutÃ©s

```text
backend/app/Console/Commands/BootstrapShowcase.php
backend/app/Console/Commands/EnsureShowcaseMedia.php
backend/database/seeders/AfwajShowcaseSeeder.php
backend/database/seeders/assets/social/README.md
backend/database/seeders/assets/social/afwaj-reel-1.mp4
backend/database/seeders/assets/social/afwaj-reel-2.mp4
backend/tests/Feature/Marketplace/ShowcaseBootstrapTest.php
frontend/e2e/startup-pilot.spec.js
frontend/src/cloudflare/proxy.test.js
frontend/src/components/marketplace/PublicListingCard.jsx
frontend/src/components/marketplace/PublicListingCard.test.jsx
mobile/App.tsx
mobile/eas.json
mobile/src/api/client.ts
mobile/src/api/errors.ts
mobile/src/components/feed/FeedScreen.tsx
mobile/src/components/reels/ReelsScreen.tsx
mobile/src/features/social/useSocial.tsx
mobile/src/i18n/messages.ts
mobile/tests/contracts.test.mjs
mobile/tests/distributed-config.test.mjs
mobile/tests/network-errors.test.mjs
scripts/smoke-test-release-images.sh
docs/AFWAJ_DEMO_GUIDE.md
docs/AFWAJ_DEMO_REPORT.md
```

Rapports de commandes locaux sous `output/afwaj-*` (ignorÃ©s par Git).
Message de commit recommandÃ© :
`fix(demo): prepare AFWAJ web and Android showcase, responsive cards and portable smoke`

## IdentitÃ© et entrÃ©e mobile â€” validation du 10 octobre 2026

Le working tree local a Ã©tÃ© conservÃ© comme source de vÃ©ritÃ©. Les 28 fichiers
modifiÃ©s/non suivis prÃ©sents Ã  lâ€™entrÃ©e ont Ã©tÃ© sauvegardÃ©s dans le dossier
ignorÃ© `output/brand-before-20261010/`, avec un diff binaire. Les changements
backend AFWAJ et les trois originaux `docs/logo` sont identiques octet par octet
Ã  cette sauvegarde. Aucun backend modifiÃ© pendant la mission dâ€™identitÃ©.

Inventaire et mapping complet : [BRAND_ASSETS.md](BRAND_ASSETS.md).
Symbole seul SVG pour le Web ; PNG complet transparent pour Login/Register ;
PNG symbole et dÃ©rivations carrÃ©es pour le shell, launcher, adaptive icon,
favicon et splash Android. Tous les points dâ€™affichage Web existants ont migrÃ©,
avec les PNG PWA/SEO renouvelÃ©s et le cache public v3. Aucun ancien logo chargÃ©
par les sources runtime ; les anciens fichiers inactifs restent pour lâ€™historique.
Le gÃ©nÃ©rateur de soutenance utilise Ã©galement le nouveau PNG complet.

Lâ€™entrÃ©e dÃ©diÃ©e `MobileAuthEntry.tsx` prÃ©sente le logo au centre pendant 800 ms,
puis une animation native cubic out de 550 ms : translation verticale vers le
haut, scale 1 â†’ 0,78, formulaire opacity 0 â†’ 1 et translateY 24 â†’ 0. Le formulaire
est interactif dÃ¨s le dÃ©but de la transition ; Reduce Motion affiche lâ€™Ã©tat final
sans attendre le timer. Aucun scroll automatique, sÃ©lecteur de langue invitÃ© ou
nouvelle dÃ©pendance. Login/Register, consentement, validations, sÃ©curitÃ©, liens
lÃ©gaux et gestion du rÃ©veil Render sont conservÃ©s.

La langue invitÃ©e suit automatiquement le tÃ©lÃ©phone : ar/en, sinon fr, sans flash
de formulaire franÃ§ais avant dÃ©tection. La prÃ©fÃ©rence explicite dâ€™une session
restaurÃ©e est conservÃ©e ; changement volontaire dans les paramÃ¨tres connectÃ©s.
AprÃ¨s dÃ©connexion/invalidation, lâ€™entrÃ©e reprend la langue du tÃ©lÃ©phone.
Textes/champs RTL arabe, thÃ¨me clair/sombre, clavier et scroll manuel conservÃ©s.
Restauration : symbole uniquement, puis Feed si session localement valide, sans
Login intermÃ©diaire ; la rÃ©vocation serveur conserve son traitement 401 existant.

| Gate rÃ©exÃ©cutÃ© | RÃ©sultat du 10 octobre |
|---|---|
| Frontend lint, typecheck | PASS |
| Frontend tests unitaires | 158 PASS, 44 fichiers de tests |
| Frontend i18n | PASS, 2014 clÃ©s FR/EN/AR |
| Frontend Tailwind | PASS, 187 classes dâ€™opacitÃ© |
| Frontend build avec API/storage same-origin et site Pages | PASS, 13 entrÃ©es SEO |
| Frontend Playwright standard | 101 PASS, dont responsive, RTL, thÃ¨mes et accessibilitÃ© Web |
| Mobile lint, typecheck | PASS |
| Mobile tests | 49 PASS, aucun skip ; locale, intro/Login/Register, Reduce Motion, restauration et assets inclus |
| Expo install --check | PASS, dÃ©pendances Ã  jour |
| Expo Doctor | PASS, 21/21 |
| Expo export --platform android | PASS, API `https://yazoo-showcase.pages.dev/api`, 1423 modules, nouveaux PNG prÃ©sents |
| Composer validate --strict et audit | PASS, aucun advisory |
| Backend tests, image PHP locale et base de tests isolÃ©e | 427 PASS, 2397 assertions |
| Pint | PASS, 447 fichiers |
| Gitleaks fichiers livrables et mÃ©tadonnÃ©es logo extraites | PASS, aucun secret dÃ©tectÃ© |
| Git diff --check | PASS ; index vide, branche startup-2026 |

Total des suites principales actuelles : **735 tests** (427 + 158 + 101 + 49).
Les Ã©checs de mise au point (tests dâ€™assets Vitest en environnement DOM et rÃ©fÃ©rence
SVG accidentelle dans le shell natif) ont Ã©tÃ© corrigÃ©s puis les gates concernÃ©s
rÃ©exÃ©cutÃ©s avec succÃ¨s ; aucune erreur ni aucun test dÃ©sactivÃ©.

Les SVG statiques nâ€™ont ni scripts, Ã©vÃ©nements, foreignObject ni chargement
externe. PNG avec provenance C2PA/XMP et EXIF technique : aucun tag GPS principal,
aucun credential dÃ©tectÃ© dans les mÃ©tadonnÃ©es extraites. Aucun secret, keystore,
APK/AAB, dist, coverage ou dÃ©pendance ajoutÃ©s aux fichiers livrables.

**A â€” Techniquement prÃªt pour la revue du dossier AFWAJ :** identitÃ© intÃ©grÃ©e,
entrÃ©e mobile et gates ci-dessus validÃ©s localement. Les modifications ne sont
pas publiÃ©es ; aucune nouvelle CI distante verte ou disponibilitÃ© du dÃ©ploiement
actuel nâ€™est revendiquÃ©e. Les rÃ©sultats Docker/Trivy du 9 octobre ci-dessus restent
des preuves de cette prÃ©paration antÃ©rieure, pas de nouveaux builds dâ€™identitÃ©.

**B â€” Actions humaines :** revue Expo Go/APK de lâ€™entrÃ©e, TalkBack, grands
caractÃ¨res et clavier ; association/authentification EAS, signature et APK preview
puis URL/QR rÃ©els ; commit/CI et dÃ©ploiement public aprÃ¨s validation propriÃ©taire ;
formulaire AFWAJ, identitÃ©/piÃ¨ces administratives, budget/devis rÃ©els, recherche
OMPIC et droits du logo, formalitÃ©s CNDP, professionnels rÃ©ellement consentants.
Aucune traction, protection de marque, conformitÃ© finalisÃ©e, validation AFWAJ
ou publication Play Store affirmÃ©e. Expo Go ne valide pas le launcher/splash
dâ€™un APK signÃ© ; une reconstruction native sera nÃ©cessaire pour ces assets.

Warnings non bloquants : messages Node `MODULE_TYPELESS_PACKAGE_JSON`, variables
console NO_COLOR/FORCE_COLOR et normalisation CRLF/LF Git. Aucun test tÃ©lÃ©phone,
ADB, EAS build, commit, push, merge, tag ou dÃ©ploiement exÃ©cutÃ©.

Message de commit proposÃ© pour lâ€™ensemble AFWAJ local, Ã  dÃ©cider par le propriÃ©taire :
`feat(afwaj): integrate startup identity, animated mobile entry and showcase readiness`

### Fichiers de la mission identite (par rapport a lâ€™etat dâ€™entree)

Modifies (29) :

```text
README.md
docs/AFWAJ_2026_STARTUP_BRIEF.md
docs/AFWAJ_DEMO_GUIDE.md
docs/AFWAJ_DEMO_REPORT.md
docs/BRAND_DECISION.md
docs/MOBILE_DESIGN_PARITY.md
frontend/index.html
frontend/public/apple-touch-icon.png
frontend/public/icon-192.png
frontend/public/icon-512.png
frontend/public/icon-maskable-512.png
frontend/public/staticwebapp.config.json
frontend/public/sw.js
frontend/src/App.jsx
frontend/src/components/marketplace/PublicMarketplaceShell.jsx
frontend/src/components/navigation/DesktopSidebar.jsx
frontend/src/components/ui/Footer.jsx
frontend/src/components/ui/PublicPageShell.jsx
frontend/src/layouts/Layout.jsx
frontend/src/lib/brand.js
frontend/src/pages/LandingPage.jsx
frontend/staticwebapp.config.json
mobile/App.tsx
mobile/README.md
mobile/app.json
mobile/src/navigation/YaZooShell.tsx
mobile/src/theme/ThemeProvider.tsx
mobile/tests/video-ux.test.mjs
scripts/build_yazoo_soutenance_pptx.py
```

Nouveaux (15) :

```text
docs/BRAND_ASSETS.md
frontend/public/brand/yazoo-logo.png
frontend/public/brand/yazoo-logo.svg
frontend/public/brand/yazoo-symbol.svg
frontend/src/lib/brand.test.js
mobile/assets/brand/adaptive-foreground.png
mobile/assets/brand/app-icon.png
mobile/assets/brand/favicon.png
mobile/assets/brand/yazoo-logo.png
mobile/assets/brand/yazoo-symbol.png
mobile/src/components/auth/BrandLoading.tsx
mobile/src/components/auth/MobileAuthEntry.tsx
mobile/src/i18n/deviceLocale.ts
mobile/tests/brand-entry.test.mjs
scripts/build-brand-assets.cjs
```

Les originaux docs/logo etaient deja presents et non suivis a lâ€™entree ; ils restent inchanges. Les autres modifications AFWAJ du 9 octobre restent conservees, voir leur liste precedente.
# PrÃ©paration release cloud finale â€” 10 octobre 2026

Runbook : [AFWAJ_DEPLOYMENT_FINAL](AFWAJ_DEPLOYMENT_FINAL.md). Aucun commit/push/dÃ©ploiement/EAS/ADB, aucune modification TiDB rÃ©elle, aucun volume supprimÃ© pendant cette mission.

Correction credentials : au premier bootstrap, seul le groupe non-admin reÃ§oit le secret jury ; les admins reÃ§oivent des passwords alÃ©atoires forts indÃ©pendants, non affichÃ©s. Synchronisation explicite idempotente des fixtures non-admin, sous ShowcaseBootstrapGuard complet, marker v2 et marqueurs fictifs nom/bio ; admins, outsiders, timestamps et donnÃ©es prÃ©servÃ©s. L'upgrade historique conserve les admins : rotation privÃ©e propriÃ©taire indispensable si leur ancien password Ã©tait connu du jury.

Correction runtime rÃ©vÃ©lÃ©e par le container : le preflight refusait le sentinel Laravel `REMOTE_ADDR`. Il est dÃ©sormais acceptÃ© uniquement pour le profil showcase ; test de rÃ©gression maintenant le refus pour production mÃ©tier. Autre correction : runner E2E fixe VITE_SITE_URL sur son origine locale pour Ã©viter l'hÃ©ritage du build Cloudflare et les deux Ã©checs canonical SEO correspondants.

Validation locale finale : composer validate strict/audit PASS ; **431 tests PHP, 2413 assertions**, Pint **448 fichiers** ; frontend npm ci/lint/typecheck **158 tests**, i18n **2014 clÃ©s**, Tailwind **187 classes**, build et **101 E2E PASS** ; mobile npm ci/Expo install check/lint/typecheck **49 tests**, Doctor **21/21**, export Android **1423 modules** avec URL Cloudflare, puis export avec sourcemaps et gate runtime PASS. Deux tests de politique de release et les guards actifs startup/showcase passent.

Docker `yazoo-api-demo:afwaj-final` et `yazoo-frontend:afwaj-final` construits localement avec --pull. Smoke Linux sur rÃ©seau dÃ©diÃ© et contrÃ´les non-root PASS. Sur MySQL temporaire en RAM : migrations/bootstrap/preflight, health live/ready, login Sanctum client jury, Feed 5 posts, deux MP4 servis (80240/80577 octets), Stories, vÃ©tÃ©rinaires, services, RDV et conversations PASS. Credential sync sans modification au second passage ; restauration d'un MP4 supprimÃ© PASS. Containers/rÃ©seau jetables nettoyÃ©s, aucun volume utilisÃ© pour cette base.

SÃ©curitÃ© : Gitleaks livrables **aucun secret** ; Trivy images finales **0 HIGH/CRITICAL, 0 secret**. npm audit complet demeure non-zero : frontend **5 HIGH tooling**, mobile **19 HIGH tooling propagÃ©es** ; politique CI existante inchangÃ©e, runtime navigateur sans advisory et graphe Android inspectÃ© sans braces/node-forge. Voir DEPENDENCY_SECURITY_AFWAJ_2026 ; ne pas transformer ces rÃ©siduels en Â« npm audit PASS Â».

HEAD reste `ad77546d60348577b9095cf230d5c6802a9c32b1` : les changements locaux n'ont pas encore de SHA de release. Images locales de prÃ©paration, pas d'image Docker Hub finale publiÃ©e. Le propriÃ©taire doit revoir/commiter, obtenir CI verte, reconstruire/valider et publier sous le nouveau FULL_SHA. Render/Cloudflare/EAS prÃªts Ã  configurer selon le runbook ; santÃ© cloud, contenus TiDB historiques, APK/QR et parcours Web â†” Android aprÃ¨s dÃ©ploiement restent Ã  vÃ©rifier humainement. Aucun doublon distant confirmÃ© ni supprimÃ©.
