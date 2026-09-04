# Compatibilite TiDB du showcase YaZoo

## Etat de l'audit

Le contrat applicatif reste MySQL. Les migrations utilisent les tables, index, cles etrangeres, JSON, transactions et modifications de colonnes pris en charge par TiDB 8.5. Les parcours reservations, paiements, suppression de compte et verification professionnelle utilisent `SELECT ... FOR UPDATE`; TiDB emploie les transactions pessimistes par defaut et prend en charge ce verrouillage ([transactions TiDB](https://docs.pingcap.com/tidb/stable/transaction-overview/)).

Points identifies :

- deux migrations creent des index `FULLTEXT`; ceux-ci ne sont disponibles que dans certaines regions AWS Starter. Le showcase definit donc `YAZOO_FULLTEXT_SEARCH_ENABLED=false`, n'installe pas ces index et utilise le fallback prefixe `LIKE` deja present;
- trois migrations utilisent `->change()` sur des colonnes non primaires. TiDB prend en charge `MODIFY/CHANGE COLUMN`, avec certaines restrictions et un cout de reorganisation a surveiller ([MODIFY COLUMN](https://docs.pingcap.com/tidb/stable/sql-statement-modify-column/));
- aucun trigger, stored procedure, UDF, `GET_LOCK`, colonne generee ou `SELECT ... SKIP LOCKED` n'a ete trouve;
- `LegacyDataMigrator` contient `FOREIGN_KEY_CHECKS`, mais ce chemin de migration de donnees historique n'est pas appele par le bootstrap showcase;
- JSON et transactions sont utilises dans des limites modestes; une transaction TiDB Starter ne doit pas durer plus de 30 minutes.

La compatibilite MySQL n'est pas consideree comme absolue : TiDB exclut notamment triggers et stored procedures, et documente des limites Starter de connexion/monitoring ([FAQ de compatibilite](https://docs.pingcap.com/tidbcloud/tidb-cloud-faq/?plan=starter), [limites Starter](https://docs.pingcap.com/tidbcloud/serverless-limitations/)).

## Procedure sur une base vide

1. Creer `yazoo_showcase` vide; ne jamais reutiliser une base contenant des donnees metier.
2. Configurer `DB_*`, TLS, `YAZOO_REQUIRE_EXPECTED_DATABASE=true` et les trois `YAZOO_EXPECTED_DB_*`.
3. Configurer `YAZOO_FULLTEXT_SEARCH_ENABLED=false`.
4. Executer `php artisan yazoo:verify-database-target` sans afficher le mot de passe.
5. Executer `php artisan yazoo:migrate-production`, puis `php artisan migrate:status`.
6. Executer le bootstrap showcase une fois et verifier les compteurs/metadonnees.
7. Tester recherche, reservations concurrentes et health readiness contre TiDB reel.

Le test TiDB distant n'est pas simule par la suite locale MySQL/SQLite. Tant qu'aucun endpoint TiDB n'est fourni, l'etat reste **READY FOR MANUAL CLOUD SETUP**.
