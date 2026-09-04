# YaZoo - Roadmap INDH locale

## 1. Objectif INDH

YaZoo vise a devenir une plateforme marocaine de mise en relation responsable autour de l'adoption animale, des services animaliers et des professionnels locaux. Le projet est positionne comme une initiative sociale et economique pour soutenir l'adoption responsable, la visibilite des professionnels locaux, la moderation des contenus, la securite des utilisateurs et l'inclusion numerique.

YaZoo n'est pas un vendeur direct d'animaux. Le dossier INDH doit presenter YaZoo comme une plateforme d'intermediation, avec des limites claires tant que les pieces administratives CNDP, ONSSA, fiscales et juridiques reelles ne sont pas fournies.

## 2. Fonctionnalites deja presentes

- Backend Laravel 12 et API REST.
- Frontend React 19, Vite et Tailwind CSS.
- Docker Compose local avec MySQL et Redis.
- Authentification email/OTP, OTP SMS, OAuth Google et session Sanctum.
- Profils publics, avatars, bio, ville, pays et indicateurs de confiance.
- Feed social avec posts, medias, reactions, commentaires, stories et visibilite.
- Marketplace animaux, produits, services et veterinaires.
- Messagerie, conversations privees et notifications.
- Follow, communautes et reservations.
- Recherche globale avec utilisateurs, communautes, annonces et posts.
- Admin moderation, admin commandes et admin statistiques.
- Signalements pour animals, products, services, veterinarians et posts.
- Pages legales/pro publiques et footer complet.
- i18n FR/AR/EN, RTL arabe et dark mode.
- Champs de securite sur annonces animales: telephone de contact et acceptation des regles.

## 3. Risques critiques restants

- Conformite CNDP / Loi 09-08: base technique en place, mais informations administratives, formalites CNDP, durees de conservation et procedures humaines restent a valider.
- Conformite ONSSA et verification professionnelle: base technique en place, mais verification administrative reelle et stockage prive documentaire renforce restent necessaires avant production publique.
- Back-office institutionnel: base fonctionnelle en place, mais procedures humaines, retention des logs et roles operationnels doivent etre formalises.
- PWA, SEO, accessibilite et dossier INDH: base locale en place, mais audits humains, domaine final, prerender/SEO avance et validation institutionnelle restent a faire.
- Des fichiers locaux sensibles ou volumineux existent dans l'environnement de travail et doivent etre exclus de tout partage: `.env`, `.git`, `node_modules`, `vendor`, `infra/backups`, `backend/storage/logs`, dumps SQL, logs et artefacts de build.

## 4. Phases de travail

### Phase 1 - Nettoyage securite et conformite documentaire minimale

Statut: terminee.

Objectif: securiser le partage local du projet, documenter les exclusions, renforcer les pages legales publiques et clarifier le positionnement INDH/CNDP minimal.

### Phase 2 - CNDP / Loi 09-08

Statut: terminee.

Objectif: consentements, export utilisateur, demande de suppression, cookies et preferences privacy.

### Phase 3 - ONSSA / annonces animales / professionnels

Statut: terminee.

Objectif: verification professionnelle, champs de conformite animale, statuts de revision et badges fiables.

### Phase 4 - Admin gouvernemental

Statut: terminee.

Objectif: moderation actions, suspensions, exports CSV, historique admin et middleware admin consolide.

### Phase 5 - PWA, accessibilite, SEO, dossier INDH final

Statut: terminee.

Objectif: PWA, SEO, accessibilite, documentation INDH finale et checklists de production.

## 5. Fichiers modifies par phase

### Phase 1

- `docs/INDH_ROADMAP_YAZOO.md` cree pour memoriser le travail local.
- `docs/README_COMMISSION.md` cree pour presenter YaZoo a une commission INDH.
- `docs/SECURITY_SHARING.md` cree avec consignes de partage et commande PowerShell de ZIP propre.
- `.env.example` enrichi avec avertissement local sans secrets.
- `backend/.env.example` clarifie pour Windows local (`127.0.0.1:3308`) et Docker (`mysql:3306`).
- `frontend/.env.example` enrichi avec avertissement local sans secrets.
- `frontend/src/pages/PrivacyPage.jsx` enrichi avec sections CNDP minimales.
- `frontend/src/pages/TermsPage.jsx` enrichi avec intermediation, non vente directe et reclamations.
- `frontend/src/pages/PublishingRulesPage.jsx` enrichi avec responsabilite publieur, professionnels et signalement.
- `frontend/src/pages/AboutPage.jsx` enrichi avec impact social, mentions legales et contact donnees personnelles.
- `frontend/src/lib/i18n.js` enrichi avec nouvelles chaines FR/AR/EN.
- `AUDIT_I18N_UI_MOBILE_YAZOO.md` regenere par l'audit i18n.

### Phase 2

- `backend/database/migrations/2026_06_30_190000_create_privacy_consents_table.php` creee.
- `backend/database/migrations/2026_06_30_190100_create_data_deletion_requests_table.php` creee.
- `backend/app/Models/PrivacyConsent.php` cree.
- `backend/app/Models/DataDeletionRequest.php` cree.
- `backend/app/Http/Controllers/Api/PrivacyConsentController.php` cree.
- `backend/app/Http/Controllers/Api/PrivacyController.php` cree.
- `backend/app/Http/Controllers/Api/DataDeletionRequestController.php` cree.
- `backend/app/Http/Requests/Privacy/StorePrivacyConsentRequest.php` cree.
- `backend/app/Http/Requests/Privacy/StoreDataDeletionRequestRequest.php` cree.
- `backend/app/Http/Resources/PrivacyConsentResource.php` cree.
- `backend/app/Http/Resources/DataDeletionRequestResource.php` cree.
- `backend/tests/Feature/PrivacyApiTest.php` cree.
- `backend/app/Models/User.php` modifie pour ajouter les relations privacy.
- `backend/routes/api.php` modifie pour les routes privacy.
- `backend/lang/fr/messages.php`, `backend/lang/ar/messages.php`, `backend/lang/en/messages.php` modifies.
- `frontend/src/api/privacy.js` cree.
- `frontend/src/components/privacy/CookieConsentBanner.jsx` cree.
- `frontend/src/components/privacy/ExportDataButton.jsx` cree.
- `frontend/src/components/privacy/DeleteAccountRequestModal.jsx` cree.
- `frontend/src/pages/PrivacySettingsPage.jsx` cree.
- `frontend/src/App.jsx` modifie pour le bandeau cookies et `/settings/privacy`.
- `frontend/src/pages/SettingsPage.jsx` modifie avec lien privacy.
- `frontend/src/pages/RegisterPage.jsx` modifie avec consentement SMS OTP obligatoire.
- `frontend/src/lib/i18n.js` modifie avec les cles FR/AR/EN phase 2.
- `docs/CNDP_COMPLIANCE_NOTES.md` cree.
- `AUDIT_I18N_UI_MOBILE_YAZOO.md` regenere par l'audit i18n.

### Phase 3

- `backend/database/migrations/2026_06_30_200000_create_professional_verifications_table.php` creee.
- `backend/database/migrations/2026_06_30_200100_add_compliance_fields_to_animals_table.php` creee.
- `backend/app/Models/ProfessionalVerification.php` cree.
- `backend/app/Http/Controllers/Api/ProfessionalVerificationController.php` cree.
- `backend/app/Http/Controllers/Api/AdminAnimalReviewController.php` cree.
- `backend/app/Http/Requests/ProfessionalVerification/StoreProfessionalVerificationRequest.php` cree.
- `backend/app/Http/Requests/ProfessionalVerification/UpdateProfessionalVerificationStatusRequest.php` cree.
- `backend/app/Http/Requests/Admin/UpdateAnimalLegalStatusRequest.php` cree.
- `backend/app/Http/Resources/ProfessionalVerificationResource.php` cree.
- `backend/tests/Feature/ProfessionalVerificationApiTest.php` cree.
- `backend/tests/Feature/AdminAnimalReviewApiTest.php` cree.
- `backend/app/Models/Animal.php`, `backend/app/Models/User.php`, `backend/app/Http/Requests/Marketplace/StoreAnimalRequest.php`, `backend/app/Http/Resources/Marketplace/AnimalResource.php`, `backend/app/Services/Marketplace/AnimalMarketplaceService.php`, `backend/database/factories/AnimalFactory.php` modifies.
- `backend/app/Http/Controllers/Api/ProfileController.php` et `backend/app/Http/Resources/Profile/UserProfileResource.php` modifies pour exposer le statut professionnel.
- `backend/routes/api.php` modifie pour les routes verification pro et revue animaux.
- `backend/lang/fr/messages.php`, `backend/lang/ar/messages.php`, `backend/lang/en/messages.php` modifies.
- `frontend/src/api/professionalVerifications.js` cree.
- `frontend/src/components/ui/ComplianceBadge.jsx` cree.
- `frontend/src/features/marketplace/animalCompliance.js` cree.
- `frontend/src/pages/ProfessionalVerificationPage.jsx` cree.
- `frontend/src/pages/AdminProfessionalVerificationsPage.jsx` cree.
- `frontend/src/pages/AdminAnimalReviewPage.jsx` cree.
- `frontend/src/App.jsx`, `frontend/src/layouts/Layout.jsx`, `frontend/src/pages/SettingsPage.jsx` modifies pour les routes/liens Phase 3.
- `frontend/src/components/marketplace/AnimalListingForm.jsx`, `frontend/src/components/marketplace/AnimalCard.jsx`, `frontend/src/pages/AnimalDetailPage.jsx`, `frontend/src/pages/ProfilePage.jsx` modifies.
- `frontend/src/features/marketplace/marketplaceOptions.js`, `frontend/src/features/marketplace/marketplaceUtils.js`, `frontend/src/hooks/useAnimalsMarketplace.js`, `frontend/src/features/marketplace/marketplaceUtils.test.js` modifies.
- `frontend/src/pages/PublishingRulesPage.jsx`, `frontend/src/pages/TermsPage.jsx`, `frontend/src/lib/i18n.js` modifies.
- `docs/ONSSA_COMPLIANCE_NOTES.md` cree.
- `AUDIT_I18N_UI_MOBILE_YAZOO.md` regenere par l'audit i18n.

### Phase 4

- Phase admin institutionnel terminee localement.
- Lecture de la roadmap, des notes ONSSA et CNDP effectuee avant modification.
- Inspection des routes admin, pages admin, modeles et coherence Docker/code local effectuee.
- `backend/app/Http/Middleware/EnsureUserIsAdmin.php` cree.
- `backend/app/Http/Middleware/EnsureUserIsNotSuspended.php` cree.
- `backend/app/Models/ModerationAction.php` cree.
- `backend/app/Services/Admin/ModerationLogger.php` cree.
- `backend/app/Http/Controllers/Api/AdminModerationActionController.php` cree.
- `backend/app/Http/Controllers/Api/AdminUserModerationController.php` cree.
- `backend/app/Http/Controllers/Api/AdminContentModerationController.php` cree.
- `backend/app/Http/Controllers/Api/AdminExportController.php` cree.
- `backend/app/Http/Requests/Admin/ModerateUserRequest.php` cree.
- `backend/app/Http/Requests/Admin/UpdateContentModerationStatusRequest.php` cree.
- `backend/app/Http/Resources/ModerationActionResource.php` cree.
- `backend/tests/Feature/Admin/AdminUserModerationTest.php` cree.
- `backend/tests/Feature/Admin/AdminModerationActionTest.php` cree.
- `backend/tests/Feature/Admin/AdminExportTest.php` cree.
- `backend/tests/Feature/Admin/AdminContentModerationTest.php` cree.
- Modeles `User`, `Animal`, `Product`, `ServiceListing`, `Veterinarian`, `Post` modifies pour les statuts moderation/suspension.
- Ressources `UserResource`, `UserProfileResource`, `AnimalResource`, `ProductResource`, `ServiceListingResource`, `PostResource` enrichies.
- Controllers admin/report/privacy/pro verification/revue animaux modifies pour journaliser les actions sensibles.
- `backend/bootstrap/app.php`, `backend/routes/api.php`, `backend/lang/fr/messages.php`, `backend/lang/ar/messages.php`, `backend/lang/en/messages.php` modifies.
- `frontend/src/api/adminUsers.js`, `frontend/src/api/moderationActions.js`, `frontend/src/api/adminContentModeration.js`, `frontend/src/api/adminExports.js` crees.
- `frontend/src/pages/AdminUsersPage.jsx` cree.
- `frontend/src/pages/AdminModerationActionsPage.jsx` cree.
- `frontend/src/App.jsx`, `frontend/src/layouts/Layout.jsx`, `frontend/src/pages/AdminModerationPage.jsx`, `frontend/src/pages/AdminStatsPage.jsx`, `frontend/src/pages/AdminProfessionalVerificationsPage.jsx`, `frontend/src/lib/i18n.js` modifies.
- `docs/ADMIN_GOVERNANCE_NOTES.md` cree.
- `AUDIT_I18N_UI_MOBILE_YAZOO.md` regenere par l'audit i18n.

### Phase 5

- Phase PWA, SEO, accessibilite et documentation INDH finale terminee localement.
- Lecture de la roadmap, presentation commission, securite partage, notes CNDP, ONSSA et gouvernance admin effectuee avant modification.
- Inspection de `frontend/index.html`, `frontend/public`, `frontend/src/App.jsx`, `frontend/src/layouts/Layout.jsx`, pages publiques, `Footer.jsx` et `frontend/src/lib/i18n.js` effectuee.
- `frontend/public/manifest.webmanifest` cree.
- `frontend/public/sw.js` cree.
- `frontend/public/robots.txt` cree.
- `frontend/public/sitemap.xml` cree.
- `frontend/src/pages/AccessibilityPage.jsx` cree.
- `frontend/src/pages/ImpactPage.jsx` cree.
- `frontend/index.html` modifie avec manifest, theme color, meta description, OpenGraph et Twitter card.
- `frontend/src/main.jsx` modifie pour enregistrer le service worker en build production.
- `frontend/src/App.jsx` modifie avec les routes `/accessibility` et `/impact`.
- `frontend/src/components/ui/Footer.jsx` modifie avec les liens Accessibilite et Impact.
- `frontend/src/components/ui/PublicPageShell.jsx`, `frontend/src/layouts/Layout.jsx`, `frontend/src/pages/ContactPage.jsx` et `frontend/src/index.css` modifies pour le skip link et `main-content`.
- `frontend/src/lib/i18n.js` modifie avec les cles FR/AR/EN Phase 5.
- `docs/SEO_NOTES.md` cree.
- `docs/ACCESSIBILITY_CHECKLIST.md` cree.
- `docs/INDH_DOSSIER_TECHNIQUE.md` cree.
- `docs/INDH_PLAN_ACTION.md` cree.
- `docs/INDH_RISKS_AND_COMPLIANCE.md` cree.
- `docs/PRODUCTION_CHECKLIST.md` cree.
- `AUDIT_I18N_UI_MOBILE_YAZOO.md` regenere par l'audit i18n.

## 6. Migrations creees

### Phase 1

Aucune migration creee ou appliquee.

### Phase 2

Migrations creees et appliquees localement via Docker:

- `2026_06_30_190000_create_privacy_consents_table` - batch 4, Ran.
- `2026_06_30_190100_create_data_deletion_requests_table` - batch 4, Ran.

### Phase 3

Migrations creees et appliquees localement sur MySQL Docker:

- `2026_06_30_200000_create_professional_verifications_table` - batch 5, Ran.
- `2026_06_30_200100_add_compliance_fields_to_animals_table` - batch 5, Ran.

### Phase 4

Migrations creees et appliquees localement sur MySQL Docker apres rebuild local de l'image backend:

- `2026_07_01_000000_create_moderation_actions_table` - batch 6, Ran.
- `2026_07_01_000100_add_moderation_fields_to_users_table` - batch 6, Ran.
- `2026_07_01_000200_add_moderation_fields_to_content_tables` - batch 6, Ran.

### Phase 5

Aucune migration creee ou appliquee. La phase concerne le frontend, les assets publics et la documentation.

## 7. Tests executes

### Phase 1

- `npm run lint` dans `frontend`: OK.
- `npm test -- --run` dans `frontend`: OK, 11 fichiers, 26 tests.
- `npm run build` dans `frontend`: OK.
- `node scripts/audit-i18n.mjs`: OK, 881 cles detectees, 0 texte statique suspect.

### Phase 2

- `php artisan migrate` depuis Windows: annule par Laravel car l'application est detectee en production et demande une confirmation interactive. `.env` non modifie.
- Migration appliquee localement via Docker avec backend monte et `php artisan migrate --force`: OK.
- `php artisan test` dans `backend`: OK, 99 tests, 573 assertions.
- `npm run lint` dans `frontend`: OK.
- `npm test -- --run` dans `frontend`: OK, 11 fichiers, 26 tests.
- `npm run build` dans `frontend`: OK.
- `node scripts/audit-i18n.mjs`: OK, 927 cles detectees, 0 texte statique suspect.

### Phase 3

- `php artisan migrate` depuis Windows: annule par Laravel car l'application est detectee en production et demande une confirmation interactive. `.env` non modifie.
- `php artisan migrate` depuis Windows utilise le MySQL Docker publie sur `DB_HOST=127.0.0.1` et `DB_PORT=3308`.
- Migration appliquee localement via Docker apres copie des deux fichiers de migration dans le conteneur Laravel qui ne monte pas le code applicatif local: OK, batch 5.
- `docker exec yazoo-app-1 php artisan migrate:status`: OK, migrations Phase 3 Ran.
- `php artisan test` dans `backend`: OK, 103 tests, 591 assertions.
- `npm run lint` dans `frontend`: OK.
- `npm test -- --run` dans `frontend`: OK, 11 fichiers, 26 tests.
- `npm run build` dans `frontend`: OK.
- `node scripts/audit-i18n.mjs`: OK, 977 cles detectees, 0 texte statique suspect.

### Phase 4

- `php artisan migrate` depuis Windows: annule par Laravel car l'application est detectee en production et demande une confirmation interactive. `.env` non modifie.
- `php artisan test --filter=AdminUserModerationTest`: OK, 4 tests, 9 assertions.
- `php artisan test --filter=AdminContentModerationTest`: OK, 1 test, 4 assertions.
- `php artisan test --filter=AdminModerationActionTest`: OK, 1 test, 3 assertions.
- `php artisan test --filter=AdminExportTest`: OK, 2 tests, 5 assertions.
- `php artisan test` dans `backend`: OK, 111 tests, 612 assertions.
- `npm run lint` dans `frontend`: OK.
- `npm test -- --run` dans `frontend`: OK, 11 fichiers, 26 tests.
- `npm run build` dans `frontend`: OK.
- `node scripts/audit-i18n.mjs`: OK, 1021 cles detectees, 0 texte statique suspect.
- `docker compose build app queue`: OK, image backend locale reconstruite avec le code Phase 4.
- `docker compose up -d app queue`: OK, services backend locaux recrees sans suppression de volumes.
- `docker exec yazoo-app-1 php artisan migrate --force`: OK, rien a migrer car les migrations Phase 4 etaient deja appliquees au demarrage du conteneur reconstruit.
- `docker exec yazoo-app-1 php artisan migrate:status`: OK, migrations Phase 4 batch 6 Ran.

### Phase 5

- Aucune migration lancee; non necessaire pour PWA/SEO/accessibilite/documentation.
- `php artisan test` dans `backend`: OK, 111 tests, 612 assertions.
- `npm run lint` dans `frontend`: premier passage KO sur commentaire global inutile dans `sw.js`, corrige.
- `npm run lint` dans `frontend`: OK apres correction.
- `npm test -- --run` dans `frontend`: OK, 11 fichiers, 26 tests.
- `npm run build` dans `frontend`: OK.
- `node scripts/audit-i18n.mjs`: OK, 1024 cles detectees, 0 texte statique suspect.
- Controle HTTP Vite preview local `127.0.0.1:4174`: OK 200 sur `/`, `/about`, `/privacy`, `/cgu`, `/rules`, `/partner`, `/pros`, `/demo-mobile`, `/accessibility`, `/impact`, `/contact`, `/settings/privacy`, `/settings/professional-verification`, `/admin/users`, `/admin/moderation-actions`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`.

## 8. Points non termines

- Phase 5 terminee localement; aucune phase supplementaire n'a ete lancee.
- Remplacer les placeholders administratifs restants par les informations reelles avant production ou depot officiel: statut juridique, adresse officielle, ICE si disponible.
- Renforcer le stockage prive des documents professionnels/animaux avant production publique.
- Finaliser les procedures humaines de traitement privacy/admin avant production reelle.
- Remplacer le domaine Azure du sitemap par un domaine officiel personnalise si YaZoo en adopte un.
- Completer les audits humains PWA, SEO, accessibilite et securite avant production reelle.
- Verifier les contacts CNDP avant publication officielle; responsable et email sont renseignes.

## 9. Decisions prises

- Travail strictement local dans `C:\Users\seef7\OneDrive\Desktop\YaZoo`.
- Aucune modification de `.github`, `deploy/*.ps1`, `.env`, `.env.production`, secrets ou parametres production.
- Aucun `migrate:fresh`, `migrate:refresh`, `migrate:reset`.
- Aucun fichier local sensible ou backup ne sera supprime pendant cette phase.
- Les pages legales existantes seront enrichies via le systeme i18n et `PublicPageShell`, sans reconstruire l'architecture.
- La page `/about` porte les mentions legales connues et conserve seulement les champs non confirmes: statut juridique, adresse officielle et ICE; aucune route `/legal-notice` separee n'a ete ajoutee en phase 1.
- Le scan local a confirme la presence de sauvegardes et logs a exclure du partage: `infra/backups`, `backend/storage/logs`, fichiers `.sql.gz`, `.zip`, `.log`.
- Phase 2: les IP et user-agents de consentement sont haches, pas stockes en clair.
- Phase 2: l'export exclut les messages prives complets pour ne pas exposer les donnees d'autres utilisateurs.
- Phase 2 puis durcissement 2026: la demande est initiee par l'utilisateur et
  traitee par un administrateur; sa completion execute desormais le service
  transactionnel de suppression/anonymisation et ne peut plus etre seulement
  marquee manuellement.
- Phase 2: une API admin minimale de suivi des demandes de suppression existe; la Phase 4 a ajoute la journalisation admin associee.
- Phase 3: ne pas presenter YaZoo comme autorite ONSSA; utiliser des mentions prudentes comme informations de conformite, documents en cours de verification et professionnel verifie par l'administration YaZoo.
- Phase 3: les champs documentaires animaux et professionnels restent des references texte; aucun upload prive documentaire n'a ete introduit pour eviter un stockage dangereux premature.
- Phase 3: les nouvelles annonces animaux sont creees en `pending_review`; les anciennes annonces restent compatibles avec des valeurs par defaut.
- Phase 3: le conteneur Docker local `yazoo-app-1` utilise une image sans montage complet du code local; les migrations Phase 3 ont ete copiees dans le conteneur pour appliquer la base sans reconstruire ni deployer.
- Phase 4: la coherence Docker/code local a ete corrigee par `docker compose build app queue` puis recreation locale de `app` et `queue`; aucune copie de migration seule n'a ete utilisee.
- Phase 4: le middleware admin centralise est applique aux routes admin; les anciens checks inline peuvent rester en defense supplementaire.
- Phase 4: les utilisateurs suspendus/bannis sont bloques sur les principales routes d'ecriture sans bloquer login/logout/profil.
- Phase 4: les exports CSV excluent mots de passe, tokens et secrets; les IP/user-agents de moderation sont haches.
- Phase 5: le service worker reste prudent et ne cache pas les routes API ni les donnees privees.
- Phase 5: YaZoo est presente comme base technique preparee pour une demarche de conformite, pas comme projet totalement conforme CNDP/ONSSA.
- Phase 5 (historique): l'ancien sitemap utilisait le domaine Azure decommissionne. Le sitemap absolu est desormais genere uniquement avec `VITE_SITE_URL` une fois un domaine public verifie.

## 10. Confirmation de securite locale

- Aucun deploiement Azure effectue.
- Aucun push GitHub effectue.
- Aucune image DockerHub poussee.
- Aucun secret modifie.
- Aucune donnee supprimee.
