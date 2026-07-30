# Rapport des corrections gratuites YaZoo 2026

Date de validation locale : 30 juillet 2026
Branche : `fix/free-production-readiness`

## 1. Résumé exécutif

La mission a été réalisée comme une correction du produit, et non comme un audit documentaire. Les problèmes P0 confirmés ont été corrigés, puis les parcours de récupération de compte, de vérification email et de MFA TOTP administrateur ont été ajoutés. Un MVP complet de rendez-vous vétérinaires, des KPI internes honnêtes, des gardes d’accessibilité, un export INDH sûr et des contrôles d’exploitation ont également été implémentés.

La validation locale finale est verte : 295 tests Laravel (1 516 assertions), 103 tests Vitest, 97 scénarios Playwright dont 8 scénarios axe, build frontend, images Docker et pile Docker isolée. Aucun déploiement, merge, changement de secret ou changement Azure n’a été effectué.

## 2. État Git initial

- Branche de travail trouvée et conservée : `fix/free-production-readiness`.
- HEAD initial : `a95bf73d7adff11ab7d698747d3afecee377c357`.
- `main` initial : `88bcd0d966fcb240548da07d1cb3f398c82d5346`.
- `origin/main` initial : `88bcd0d966fcb240548da07d1cb3f398c82d5346`.
- Avance initiale de la branche sur `main` : 11 commits.
- Worktree initial : propre.
- `git diff --check` initial : réussi.
- `AUDIT_COMPLET_YAZOO_STARTUP_INDH_2026.md` : présent et laissé intact.

## 3. Problèmes confirmés

- Les ressources marketplace pouvaient reprendre les coordonnées du compte au lieu d’un choix explicite propre à l’annonce.
- Les pages juridiques n’exploitaient pas toutes la configuration publique et contenaient des formulations de remplacement.
- `PostController::store` pouvait écrire un média avant la fin des contrôles et ne garantissait pas son nettoyage après une erreur DB.
- Plusieurs validateurs et types acceptaient des langues non supportées par l’interface.
- Aucun export INDH reproductible ne contrôlait le contenu final de l’archive.
- Le parcours mot de passe oublié, la vérification email et la MFA TOTP administrateur étaient absents.
- Il n’existait pas de workflow structuré de rendez-vous vétérinaire.
- Le dashboard admin ne fournissait pas l’ensemble des KPI demandés avec période, médiane et sémantique GMV.
- Les parcours essentiels n’avaient pas de garde axe multi-thème, multi-locale et responsive.
- Le déploiement ne bloquait pas explicitement une configuration App Service sans stockage persistant.
- Reverb était configuré comme diffuseur, mais le package et le service d’exécution manquaient. Le premier smoke test Docker a aussi confirmé que l’image PHP avait besoin de `pcntl`.

## 4. Problèmes non confirmés

- Les paiements manuels possédaient déjà idempotence, audit, notes, protection des transitions et protection contre les callbacks tardifs. Ils ont été conservés, et la confirmation admin a été raccordée à la MFA lorsqu’elle est enrôlée.
- Le contrôle OAuth `state`, les refus des comptes bannis/suspendus et les variables de redirection Google étaient déjà présents et couverts par mocks.
- L’OTP existant ne journalisait ni code ni téléphone complet et échouait fermé en production sans fournisseur réel.
- Le preflight SMTP interdisait déjà `log` et `array` en production.
- Aucun fonctionnement réel Google OAuth, SMTP, SMS, CMI ou WebSocket Azure n’a été déduit des tests locaux.

## 5. Fichiers créés

Les fichiers créés sont regroupés ci-dessous par fonction.

- Confidentialité : `backend/app/Support/MarketplaceContact.php`, migration `000100`, `MarketplaceContactPrivacyTest.php`.
- Compte : `AccountRecoveryToken.php`, `AccountSecurityService.php`, les deux Form Requests de réinitialisation, `AccountRecoveryMail.php`, `VerifyEmailMail.php`, les deux vues email, migration `000200`, `AccountSecurityTest.php`, `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`.
- MFA : `Totp.php`, `AdminMfaService.php`, `AdminMfaController.php`, `EnsureAdminMfaVerified.php`, migration `000300`, `AdminMfaTest.php`, `AdminSecurityPage.jsx`.
- Rendez-vous : contrôleur, policy, ressource, notification, trois Form Requests, trois modèles, migration `000400`, `VeterinarianAppointmentApiTest.php`, API et page React des rendez-vous.
- KPI : `BusinessKpiService.php`, migration `000500`, `AdminBusinessKpiTest.php`.
- Juridique : `useLegalConfig.js`, `LegalConfigurationSummary.jsx`, `LegalPages.test.jsx`, `check-legal-placeholders.mjs`.
- Exploitation : `DiagnosePersistentStorage.php`, `config/reverb.php`, `ACCESSIBILITY.md`, `AZURE_MEDIA_PERSISTENCE.md`, `REDIS_REVERB_OPERATIONS.md`.
- Accessibilité : `frontend/e2e/accessibility.spec.js`.
- Langues : `SupportedLocaleTest.php`.
- INDH : `scripts/export-indh.ps1`, `scripts/test-export-indh.ps1`, `docs/INDH_EXPORT.md`.
- Présent rapport : `docs/RAPPORT_CORRECTIONS_GRATUITES_YAZOO_2026.md`.

## 6. Fichiers modifiés

Les modifications concernent :

- CI/CD et conteneurs : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `docker-compose.yml`, `backend/Dockerfile`, les exemples d’environnement backend.
- Backend : preflight, santé, providers, bootstrap, routes, configurations app/auth/operations, modèles User/Animal/Product/ServiceListing/Veterinarian, ressources et services marketplace, contrôleurs Auth/Profile/Post/Payment/ServiceListing/AdminStats/AdminExport, Form Requests et traductions FR/AR/EN.
- Dépendances backend : `backend/composer.json`, `backend/composer.lock`.
- Frontend : `package.json`, lockfile, routeur, layout, i18n, API auth/admin/export, types utilisateur, formulaires et hooks marketplace, pages login/contact/services/réservations/stats, composants Footer/PublicPageShell/CreatePost/VeterinarianCard.
- Tests existants adaptés : feed, santé, opérations, pages marketplace et smoke public Playwright.

La liste Git exacte reste vérifiable avec `git show --name-status` sur les commits de cette branche.

## 7. Migrations ajoutées

1. `2026_07_30_000100_add_explicit_contact_visibility_to_marketplace_listings.php`
2. `2026_07_30_000200_create_account_recovery_tokens_table.php`
3. `2026_07_30_000300_add_totp_mfa_to_users_table.php`
4. `2026_07_30_000400_create_veterinary_appointments_tables.php`
5. `2026_07_30_000500_add_business_kpi_indexes.php`

Elles sont additives et réversibles. Aucune commande destructive de migration n’a été utilisée.

## 8. Corrections confidentialité

- Contact par défaut : `messages_only`.
- Coordonnées de compte retirées des ressources d’autres utilisateurs.
- Téléphone/email/WhatsApp possibles uniquement avec choix et valeur propres à l’annonce.
- Coordonnées masquées pour les catalogues publics, même sur une annonce approuvée.
- Valeurs d’édition/modération accessibles uniquement au propriétaire ou à l’administrateur.
- Validation et rendu centralisés pour animaux, produits et services.
- Formulaires et traductions expliquent que la messagerie YaZoo est recommandée.
- Tests dédiés : 4 tests, 31 assertions.

## 9. Corrections juridiques

- Chargement unique et mis en cache de `/api/legal/config`.
- Réutilisation sur les pages publiques, le footer et le contact.
- Lignes absentes masquées sans inventer d’entité, adresse, ICE ou statut.
- Preflight renforcé pour les champs légaux obligatoires.
- Test de build interdisant les placeholders juridiques.
- Tests FR/AR/EN et RTL : 6 tests frontend.

## 10. Récupération de compte et vérification email

- Réponse générique anti-énumération.
- Jetons aléatoires stockés hachés, expirables et à usage unique.
- Rate limiting par route et identifiant.
- Nouveau mot de passe robuste et révocation de tous les tokens Sanctum.
- Canal email via Laravel et téléphone via le broker OTP existant.
- URL de vérification signée et expirante, renvoi limité.
- Une modification d’email retire la vérification et révoque les sessions.
- Google ne marque l’email vérifié qu’après un retour fournisseur validé par le flux mocké.
- Tests : 5 tests, 41 assertions, avec `Mail::fake()` et broker OTP fake.
- La livraison réelle email/SMS n’a pas été testée.

## 11. MFA administrateur

- TOTP compatible URI `otpauth://`.
- Secret chiffré en base et jamais réexposé après confirmation.
- Codes de récupération montrés une fois puis stockés hachés.
- Challenge récent exigé sur les opérations sensibles.
- Désactivation et régénération protégées par mot de passe/TOTP.
- Rate limiting et audit d’activation/désactivation.
- Déploiement progressif conservé avec `ADMIN_MFA_ENFORCED=false`.
- Le preflight refuse l’activation forcée sans administrateur réellement enrôlé et muni de codes.
- Tests : 4 tests, 26 assertions.

## 12. Rendez-vous vétérinaires

- Créneaux non chevauchants gérés par le vétérinaire.
- Réservation transactionnelle avec verrouillage et prévention des doublons.
- Statuts : `pending`, `confirmed`, `rejected`, `cancelled`, `completed`.
- Accès limité aux participants ; transitions et annulations contrôlées.
- Notifications internes uniquement.
- Avis limité au client après rendez-vous terminé, une seule fois.
- Aucune donnée médicale superflue et aucune intégration calendrier/paiement.
- API, page React responsive, RTL/dark et traductions FR/AR/EN.
- Tests : 3 tests, 19 assertions.

## 13. KPI métier

- Filtres 7, 30 et 90 jours.
- Cache de cinq minutes.
- Utilisateurs actifs fondés sur les journaux d’activité existants.
- Professionnels, annonces, modération moyenne/médiane, réservations, GMV, vendeurs, acheteurs, avis, signalements, suppressions et rendez-vous.
- Le GMV n’est jamais nommé revenu ; le revenu YaZoo est explicitement `not_measured`.
- Export CSV utilisant les mêmes calculs et neutralisant les formules de tableur.
- Index DB ajoutés pour les requêtes critiques.
- Tests : 3 tests, 14 assertions.

## 14. Accessibilité

- `@axe-core/playwright` ajouté.
- Huit scénarios représentatifs : public, auth, feed, marketplace et admin ; mobile/desktop ; clair/sombre ; FR/AR RTL.
- Seuil bloquant initial : violations axe critiques ou sérieuses.
- Contrôles additionnels de clavier et de débordement horizontal.
- Une région scrollable du créateur de publication a reçu rôle, nom accessible et focus clavier.
- Suite Playwright complète : 97/97, dont 8/8 axe.

## 15. Stockage Azure

- `startup.sh` utilise déjà `/home/site/yazoo-storage`.
- Inspection Azure en lecture seule : les deux App Services existaient et étaient démarrés au moment du contrôle.
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true` a été observé sur les réglages filtrés ; `MEDIA_STORAGE_DRIVER=filesystem` a également été observé.
- Aucun réglage Azure n’a été modifié.
- Le workflow bloque un déploiement si le stockage App Service n’est pas explicitement persistant.
- Le preflight et `/health/ready` appliquent une règle cohérente.
- La commande `yazoo:diagnose-storage --write-test` réalise un test aléatoire lecture/écriture puis supprime son seul fichier de test.
- L’inventaire de `/home/site/yazoo-storage` et la sauvegarde des médias existants n’ont pas pu être vérifiés : la version locale de `az webapp ssh` ne supportait pas l’option de commande distante utilisée. L’activation ou toute modification future reste donc bloquée jusqu’à sauvegarde vérifiée et autorisation.

## 16. Redis/Reverb/queues

- Package Laravel Reverb ajouté et origines autorisées restreintes.
- Services Docker séparés pour queue, scheduler et Reverb.
- Heartbeats queue/scheduler intégrés à `/health/ready`.
- Contrôle TCP Reverb optionnel sans exposition de secrets.
- L’image backend compile désormais `pcntl`, requis par Reverb.
- Pile isolée vérifiée avec MySQL `13308`, Redis `16379`, API `19000`, frontend `19417`, Reverb `18081`.
- Huit conteneurs sains ; API live et ready à 200 ; frontend à 200 ; Reverb sain (un HEAD HTTP retourne normalement 404 sur le serveur WebSocket).
- Les conteneurs et le réseau de test ont été arrêtés/supprimés. Les volumes de test ont volontairement été conservés.
- Le WebSocket de production Azure n’a pas été testé.

## 17. Export INDH

- Script PowerShell avec staging isolé, exclusions explicites et refus d’écrasement.
- Manifeste inclus, ZIP rouvert et contrôlé après création.
- Échec immédiat en cas de chemin interdit.
- Aucun contenu de secret n’est lu ou affiché.
- Auto-test : réussi.
- Mode opératoire documenté dans `docs/INDH_EXPORT.md`.

## 18. Résultats exacts des tests

| Contrôle | Résultat final |
|---|---:|
| `composer validate --strict` | réussi |
| `composer audit --locked --no-interaction` | 0 avis |
| `php artisan route:list` | réussi |
| `php artisan test` | 295 tests, 1 516 assertions |
| `composer test:coverage` | 295 tests, 1 516 assertions |
| Syntaxe PHP | 354 fichiers valides |
| Pint | réussi |
| `npm ci` | réussi, 341 paquets audités |
| `npm audit` | 0 vulnérabilité |
| `npm audit --omit=dev` | 0 vulnérabilité |
| ESLint | réussi |
| TypeScript `--noEmit` | réussi |
| Audit i18n | 1 930 clés identiques FR/AR/EN |
| Vitest | 29 fichiers, 103 tests |
| Couverture Vitest | 29 fichiers, 103 tests |
| Build Vite | 302 modules, réussi |
| Placeholders juridiques dans le build | aucun |
| Playwright | 97 tests réussis |
| axe | 8 tests, aucune violation critique/sérieuse |
| `docker compose config --quiet` | réussi |
| Images backend/frontend | construites |
| Pile Docker isolée | huit services sains |
| `/health/live` et `/health/ready` isolés | HTTP 200 |
| Auto-test export INDH | réussi |
| Gardes de release | réussi |
| `git diff --check` | réussi |

Un premier passage Playwright avait 96 succès et un échec parce qu’un ancien test ne mockait pas le nouvel endpoint légal. Le mock a été ajouté sans affaiblir les assertions, puis les 97 tests ont réussi. Le premier démarrage Reverb a révélé l’absence de `pcntl`; l’image a été corrigée, reconstruite et retestée saine.

## 19. Couverture avant/après

Il n’existait pas de mesure de référence exploitable avant la mission ; aucune valeur « avant » n’est inventée.

Après corrections :

- Backend : 221 fichiers ; 7323/8682 statements (84,35 %), 687/970 méthodes (70,82 %), 8010/9652 éléments (82,99 %).
- Frontend : 1023/1422 lignes (71,94 %) et 702/1254 branches (55,98 %). Le rapport Vitest indiquait aussi 71,80 % de statements et 68,09 % de fonctions.

## 20. État des vulnérabilités

- Composer : aucun avis de sécurité.
- npm, toutes dépendances : 0 vulnérabilité.
- npm, production uniquement : 0 vulnérabilité.
- Aucun `audit fix --force` n’a été utilisé.
- Aucun scan de registre externe ou attestation d’image de production n’a été simulé.

## 21. État Git final

La branche reste `fix/free-production-readiness`. Après les quatre commits de code, elle est 15 commits devant `main` (11 commits initiaux plus 4 nouveaux). Le seul fichier encore non suivi avant le commit documentaire final est le présent rapport. `git diff --check` est réussi et aucun fichier `.env` n’est suivi. Aucun merge vers `main` n’est prévu sans nouvelle autorisation.

## 22. Commits créés

- `f986691` — `feat(readiness): secure accounts and core workflows`
- `c8e0ceb` — `fix(operations): enforce persistent storage and Reverb readiness`
- `25a23c9` — `test(a11y): add automated accessibility gates`
- `5bb7afb` — `chore(indh): add safe reproducible project export`
- Le présent rapport est ajouté par le commit documentaire qui contient cette section.

Aucun `git add .`, reset destructif, push forcé ou ajout de `.env` n’a été utilisé.

## 23. État de la PR et de la CI

La PR n’a pas été créée et la CI distante n’a donc pas été exécutée. `gh` version 2.91.0 est installé, mais `gh auth status` signale que le jeton actif du compte GitHub est invalide. Conformément au workflow de publication sûr, aucun push n’a été tenté avec une authentification invalide. Reprise requise après `gh auth login -h github.com` réussi. Aucun merge ou déploiement n’a été lancé.

## 24. Éléments externes volontairement non activés

- CMI conservé désactivé ; aucun faux remboursement ou callback fabriqué.
- Aucun compte ou credential Google, SMTP, Twilio ou Orange créé/modifié.
- Aucun email ou SMS réel envoyé.
- Aucun domaine, analytics ou monitoring payant ajouté.
- Aucun Blob Storage ni ressource Azure créé.
- Aucun réglage de stockage Azure, redémarrage ou déploiement effectué.
- Aucun merge vers `main`.

## 25. Risques restants

- Sauvegarder, inventorier et tester la restauration des médias Azure avant tout changement de stockage.
- Configurer puis tester réellement SMTP, SMS et Google OAuth avec les credentials du propriétaire.
- Déployer et tester Redis/queue/scheduler/Reverb dans l’environnement Azure réel.
- Enrôler au moins un administrateur, conserver ses codes de récupération hors ligne, puis seulement envisager `ADMIN_MFA_ENFORCED=true`.
- Exécuter les nouvelles migrations sur un environnement de préproduction sauvegardé.
- Laisser la CI et SonarCloud distants valider les commits publiés.
- Réaliser une revue métier/juridique des valeurs de configuration, sans inventer les informations absentes.

## 26. Verdict

- **Prêt localement : oui.** Toutes les suites et la pile isolée sont vertes.
- **Prêt pour pilote : oui, sous conditions.** Appliquer les migrations sur une base sauvegardée et fournir les configurations externes nécessaires.
- **Prêt pour démonstration INDH : oui.** Export reproductible et contrôlé disponible.
- **Prêt pour production : non à ce stade.** Les preuves CI distante, sauvegarde/restauration Azure, livraison email/SMS/OAuth réelle et exploitation Redis/Reverb Azure restent à établir. Ce verdict n’est pas un échec du code local ; il respecte la règle de vérité et les dépendances externes explicitement exclues.
