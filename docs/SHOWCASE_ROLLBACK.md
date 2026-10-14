# Retour arrière showcase

À remplir avant chaque cutover : service Render/deploy ID, référence complète de l'image précédente **et digest obtenus dans le compte**, Pages production deployment ID précédent, SHA frontend, noms des variables changées, sauvegarde DB et preuve de restauration isolée. Ne jamais copier leurs valeurs secrètes.

Le backend public observé le 14 octobre annonce `15af09af532b0b2bfa2f030766405ba0ca75abf4`. Référence candidate précédente à vérifier : `docker.io/5eef/yazoo-api-demo:15af09af532b0b2bfa2f030766405ba0ca75abf4`. Ce n'est pas une attestation du digest Render. Les images 829f44/monolithe citées dans l'ancien runbook sont historiques, pas le rollback automatiquement sélectionné.

Déclencheurs : fuite de données, double réservation, corruption, échec de démarrage/readiness persistant, authentification ou parcours critique rompu. Avant publication obtenir l'autorisation de rollback dans le périmètre du cutover. Conserver les logs sans PII et stopper les mutations de test.

1. Revenir au deployment Pages précédent si le frontend est en cause et compatible avec l'API actuelle.
2. Revenir à l'image Render précédente enregistrée si l'API est en cause. Conserver APP_KEY et paramètres de la même base, sans reseed/reset.
3. Vérifier `/health/live`, `/health/ready`, version, statut Pages, CSRF/session, profil, disponibilités, média. Réserver/envoyer seulement avec autorisation spécifique sur les comptes fictifs.
4. Ne jamais lancer `migrate:rollback`, `migrate:fresh`, restauration DB ou suppression de bucket pour un incident applicatif. Le rollback de code ne restaure pas le schéma ni les données. Les modifications locales actuelles n'ajoutent aucune migration.
5. Si une migration ultérieure empêche l'ancienne image de fonctionner : arrêter le cutover et préparer un correctif compatible ; restauration de données uniquement après estimation des pertes et autorisation explicite, avec sauvegarde préalable de l'état incident.

Sans références de comptes confirmées et sauvegarde restaurable, le plan est préparé mais son exécution n'est pas validée. Aucun rollback public effectué pendant cet audit.

## Référence Pages confirmée dans le compte

Production précédente : 83e6275f-071e-4bc9-8cad-e9e1fb5284d1, branche startup-2026, SHA 15af09af532b0b2bfa2f030766405ba0ca75abf4. Le digest Render reste à relever avant cutover ; aucune restauration SQL autorisée.
