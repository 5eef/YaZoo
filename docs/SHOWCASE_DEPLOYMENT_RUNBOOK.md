> Note de release unifiee du 23 octobre 2026 : ce document conserve des etats historiques. Les statuts actuels, preuves de livraison et limites DEMO/commercial figurent dans [docs/reports/RELEASE_REPORT.md](reports/RELEASE_REPORT.md). Les anciennes mentions « production ready » ne certifient pas une mise en service commerciale.

# Publication showcase — 14 octobre 2026

Statut : préparation locale ; aucune publication autorisée ou effectuée. Complète [DEMO_DEPLOYMENT_FREE.md](DEMO_DEPLOYMENT_FREE.md), sans remplacer ses paramètres par des suppositions. Les anciennes références d'image de ce document sont historiques.

## Point de départ et autorisations

- Local : `startup-2026`, `15af09af532b0b2bfa2f030766405ba0ca75abf4`, modifications non commitées.
- Après `git fetch origin`, la branche distante contient aussi `b5a89072905af7f590db4a6b1318f2ba865a4cb0` (patches Expo). Aucun merge effectué. Comparer ces deux fichiers mobile avant promotion ; un push direct depuis le HEAD actuel serait non fast-forward.
- Render public annonce encore `15af09af532b0b2bfa2f030766405ba0ca75abf4`. Le SHA annoncé ne prouve pas le digest réellement configuré.
- Autorisation propriétaire obligatoire avant commit/push, Docker Hub, modification Render/Pages, migrations publiques et tests publics créant rendez-vous/messages/uploads. Les lectures et tests locaux restent permis.

## Disponibilités au-delà de 14 jours

Le démarrage appelle la commande protégée `yazoo:refresh-showcase-availability`. Le service ne produit que trois créneaux par jour, par profil autorisé, sur les 14 jours suivants, hors dimanche. Verrous des parents SQL dans l'ordre des identifiants, transaction avec trois tentatives, vérification des chevauchements de créneaux et rendez-vous actifs. Il ne supprime aucun créneau et ne modifie aucun rendez-vous. Les historiques conservés croissent avec l'usage ; aucune purge implicite. L'horizon et le nombre de créations par exécution sont bornés.

Une tâche à 04:45 Africa/Casablanca existe maintenant uniquement pour le profil showcase avec bootstrap activé. Elle utilise `withoutOverlapping(30)` et `onOneServer`, avec la confirmation lue dans la configuration serveur. Les verrous SQL restent l'autorité en cas d'expiration des verrous de cache. Elle exige un scheduler effectivement exécuté et un cache partagé (ici database). Elle n'introduit ni endpoint HTTP de mutation ni génération sur GET.

**Render Free ne garantit pas le scheduler** : veille après inactivité, absence de shell et de one-off jobs. `YAZOO_RUN_SCHEDULER=false` reste la configuration recommandée par défaut ; ne pas ajouter de pings pour éviter la veille. Si le propriétaire autorise son activation, le scheduler fonctionne seulement pendant les périodes actives ; ne pas affirmer une exécution quotidienne garantie.

Procédure gratuite fiable sous contrôle humain : programmer un rappel hebdomadaire et avant chaque démonstration. Sur le service existant, après autorisation, déclencher un redémarrage contrôlé de la même image validée ; le démarrage renouvelle les créneaux. Lire le log `Showcase availability refreshed.` et consulter la fiche publique pour vérifier des dates futures, sans réserver. Si le conteneur n'a pas redémarré depuis sept jours, refaire cette opération. En cas de refus du guard, arrêter et vérifier la cible, jamais contourner la protection. Une exécution CLI sur une infrastructure autorisée peut utiliser `php artisan yazoo:refresh-showcase-availability` ; aucun shell Render Free n'est présumé disponible.

La clé database cache `yazoo:showcase-availability:last-success` et les logs succès/échec permettent le suivi opérateur. Ils ne constituent pas une alerte automatique. La confirmation, les mots de passe et exceptions détaillées ne sont pas journalisés.

## Release exacte, étapes après autorisation

1. Relire [RELEASE_READINESS.md](RELEASE_READINESS.md) et son inventaire. Réconcilier le commit distant mobile sans réécriture d'historique et sans toucher aux logos. Soumettre le résultat exact avant commit. Les cinq commits locaux historiques contiennent déjà des ressources de marque : leur promotion vers main doit être revue séparément de l'exclusion des deux changements logo actuels.
2. Committer uniquement les chemins du manifeste approuvé ; pas de `git add -A`. Publier la branche autorisée. Attendre CI/mobile/CodeQL/Gitleaks verts sur le SHA final. Le nouveau contrôle CI inclut l'image showcase et le parcours full-stack ; son exécution distante reste à faire.
3. Construire depuis un checkout isolé propre du commit autorisé, pas depuis ce worktree avec logos non committés : `docker build --platform linux/amd64 --build-arg APP_VERSION=<FULL_SHA> -f Dockerfile.api-demo -t 5eef/yazoo-api-demo:<FULL_SHA> .`. La candidate locale est seulement `local-release-candidate`.
4. Tester cette image sur une base éphémère, deux démarrages, migrations/bootstrap idempotents, preflight, santé, identité non-root, extensions, médias. Scanner HIGH/CRITICAL et produire un SBOM. Les bases PHP/Composer et versions d'extensions sont fixées dans le Dockerfile ; les paquets Alpine sont résolus lors du build, donc conserver le digest exact de l'artefact testé.
5. Publier via le workflow manuel `dockerhub-publish.yml` uniquement après autorisation. Il attend CI et refuse toute réutilisation de tag SHA existant ou réponse registre indéterminée. Un échec partiel de publication impose une nouvelle release revue, pas l'écrasement d'un tag. Conserver le digest publié et le SHA.
6. Lire dans Render l'image/digest actuels, variables (noms et propriétés seulement), dernier deploy, plan Free, port 8080, logs. Lire dans Pages le deployment ID et la branche de production réelle. **Ces paramètres de comptes ne sont pas établis par wrangler.toml ni par les GET publics.** Ne pas supposer que main ou startup-2026 publie automatiquement ; un push sur une branche de production peut déjà modifier le public et exige donc cette autorisation en amont.
7. Capturer les références de rollback et sauvegarde/restauration valide. Aucune nouvelle migration dans les modifications locales ; l'état réel de la table migrations TiDB reste à lire avec accès autorisé. Ne pas exécuter de rollback SQL automatique.
8. Autorisation de cutover : backend compatible d'abord, `/health/ready`, vérification version, puis frontend/Functions. Garder VITE_API_URL=/api, VITE_STORAGE_URL=/storage, VITE_SITE_URL=https://yazoo-showcase.pages.dev et BACKEND_ORIGIN serveur. Préserver les autres variables existantes. Si seule main publie, faire une PR de promotion revue ; aucun merge automatique.
9. Vérifier accueil/deep links, erreurs API, CSRF/session, profils et disponibilités, images et vidéos, 320/375/390/768/1024/1440 × FR/EN/AR × light/dark. Autorisation spécifique et comptes fictifs pour inscription, réservation, messages et R2 upload/remplacement/suppression. Consigner SHA backend, Pages deployment ID, digest, résultats et limites.

Un HTTP 200 de readiness prouve la connexion DB lors de la sonde, pas toutes les migrations ni une écriture R2. MAIL_MAILER=log/SMS disabled ne constituent pas une livraison de notification externe. Voir [SHOWCASE_ROLLBACK.md](SHOWCASE_ROLLBACK.md).

## Autorisation et reprise actuelle

L'autorisation de publication a été donnée le 14 octobre 2026. Voir la section de reprise dans RELEASE_READINESS.md. Production Pages confirmée startup-2026, Direct Upload ; backend Render compatible avant toute bascule frontend. Le workflow publie uniquement 5eef/yazoo-api-demo et scanne l'artefact exact avant push.
