# YaZoo — release DEMO unifiee 2026

Reference officielle : `5eef/YaZoo`, branche `main`, applications `backend/`, `frontend/`, `mobile/`. Ce dossier accompagne le code de cette branche ; le SHA effectivement execute est fourni par `https://yazoo-showcase.onrender.com/health/ready`. Le manifeste operationnel avec SHA exact, digest, deploy IDs, build EAS et resultats horodates est conserve localement dans `output/release-unified-20261023/RELEASE_REPORT.md`.

La PR #5 est deja fusionnee. La correction suivante empeche les annonces et profils DEMO de revendiquer une verification professionnelle reelle, tout en conservant leurs permissions de publication. Six regressions reproduites avant correction passent ensuite ; suite PHP locale : 525 tests / 4282 assertions. Une limite PHP locale de 128 Mo interrompait la suite ; la relance a 512 Mo passe. Les journaux initiaux sont conserves.

Avant cette correction, le commit a77067a594c3d65cfd74fad4976e1410d2f20fe9 avait une CI, une image immuable, des deployments Render/Pages et un APK signe verifies. Ces preuves historiques ne valident pas automatiquement le nouveau commit. La livraison de cette version exige de nouveau CI/Mobile/CodeQL, image scannee depuis main, digest reel, readiness, Pages Functions et APK du meme SHA. Aucun tag existant ne doit etre ecrase.

SonarQube/SonarCloud est exclu sur instruction explicite du proprietaire ; les autres controles restent actifs. Les alertes npm de tooling sont distinguees du runtime ; aucune conclusion « zero vulnerabilite » globale. Les resultats locaux, mocks, cloud et appareil sont separes dans la matrice.

Voir [matrice](FUNCTIONAL_MATRIX.md), [recette live](LIVE_SMOKE_TESTS.md), [securite](SECURITY_AND_DATA.md), [guide jury](DEMO_JURY_GUIDE.md) et [actions proprietaire](BLOCKERS_AND_OWNER_ACTIONS.md). Ces documents concernent un prototype DEMO, aucune ouverture commerciale ni conformite administrative certifiee.
