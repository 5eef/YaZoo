# YaZoo — état de référence avant corrections

Date : 2026-08-14  
Workspace : `C:\Users\seef7\OneDrive\Desktop\YaZoo`

## Git

- Branche : `main`
- Commit : `3464df84c3892e604968795a1e6093b8e52824d1`
- Relation remote : `main` alignée avec `origin/main`
- Modification locale préexistante : `.gitignore` (+5 lignes)
- Fichiers non suivis préexistants :
  - `AUDIT_PROFESSIONNEL_COMPLET_YAZOO_2026-08-02.md`
  - `AUDIT_YAZOO_COMPLETE.md`
- Aucun commit, push, reset, clean ou suppression effectué.

Empreintes SHA-256 de référence des fichiers préexistants sensibles au suivi :

- `.gitignore` : `251A06C856268CC372EF5C9532CDA8...`
- `AUDIT_PROFESSIONNEL_COMPLET_YAZOO_2026-08-02.md` : `4FFBE10A838276478D05A013A9E0C3...`
- `AUDIT_YAZOO_COMPLETE.md` : `693ADF8026D2E45D27407FC749D12C...`

Les empreintes sont volontairement abrégées dans ce document ; les fichiers n'ont pas été modifiés par la baseline.

## Versions

| Composant | Version |
|---|---|
| PHP CLI | 8.5.1 |
| Composer | 2.9.3 |
| Laravel | 12.61.1 |
| Node.js | 24.13.0 |
| npm | 11.6.2 |
| React / React DOM | 19.2.7 |
| React Router | 8.3.0 |
| Vite | 8.1.2 |
| Docker Engine | 29.6.2 |
| Docker Desktop | 4.85.0 |

## Databases identifiées

### DATABASE #1 — production à protéger

- Hôte : `yazoo-mysql-0c2b09.mysql.database.azure.com`
- Port : `3306`
- Base : `yazoo`
- Moteur : Azure Database for MySQL Flexible Server 8.0.21
- État observé : `Ready`
- Usage : production actuelle de `yazoo-api`
- Protection : aucune commande d'écriture ou migration exécutée pendant la baseline.

### Base locale de développement — également protégée

- Hôte : `127.0.0.1`
- Port : `3306`
- Base : `yazoo_local`
- Moteur : MySQL 8.0.45
- État : accessible
- Empreinte structurelle avant travaux : 41 tables, 62 migrations, dernière migration `2026_08_08_000100_track_account_deletion_purge`, 2 605 056 octets données+index.

### DATABASE #2 — cible demandée

- Hôte local existant : `127.0.0.1`
- Port : `3307`
- Base : `yazoo_azure_test`
- Moteur local : XAMPP MariaDB 10.4.32
- État : accessible en lecture
- Empreinte structurelle avant travaux : 36 tables, 52 migrations, dernière migration `2026_07_27_000200_prevent_duplicate_pending_professional_verifications`, 2 850 816 octets données+index.
- Source de configuration : `backend/.env.backup-before-local-20260801-152302`.

Constat cloud : le serveur Azure ne contient à cette date qu'une seule base utilisateur, `yazoo`. Une base Azure `yazoo_azure_test` n'existe pas encore. Le déploiement sur DATABASE #2 exigera donc une création non destructive sur le serveur existant, après validations, puis un switch gardé. Il est interdit de réutiliser le plan showcase destructif existant qui supprime/recrée `yazoo`.

## Dépendances

- `composer validate --strict` : succès.
- `composer audit --no-interaction` : succès, aucune advisory signalée.
- `npm audit` : non exécuté ; l'autorisation réseau a été refusée. Aucun résultat npm n'est inventé.
- Lockfiles Composer et npm présents.

## Quality gates avant correction

| Contrôle | Résultat initial |
|---|---|
| Syntaxe PHP première partie | 402 fichiers, 0 erreur |
| Pint | ÉCHEC sur 2 fichiers |
| PHPUnit isolé | 368 réussis, 2 027 assertions |
| Couverture PHP | commande lancée ; exécution parallèle interférente, résultats de l'audit précédent : 85,53 % statements / 70,58 % methods |
| ESLint | Succès |
| Typecheck | Succès |
| Vitest isolé | 128/128 réussis |
| Couverture frontend | 76,84 % statements, 58,13 % branches, 74,31 % functions, 76,71 % lines sur la liste blanche existante |
| Vite build | Succès, 308 modules |
| Audit i18n FR/AR/EN | Succès, 1 961 clés |
| Audit Tailwind | Succès, 181 classes vérifiées |
| Playwright/axe initial | 96/97 ; focus clavier `/feed ar dark 390px` en échec |
| Playwright ciblé relancé | scénario réussi, mais processus runner non terminé avant timeout ; flakiness à corriger/observer |
| Docker daemon | Accessible |
| `docker compose config` | Succès |

Exécution parallèle de la première baseline : PHPUnit et deux tests Vitest ont retourné des timeouts sous contention. Les relances isolées ont produit 368/368 et 128/128. Ces incidents sont conservés comme signal de fragilité/performance des tests, pas masqués.

## Verrou de sécurité avant correction

- DATABASE #1 Azure `yazoo` : **NON MODIFIÉE**.
- Base locale `yazoo_local` : **NON MODIFIÉE**.
- DATABASE #2 `yazoo_azure_test` : **lecture seule pendant la baseline**.
- Interdictions actives : `migrate:fresh`, `db:wipe`, `DROP DATABASE`, `DROP TABLE`, reset destructif, suppression de données ou secrets.
- Le plan `.azure/deployment-plan.md` courant autorise un ancien reset destructif de `yazoo`; il est incompatible avec la mission courante et ne doit pas être exécuté.
