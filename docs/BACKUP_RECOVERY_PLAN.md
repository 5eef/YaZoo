# Sauvegarde cloud et continuité commerciale

Complète [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md), qui concerne les scripts Docker locaux. **Aucune restauration TiDB/R2 commerciale n'est attestée.** Ne pas exécuter les scripts locaux contre une base distante en changeant simplement le host.

## Objectifs à approuver

Proposition de départ, pas un engagement : DB quotidienne (RPO maximal 24 h), objets copiés quotidiennement, RTO cible 4 h ; ajuster avant transactions réelles. La perte acceptable de rendez-vous/messages/paiements doit être validée. Pour un RPO plus court, étudier sauvegarde incrémentale/managée après vérification des capacités du plan et du coût.

## Procédure

1. Inventorier schéma, migrations, région, fuseau, encodage, version SQL, volume, buckets et chemins MediaAsset ; utilisateur backup en lecture et accès réseau restreint. Confirmer les méthodes d'export/restauration prises en charge par TiDB Starter actuel. Aucun backup managé supposé.
2. Exporter de manière cohérente par un opérateur/runner autorisé avec TLS. Conserver migrations et métadonnées d'objets (clé, taille, hash si disponible, type MIME, disk/owner/parent), sans publier de credentials. Chiffrer avant transfert, clé de chiffrement indépendante de la copie.
3. Copier R2 vers une destination indépendante et des credentials séparés, sans suppression miroir automatique. Une suppression d'objet en production ne doit pas immédiatement détruire la dernière copie saine. Les ETag multipart ne sont pas une preuve universelle de hash contenu.
4. Rotation proposée : 7 quotidiennes + 4 hebdomadaires, à concilier avec rétention légale et droit d'effacement. Ne pas purger avant succès de la nouvelle copie vérifiée. Contrôler taille, âge, intégrité et complétude DB/objets, alerter sur échec ou absence.
5. Restauration sur DB/bucket **isolés** : importer le backup, vérifier schema/migrations/counts/relations, utilisateurs et rôles sans envoyer d'email/SMS/paiement, relire échantillon de médias et justificatifs privés, exécuter parcours auth/réservation/message. Aucun routage public ni credential prod. Relever durée et écarts RPO/RTO.
6. Produire preuve datée : identifiant backup, hashes, région/destination, tables/objets contrôlés, résultats fonctionnels, temps restore et responsable. Un gzip lisible ou un export réussi ne suffit pas. Exercice mensuel proposé et avant changement majeur de DB.
7. Incident : conserver un snapshot de l'état incident si possible, geler les écritures après autorisation, déterminer point de reprise et pertes, restaurer isolé puis cutover approuvé. Réconcilier paiements externes avec PSP avant reprise. Ne pas réactiver automatiquement les emails/webhooks de données restaurées.

## Surveillance et rotation

Alertes : readiness DB, taux 5xx, latence, échec scheduler/queue, backups trop anciens, stockage/quota. Uptime commercial à définir sur infrastructure appropriée ; pas de pings showcase pour contourner Render Free. Journal d'incident avec chronologie, impact, décision et correction, sans contenu de messages/documents.

Rotation : créer credential limité de remplacement, tester, déployer, révoquer l'ancien et confirmer les copies/runner. APP_KEY requiert une stratégie spécifique pour données chiffrées et sessions ; ne pas la régénérer aveuglément. Responsable support/incident et contacts réels restent à désigner. Aucun secret demandé dans la conversation.
