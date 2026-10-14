# Conditions de sécurité du lancement réel

État : contrôles de code partiels ; aucune autorisation de lancement commercial. Références : SECURITY_REVIEW.md, COMMERCIAL_READINESS_AUDIT.md, CNDP_DATA_MAP.md. Cocher uniquement avec une preuve datée et le responsable.

- [ ] Environnements DB/buckets/comptes/APP_KEY indépendants ; aucune identité AFWAJ ni credential showcase en production.
- [ ] Secrets uniquement dans les gestionnaires des fournisseurs ; permissions minimales, rotation testée, caches Laravel recréés côté serveur ; aucune valeur dans logs/artefacts/backups non chiffrés.
- [ ] HTTPS, cookies Secure/HttpOnly/SameSite, CSRF et origine Web, révocation mobile et session après logout testés sur le domaine réel. OAuth/recovery et expiration vérifiés.
- [ ] MFA admin imposée et challenge récent, aucune exception prod de test, revue des rôles et suppression des administrateurs inutiles.
- [ ] Matrice IDOR : autre utilisateur vs documents, messages, rendez-vous, commandes, paiements, export ; aucune URL signée ou asset générique ne contourne les droits professionnels.
- [ ] Upload MIME/taille/extension, scan antivirus selon politique, quotas, bucket privé, Range vidéo, parent supprimé/expiré/audience ; tests réels R2 isolés et persistance après restart.
- [ ] Rate limits auth/API/uploads/messages et limites ressources ; pas de Metro/Vite ni outils de debug exposés.
- [ ] Paiement OFF jusqu'au kit officiel, signatures/montants/devise/identité/idempotence/replay testés, débit/remboursement uniquement sandbox homologuée. État « authorized » vs « captured » à qualifier avec PSP avant intégration officielle.
- [ ] Démarrage/preflight et migration verrouillée, cible DB host/port/name exacte, TLS et allowlist ; migrations compatibles ancienne/nouvelle application, aucun `fresh`/reset.
- [ ] Dépendances : Composer audit, npm runtime, exceptions tooling documentées et limitées, image HIGH/CRITICAL contrôlée, Gitleaks et CI sur SHA exact.
- [ ] Logs sans PII/secrets, request ID, erreurs 5xx sans stack, sauvegardes chiffrées et restore isolé prouvé ; suppression/export avec rétention et purge des copies définies.
- [ ] Scheduler/worker durables, alertes heartbeat/queue/backup/erreurs, propriétaire d'incident et canal support surveillés.
- [ ] Pentest ciblé OWASP et charge représentative indépendants ; les suites automatisées actuelles ne sont pas une certification exhaustive.

Le correctif local du 14 octobre refuse les callbacks « paid » au montant/devise absent ou incompatible. Il ne certifie pas CMI. Aucune checklist cochée sur la seule foi de cette correction.
