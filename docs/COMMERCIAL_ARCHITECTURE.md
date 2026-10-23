# Architecture commerciale progressive

Le code Laravel/React/API/Sanctum est conservé. Pas de réécriture ni migration cloud imposée. État au 14 octobre 2026 : capacité technique partielle, production commerciale non provisionnée et non activée.

| Environnement | Données et isolation | Exécution |
| --- | --- | --- |
| Local | Fixtures éphémères, secrets de développement | MySQL 3306 ; MariaDB XAMPP 3307 ; MongoDB 27017, sans permutation |
| Test/CI | SQLite mémoire, MySQL conteneur jetable ; aucune connexion TiDB | Tests, concurrence, navigateur, scans ; pas d'identités réelles |
| Showcase | Base yazoo_showcase, comptes AFWAJ fictifs, clés/bucket dédiés | Render Free + Pages/Functions ; aucune promesse SLA |
| Commercial | Nouveau schéma/compte DB, stockage/bucket, secrets, sessions, domaines et logs indépendants | Ressources à valider par le propriétaire avant création |

Production : `YAZOO_DEPLOYMENT_PROFILE=production`, bootstrap showcase/database2 désactivés, aucun compte AFWAJ transféré. Utilisateur DB restreint au nouveau schéma, garde-fous host/port/name et protection du showcase sur les opérations commerciales. Clés APP_KEY, R2, MFA, SMTP/SMS, OAuth et paiements indépendantes. Un bucket par environnement avec credentials minimaux. Preview Pages ne doit pas disposer des secrets commerciaux ; employer une API de test dédiée. Conserver le proxy same-origin et vérifier les cookies après tout changement de domaine.

## Progression à budget limité

1. Conserver Pages et API Laravel unique, DB SQL existante et stockage objet privé. Pour un lancement réel nécessitant disponibilité continue, comparer une petite instance permanente au coût complet d'un VPS administré (maintenance, sauvegardes, sécurité). Aucun plan modifié ici. Render précise que Free ne convient pas à la production ; veille, stockage éphémère, absence de shell/one-off et restrictions SMTP rendent les routines commerciales non garanties. [Limites officielles](https://render.com/docs/free), consultées le 14 octobre.
2. Commencer avec cache/session database et polling messagerie ; mesurer latence, CPU, requêtes SQL et connexions avant Redis/Reverb. Garder les verrous SQL parent et ordre de verrouillage cohérent. Limiter le nombre de workers PHP/queue à la capacité DB, pas à une valeur théorique.
3. Instance permanente : scheduler minute et worker supervisé, retries/backoff, dead letters, heartbeat et alertes. Les suppressions, rétention et notifications doivent survivre aux redémarrages. Queue sync n'est acceptable que pour opérations courtes dont l'échec est géré explicitement.
4. TiDB : vérifier dans le compte quotas/spending limit/connexions, région et backup/restore avant décision. La documentation Starter n'a pas été récupérée de manière fiable pendant cet audit ; aucun quota ni sauvegarde managée présumé. Garder TLS et allowlist IP. Alternative MySQL managé/VPS seulement si disponibilité, coût et restauration sont démontrés meilleurs.
5. Pages/Functions : les appels proxy consomment le quota Workers ; mesurer trafic authentifié et polling. Limites Free de builds et fichiers ne constituent pas un SLA. [Limites Pages](https://developers.cloudflare.com/pages/platform/limits/). R2 : suivre octets stockés, lectures/écritures et objets abandonnés, taille des uploads et streaming Range ; [limites R2](https://developers.cloudflare.com/r2/platform/limits/). Le stockage privé n'est pas une sauvegarde indépendante.

## Critères avant dimensionnement

Définir utilisateurs actifs, utilisateurs simultanés, volume médias/jour, taille vidéo maximale, délai de messages accepté, RPO/RTO et budget mensuel maximal. Test de charge sur environnement isolé représentatif : lectures marketplace et recherche, login avec rate limits normaux, accès média Range, réservations concurrentes, saturation DB et traitement des queues. Suivre p50/p95, erreurs 5xx, verrous/deadlocks, connexions et mémoire. Aucun résultat de charge commerciale disponible ; ne pas annoncer une capacité utilisateurs.
