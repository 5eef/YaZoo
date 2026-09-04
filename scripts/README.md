# Scripts YaZoo

Les scripts d'audit, sauvegarde locale, i18n, export, demarrage local et validation showcase restent actifs.

Les fichiers suivants sont conserves uniquement pour l'historique Azure decommissionne et ne sont plus appeles par la CI :

- `deploy-database2-release-manually.ps1`;
- `validate-release-guards.mjs`;
- `test-azure-script-guards.ps1`;
- `test-azure-showcase-reset.ps1`.

Le chemin actif de demonstration est `Dockerfile.demo`, controle par `validate-showcase-deployment.mjs`.
