# Déploiement YaZoo — compte rendu final de la session

Horodatage : 2026-08-14 19:18 (Africa/Casablanca)  
Statut : **BLOQUÉ AVANT DÉPLOIEMENT — aucune fausse déclaration de succès**

## 1. Résumé

La release est construite et validée localement, mais elle n'a pas été publiée
sur Docker Hub et les App Services Azure n'ont pas été basculés. Azure
DATABASE #2 a été créée séparément, mais la permission d'utiliser en mémoire
les identifiants déjà stockés dans Azure pour la connecter et la migrer a été
refusée. Continuer aurait violé les garde-fous demandés.

Les URLs ci-dessous répondent pour la version actuellement en production, pas
pour la release locale :

- Frontend existant : `https://yazoo.azurewebsites.net`
- Backend existant : `https://yazoo-api.azurewebsites.net`
- Health existant : `https://yazoo-api.azurewebsites.net/health/ready`

## 2. État des bases

```text
DATABASE #1 : NON MODIFIÉE
host     = yazoo-mysql-0c2b09.mysql.database.azure.com
port     = 3306
database = yazoo

DATABASE #2 LOCALE : MIGRÉE ET TESTÉE
host     = 127.0.0.1
port     = 3307
database = yazoo_azure_test

DATABASE #2 AZURE : CRÉÉE, NON MIGRÉE, NON UTILISÉE PAR L'APPLICATION
host     = yazoo-mysql-0c2b09.mysql.database.azure.com
port     = 3306
database = yazoo_azure_test
```

Aucun mot de passe, token, clé ou secret n'est inclus dans ce rapport.

## 3. Release construite

| Composant | Tag local | Image ID | Taille | Runtime |
| --- | --- | --- | ---: | --- |
| Backend | `yazoo-backend:post-fix-20260814` | `sha256:d2b10b3ed8885f6fa2013fbb9f120d0795582a3634c2ca9c0c00f664e21f6e1c` | 403 MB | `www-data` |
| Frontend | `yazoo-frontend:post-fix-20260814` | `sha256:8b57edf1f3ecddb2603ae079c7fcca4989e7edde2b85024e92036fd42dc50a24` | 83,9 MB | `nginx` |

Le tag de production observé avant changement reste :

- backend : `5eef/yazoo-api:latest` ;
- frontend : `5eef/yazoo-frontend:latest`.

Ces tags `latest` ne donnent pas un identifiant immuable de rollback. Aucun
changement de conteneur Azure n'a été réalisé.

## 4. Garde de switch DB

Le code exige désormais une correspondance exacte entre la connexion résolue
et :

- `YAZOO_EXPECTED_DB_HOST` ;
- `YAZOO_EXPECTED_DB_PORT` ;
- `YAZOO_EXPECTED_DB_NAME` ;
- `YAZOO_PROTECTED_DB_NAMES=yazoo`.

`yazoo:migrate-production` et le preflight échouent avant migration si la cible
ne correspond pas ou si la base est protégée. Les tests associés sont verts.

## 5. Pourquoi le déploiement est bloqué

1. La base Azure DB2 existe, mais sa connexion/migration n'est pas prouvée.
2. L'autorisation d'utiliser les secrets Azure existants uniquement en mémoire,
   sans les afficher, a été refusée.
3. Le scan Trivy local et l'arrêt du conteneur temporaire ont également été
   refusés par le contrôle d'autorisation Docker.
4. L'accès en lecture aux runs GitHub Actions a été refusé ; aucune CI distante
   verte ne peut être affirmée.
5. Aucun commit/push n'a été autorisé ou effectué.

## 6. Checklist finale réelle

- [x] Git inspecté et état préexistant conservé
- [x] Backend tests verts
- [x] Frontend tests verts
- [x] Build frontend vert
- [x] Pint vert
- [ ] Analyse statique Larastan — installation refusée
- [x] Docker build backend vert
- [x] Docker build frontend vert
- [x] DATABASE #2 locale accessible
- [x] DATABASE #1 protégée et non modifiée
- [x] Migrations DATABASE #2 locale OK
- [x] Concurrence MySQL/MariaDB DB2 locale OK
- [ ] DATABASE #2 Azure accessible — credentials en mémoire refusés
- [ ] Migrations DATABASE #2 Azure OK
- [ ] Backend nouvelle release health OK en Azure
- [x] Frontend conteneur local HTTP OK
- [ ] Frontend nouvelle release HTTP OK en Azure
- [ ] API nouvelle release Azure OK
- [ ] Auth nouvelle release Azure OK
- [ ] Marketplace nouvelle release Azure OK
- [ ] Vétérinaire nouvelle release Azure OK
- [ ] Réservation nouvelle release Azure OK
- [ ] Messaging nouvelle release Azure OK
- [ ] Privacy nouvelle release Azure OK
- [ ] Admin nouvelle release Azure OK

## 7. Smoke tests réellement exécutés

- Conteneur frontend local : HTTP 200 sur `http://localhost:4180`.
- `/version.json` : `post-fix-20260814`.
- Headers : CSP, HSTS, nosniff, frame options, referrer et permissions présents.
- Manifest PWA : aucun `lang`, `dir` ou `orientation` imposé.
- Playwright/axe : 97/97 sur Chromium, FR/AR/EN, RTL, responsive et thèmes.
- Backend/API : 378 tests, dont auth, marketplace, vétérinaire,
  réservation, paiement, messaging, privacy et administration.
- DB2 locale réelle : transactions, locks, FK, JSON, décimaux, dates,
  FULLTEXT, rendez-vous, créneaux, réservation produit et paiement.

Ces preuves locales ne sont pas présentées comme des smoke tests de production.

## 8. État du conteneur de vérification

Le conteneur local `yazoo-frontend-check-2` est resté sain sur le port 4180.
Son arrêt a été demandé, mais l'autorisation système a été refusée. Il peut être
arrêté manuellement avec :

```powershell
docker stop yazoo-frontend-check-2
```

## 9. Plan de déploiement restant

1. Autoriser la lecture en mémoire des app settings DB existants.
2. Exécuter le guard contre
   `yazoo-mysql-0c2b09.mysql.database.azure.com:3306/yazoo_azure_test`.
3. Exécuter `migrate:status`, puis `yazoo:migrate-production --force`.
4. Vérifier le schéma et une lecture/écriture de test réversible sur DB2.
5. Exécuter Trivy/Syft et enregistrer les SBOM.
6. Publier les deux tags immuables après autorisation explicite.
7. Enregistrer les paramètres et images précédents, puis configurer les guards
   et DB2 sur `yazoo-api`.
8. Déployer backend, healthcheck et smoke API/auth.
9. Déployer frontend sur 8080, puis smoke navigateur et logs.
10. Ne promouvoir `latest` qu'après réussite complète.

## 10. Rollback préparé

État précédent observé : images `latest`, DB `yazoo`. En cas d'échec futur,
remettre les images précédentes et les paramètres DB antérieurs avec migrations
de démarrage désactivées. Ne jamais exécuter de rollback SQL automatique : le
code rollback doit être compatible avec le schéma étendu de DB2. DATABASE #2
doit être conservée pour diagnostic et DATABASE #1 ne doit subir aucune
migration de cette release.

