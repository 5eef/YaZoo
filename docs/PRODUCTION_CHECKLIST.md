# YaZoo - Checklist production et depot

## Secrets et configuration

- [ ] Aucun `.env` dans le depot ou ZIP public.
- [ ] `APP_KEY` production generee et protegee.
- [ ] Secrets stockes dans un coffre adapte.
- [ ] Variables frontend production verifiees.
- [ ] OAuth Google configure avec domaines corrects.
- [ ] SMS OTP configure avec limites et journalisation.

## Base de donnees

- [ ] Migrations testees sans `migrate:fresh`.
- [ ] Backups automatiques planifies.
- [ ] Restauration testee.
- [ ] Comptes DB a privileges limites.
- [ ] Donnees de test nettoyees legalement.

## Securite applicative

- [ ] HTTPS force.
- [ ] Cookies secure/same-site en production.
- [ ] CORS limite aux domaines officiels.
- [ ] Rate limiting auth/OTP.
- [ ] Middleware admin actif.
- [ ] Utilisateurs suspendus limites sur actions sensibles.
- [ ] Exports sans secrets.
- [ ] Logs sans donnees sensibles.

## CNDP / Loi 09-08

- [x] Responsable du traitement complete: Youssef BOUGHIOUL.
- [x] Contact donnees personnelles complete: bough.youssef@gmail.com.
- [ ] Statut juridique, adresse officielle et ICE completes si disponibles.
- [ ] Formalite CNDP evaluee.
- [ ] Politique privacy validee.
- [ ] Durees de conservation validees.
- [ ] Procedure suppression/rectification/opposition documentee.
- [ ] Registre des consentements actif.

## ONSSA / marketplace animaux

- [ ] Textes valides juridiquement.
- [ ] Procedure verification pro documentee.
- [ ] Moderation annonces sensibles active.
- [ ] Stockage prive documents pret.
- [ ] Formation moderateurs.
- [ ] Contact autorites competentes defini si besoin.

## Admin et gouvernance

- [ ] Roles admin verifies.
- [ ] Historique moderation consulte regulierement.
- [ ] Exports CSV controles.
- [ ] Suspension sans suppression privilegiee.
- [ ] Procedure de reclamation active.
- [ ] Journalisation retention definie.

## Tests et qualite

- [x] `php artisan test` OK. Preuve Phase 4A: suite backend complete relancee localement.
- [x] `npm run lint` OK. Preuve Phase 4A: ESLint frontend relance localement.
- [x] `npm test -- --run` OK. Preuve Phase 4A: deux runs Vitest consecutifs requis.
- [x] `npm run build` OK. Preuve Phase 4A: build Vite production relance localement.
- [x] Audit i18n OK. Preuve Phase 4A: audit local sans texte statique suspect.
- [ ] Tests manuels mobile.
- [ ] Tests RTL arabe.
- [ ] Tests dark/light.

## PWA / SEO / accessibilite

- [ ] Manifest verifie.
- [ ] Service worker prudent.
- [ ] Robots.txt verifie.
- [ ] Sitemap avec domaine final.
- [ ] Meta par route ou prerender planifie.
- [ ] Skip link actif.
- [ ] Focus visible.
- [ ] Audit WCAG manuel.
- [ ] Tests lecteur d'ecran.

## Monitoring et exploitation

- [ ] Monitoring erreurs.
- [ ] Alertes disponibilite.
- [ ] Rotation logs.
- [ ] Plan incident.
- [ ] Plan sauvegarde/restauration.
- [ ] Documentation exploitation.
- [ ] Support utilisateur FR/AR.

## Depot INDH

- [ ] ZIP propre genere.
- [ ] `.git`, `.env`, logs, backups exclus.
- [ ] Dossier technique joint.
- [ ] Plan action joint.
- [ ] Risques et conformite joints.
- [ ] Captures ou demo locale preparees.

## Lecture Phase 4A preproduction

| Domaine | Statut | Preuve | Prochaine action |
| --- | --- | --- | --- |
| Backend automated tests | Valide localement | `php artisan test` | Rejouer avant chaque release preproduction. |
| Frontend lint/test/build | Valide localement | `npm run lint`, deux runs `npm test -- --run`, `npm run build` | Ajouter E2E Playwright en Phase 4B. |
| i18n FR/AR/EN | Valide localement | `node scripts/audit-i18n.mjs` | Revue manuelle RTL/mobile. |
| Sonar hotspots | Revue documentee | `docs/SONAR_SECURITY_REVIEW.md` | Reanalyse Sonar avec token local puis qualification dans UI. |
| Monitoring externe | Prepare, non actif | Variables exemple + `docs/MONITORING_AND_ALERTING.md` | Activer via Azure App Settings apres choix Sentry/App Insights. |
| CMI production | Non valide | CMI reste desactive | Attendre kit/sandbox officiel et recette bancaire. |
| CNDP officielle | Non valide juridiquement | Dossier technique seulement | Validation juridique/comptable. |
| ONSSA officielle | Non valide juridiquement | Formulations prudentes | Validation administrative et procedure officielle si necessaire. |
| Backup restore | Non teste | Documentation seulement | Executer test de restauration preproduction. |
