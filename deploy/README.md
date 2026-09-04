# Scripts de deploiement

`export-indh-clean.ps1` reste un outil d'export documentaire generique.

Les autres scripts de ce dossier ciblent l'ancien environnement Azure App Service/OIDC. Ils sont conserves uniquement comme historique technique apres decommissionnement des ressources Azure : ils ne sont plus un chemin de deploiement actif et ne doivent pas etre executes contre un nouvel abonnement sans une nouvelle revue complete.

Le deploiement showcase actuel utilise le [`Dockerfile.demo`](../Dockerfile.demo) et le guide [`docs/DEMO_DEPLOYMENT_FREE.md`](../docs/DEMO_DEPLOYMENT_FREE.md).
