# YaZoo — parcours vétérinaire, audit et validation du 14 octobre 2026

## 1. État Git initial

Branche `startup-2026`, HEAD `15af09af532b0b2bfa2f030766405ba0ca75abf4`, cinq commits devant `origin/main`.
Suppression intentionnelle de `docs/logo/YaZoo logo.png` et fichier non suivi `docs/logo/YaZoo logo romove background.png` conservés. Aucun commit, changement de branche, push ou déploiement effectué.

Les cinq commits ont été examinés : pilote public (`a1df001`), durcissement (`ad77546`), démonstration cloud/mobile (`26b9f02`), synchronisation des identifiants fictifs (`f5fdae2`), contrats CRUD et R2 (`15af09a`). Les filtres publics, politiques, verrouillage initial des créneaux, états de réservation, CSRF, proxy, R2 et parcours mobile existants sont conservés.

## 2. Problèmes identifiés

| Gravité | Problème | Cause racine et correction |
| --- | --- | --- |
| P1 | Fiche publique peu interactive | Présentation générique et bouton de connexion sans destination ; ajout de détails et actions professionnelles. |
| P1 | Professionnel et créneau perdus à la connexion | `Navigate` vers `/feed` codé en dur ; destination interne validée, paramètres conservés, même traitement pour l'inscription par formulaire. |
| P1 | Disponibilités AFWAJ périmées | Trois jours créés une seule fois au bootstrap ; commande de renouvellement sur 14 jours au démarrage. |
| P1 | Réception des messages dépendante des événements | Abonnement temps réel sans polling de la conversation ; rafraîchissement séquentiel toutes les 15 secondes lorsque l'onglet est visible. |
| P1 | Backend déclaré prêt alors que ses dépendances peuvent être indisponibles | Sonde `/health/live` ; utilisation de `/health/ready` dans Pages Functions et le polling local. |
| P1 | Badges fictifs susceptibles d'être interprétés comme une certification réelle | Jeu de démonstration avec vérification approuvée ; badges de confiance masqués pour les profils fictifs et signalement DEMO. |
| P2 | Navigation professionnelle/sociale à sens unique | Ajout des fiches professionnelles actives dans la ressource de profil social et de leurs liens dans `ProfilePage`. |
| P2 | Protection limitée au verrou du créneau lors de la réservation | Renforcement par verrou du vétérinaire et du client, y compris pour des créneaux distincts chevauchants ; reprise de transaction sur contention. |
| P2 | Chargement des disponibilités peu explicite | État de chargement, état vide, fuseau Casablanca et invalidation de la sélection devenue indisponible. |

Aucun nouveau P0 confirmé dans les parcours vérifiés. Cela ne constitue pas une certification exhaustive de tous les modules du dépôt.

## 3. Corrections effectuées

### Backend

- `app/Http/Controllers/Api/PublicMarketplaceController.php` : contrat public enrichi, spécialités, horaires, services publics du propriétaire, disponibilités sur 14 jours, état occupé sans détail de rendez-vous, seuls avis publiés. Adresses et coordonnées précises limitées aux trois identités fictives autorisées portant les marqueurs DEMO/fictif. Contacts de compte et documents privés exclus.
- `app/Http/Controllers/Api/VeterinarianAppointmentController.php` : sérialisation des réservations par vétérinaire et client, maintien des validations et transactions.
- `app/Http/Controllers/Api/ProfileController.php` et `app/Http/Resources/Profile/UserProfileResource.php` : liens uniquement vers les annonces vétérinaires actives et modérées, marqueur DEMO, absence de certification professionnelle fictive.
- `app/Http/Resources/Marketplace/VeterinarianResource.php` : ajout rétrocompatible de `isDemo`, masquage des badges fictifs de confiance.
- `app/Services/ShowcaseAvailability.php`, `app/Console/Commands/RefreshShowcaseAvailability.php`, `startup.sh` : commande protégée `yazoo:refresh-showcase-availability`, appelée après le bootstrap/synchronisation existants. Garde-fous de cible showcase, confirmation et marqueur AFWAJ v2 ; exactement trois identités autorisées non administratrices ; verrou SQL des vétérinaires. Créneaux de 30 minutes à 9 h, 10 h et 11 h, hors dimanche. Aucun doublon, chevauchement ou déplacement de réservation ; aucune suppression d'historique, aucun GET qui génère des données.
- Tests : `tests/Feature/Marketplace/PublicMarketplaceApiTest.php`, `tests/Feature/Profile/ProfileApiTest.php`, `tests/Feature/ShowcaseAvailabilityTest.php`, `tests/Integration/VeterinarianAppointmentMySqlConcurrencyTest.php` et son worker, fixture SQLite dans `tests/Support/prepare-veterinarian-e2e.php`.

### Frontend

- `src/components/marketplace/PublicVeterinarianDetails.jsx` et son test : identité fictive, spécialités, horaires, services publiés, carte lorsque autorisée, avis publiés, sélection des créneaux et actions réservation/message/profil social/favori.
- `src/pages/PublicListingPage.jsx`, `src/components/marketplace/PublicListingCard.jsx`, `VeterinarianCard.jsx` : intégration de la fiche, accès depuis le catalogue authentifié et signalement des comptes fictifs.
- `src/lib/authDestination.js` et son test, `src/layouts/Layout.jsx`, `src/pages/LoginPage.jsx`, `RegisterPage.jsx` : destinations internes autorisées, rejet des destinations externes, chemins encodés et caractères de contrôle, paramètres de réservation préservés.
- `src/pages/VeterinarianAppointmentsPage.jsx` : reprise du créneau après authentification, chargement des deux lectures en parallèle, verrou de mutation conservé, mise à jour des disponibilités après mutation ou conflit, date dans `Africa/Casablanca`, chargement et état vide explicites.
- `src/pages/MessagesPage.jsx` : polling séquentiel de la liste et de la conversation, sans clignotement de chargement lors du rafraîchissement silencieux.
- `src/pages/ProfilePage.jsx` : retour vers les fiches professionnelles et badge DEMO.
- `src/lib/i18n.js` : nouveaux textes français, anglais et arabe.
- `functions/demo-backend-status.js`, `src/lib/demoBackendPolling.js` : readiness réelle.
- E2E existants `accessibility`, `cold-start`, `public-smoke`, `responsive-rtl-theme`, `startup-pilot` : sonde mise à jour ; assertion de redirection vérifiant désormais le contexte. Nouveau `e2e/veterinarian-fullstack.spec.js`.
- `scripts/start-veterinarian-e2e.ps1` : serveur local reproductible sur base SQLite éphémère, environnement neutre, plusieurs processus PHP et aucune base distante.

## 4. Parcours utilisateur

Le scénario réel Playwright, sans routes API mockées, valide : découverte et filtre Sefrou → fiche professionnelle → créneau → connexion → même vétérinaire et créneau → demande créée côté Laravel → relecture après actualisation → conversation → message persistant → lecture dans un second navigateur connecté comme vétérinaire. Reverb est désactivé dans cet environnement.

Les disponibilités occupées ne livrent ni motif ni identité du client. La réservation est effective uniquement après réponse du serveur. Les tests Laravel couvrent les contrôles de participants, les transitions, annulation/confirmation et les avis après consultation terminée. Favoris, suivi, notifications et stockage sont couverts par leurs tests existants ; ils n'ont pas tous fait l'objet d'un nouveau parcours navigateur réel dédié.

## 5. Tests exécutés

| Environnement / commande | Résultat final observé |
| --- | --- |
| Frontend `npm.cmd run lint` | Réussi |
| Frontend `npm.cmd run typecheck` | Réussi |
| Frontend `npm.cmd run audit:i18n` | Réussi, 2 028 clés FR/AR/EN |
| Frontend `npm.cmd run test -- --run` | 188 tests, 54 fichiers, tous réussis |
| Tests supplémentaires de redirection après extension aux routes existantes | 20 tests réussis, dont 11 ajoutés après le passage complet ci-dessus ; ne pas additionner les exécutions qui se recouvrent |
| Frontend `npm.cmd run build` | Réussi ; génération SEO statique ignorée sans `VITE_SITE_URL` local |
| E2E général `npm.cmd run test:e2e` | 101 réussis, 37 explicitement ignorés car nécessitant la fixture full-stack |
| E2E réel avec `E2E_VETERINARIAN_FULLSTACK=true` | 37 réussis : scénario réel et 36 configurations de fiche publique |
| Laravel PHP 8.4 Docker, `php -d memory_limit=512M vendor/bin/phpunit`, SQLite en mémoire, `.env` neutralisé | 456 tests réussis, 2 648 assertions |
| Tests Laravel ciblés après ajout des deux derniers cas confidentialité/profil | 21 tests réussis, 213 assertions ; recouvrent une partie de la suite précédente |
| MySQL 8.4 éphémère, `VeterinarianAppointmentMySqlConcurrencyTest` | 4 tests réussis, 22 assertions : transitions concurrentes, réservation/suppression, double réservation, double génération AFWAJ |
| `vendor/bin/pint --test` | Réussi après formatage des seuls fichiers concernés |
| `composer validate --strict` / `composer audit` | Manifeste valide ; aucun avis de vulnérabilité trouvé |
| Mobile lint / typecheck / tests | Réussis ; 63 tests réussis |
| Vérification des headers frontend et garde-fous de release startup | Réussis |

La suite Laravel initiale a atteint la limite PHP de 128 Mo. Avec 512 Mo, sept échecs de configuration sont apparus lorsque `.env` local influençait les disques de vérification et R2 ; le montage d'un environnement de test neutre les élimine sans modifier la configuration utilisateur. Des attentes E2E initiales étaient trop courtes avec le serveur PHP mono-processus et les suites concurrentes. La dernière exécution sur fixture propre à plusieurs processus passe les 37 cas. L'ancienne assertion `/login` a été corrigée pour vérifier précisément `returnTo`.

La matrice réelle de fiche publique couvre 320, 375, 390, 768, 1024 et 1440 px × FR/EN/AR × clair/sombre. Vérification de l'absence de débordement et du sens RTL/LTR ; inspection d'une capture arabe sombre 320 px. Les autres écrans bénéficient de la suite responsive/accessibilité existante, dont certaines API sont mockées. Aucune affirmation d'une matrice réelle exhaustive de tous les écrans.

## 6. Vérification du déploiement

GET uniquement. Cloudflare : accueil, `/demo-backend-status`, `/api/marketplace/public-preview`, liste publique, fiches 1/2/3 et leurs liens profonds : HTTP 200. Les trois images vétérinaires référencées sont téléchargées via les URL relatives résolues sur Cloudflare : HTTP 200, `image/png`, respectivement 353 171, 503 254 et 571 369 octets.

Render : `/health/ready` HTTP 200 ; `/health/live` a présenté un timeout de démarrage à froid puis HTTP 200 à la nouvelle tentative. Les deux endpoints annoncent encore `15af09af532b0b2bfa2f030766405ba0ca75abf4`. Les fiches déployées ne contiennent pas encore le nouveau champ `availability`.

Les nouvelles réservations et les nouveaux messages ont été testés exclusivement dans SQLite/MySQL éphémères locaux. Aucun upload ni mutation TiDB distante. Les nouvelles fonctionnalités locales ne sont pas certifiées sur la version publique actuelle. Les résultats HTTP et la capture sont conservés sous `output/` (répertoire de travail ignoré par Git).

## 7. Problèmes restants et limites

- Publication volontairement non effectuée : la démonstration publique conserve son ancien parcours.
- Consentement à la publication d'une adresse réelle absent du modèle : aucune adresse précise réelle exposée par la nouvelle fiche. Il faudra un champ explicite et une validation produit pour l'étendre.
- Les avis de rendez-vous n'ont pas de statut de publication/modération ; ils ne sont donc pas rendus publics automatiquement. La fiche utilise seulement les avis explicitement publiés du modèle de réputation existant. Aucun avis ni qualification synthétique ajouté.
- Les publications sociales restent dans le profil social autorisé, accessible après connexion ; aucune publication privée rendue publique sur la fiche professionnelle.
- OAuth Google n'a pas été validé avec un compte externe. La reprise de contexte testée concerne les formulaires de connexion et les liens d'inscription ; ne pas certifier le callback Google.
- Tests de concurrence exécutés sur MySQL local, pas sur TiDB Cloud. Aucun redémarrage ni déploiement réel Render déclenché. La commande de démarrage est exercée deux fois dans le test isolé avec son garde-fou de cible simulé ; le garde-fou réel reste actif dans la commande livrée.
- Le renouvellement intervient au démarrage ou par commande opérationnelle protégée. Une instance qui reste active plus de 14 jours sans redémarrage doit recevoir cette commande ; aucun scheduler obligatoire, aucune écriture lors des GET.
- Les créneaux historiques, y compris ceux des exemples 2030, sont conservés. Les créneaux passés sont exclus des lectures de disponibilité, sans supprimer l'historique.
- L'audit et les preuves concernent les parcours décrits, avec vérification des protections et suites existantes ; ce rapport ne prétend pas constituer un pentest ni une revue ligne par ligne de chaque module.

## 8. Reproduction et publication ultérieure

Pour les E2E réels, utiliser une image locale contenant PHP 8.4, les extensions et les dépendances Composer de développement. L'image utilisée ici est `yazoo-api:closure`.

Terminal 1, depuis la racine :

```powershell
./scripts/start-veterinarian-e2e.ps1
```

Terminal 2 :

```powershell
cd frontend
$env:E2E_VETERINARIAN_FULLSTACK='true'
$env:E2E_BASE_URL='http://127.0.0.1:5173'
$env:E2E_API_URL='http://127.0.0.1:8000/api'
npm.cmd run test:e2e -- veterinarian-fullstack.spec.js
```

Le scénario de réservation exige une fixture propre : arrêter le seul conteneur `yazoo-veterinarian-e2e`, puis relancer le script avant une nouvelle exécution. La base `/tmp/yazoo-veterinarian-e2e.sqlite` est interne au conteneur et disparaît avec lui. Aucun port de base locale 3306/3307/27017 n'est changé.

Avant publication, relire le diff et créer un commit seulement sur demande explicite. Puis, après autorisation distincte, construire et publier l'image backend et le frontend avec la configuration showcase existante. Conserver les garde-fous et laisser le démarrage appeler la nouvelle commande ; ne pas réinitialiser les seeders. Vérifier ensuite la nouvelle version annoncée, les GET publics, les médias, les disponibilités et, après autorisation explicite, le scénario distant avec un compte fictif. Ne pas confondre disponibilité HTTP et validation d'une mutation distante.
