# Persistance et sauvegarde des médias Azure App Service

Le conteneur backend relie `storage/app/public` et `storage/app/private` à
`/home/site/yazoo-storage/app/*`. Le workflow refuse désormais un déploiement lorsque
`WEBSITES_ENABLE_APP_SERVICE_STORAGE` n’est pas exactement `true`; il ne modifie jamais ce
réglage.

## Diagnostic sans contenu privé

Dans le conteneur :

```sh
php artisan yazoo:diagnose-storage
php artisan yazoo:diagnose-storage --write-test
```

Le second appel crée un fichier aléatoire de 32 octets, vérifie son empreinte, puis le supprime.
Il ne lit, ne liste et n’affiche aucun média utilisateur.

## Sauvegarde avant toute modification

1. Arrêter les écritures applicatives ou prendre une fenêtre de maintenance.
2. Inventorier uniquement le nombre et la taille des fichiers publics et privés.
3. Créer depuis le conteneur une archive de `/home/site/yazoo-storage/app`, la télécharger vers
   un poste autorisé et ne jamais la committer.
4. Vérifier l’archive avec `tar -tf` puis extraire dans un dossier temporaire protégé.
5. Comparer nombres de fichiers et sommes SHA-256 avec l’inventaire source.
6. Ne changer le réglage App Service qu’après validation de cette sauvegarde et autorisation
   explicite.

Restauration : arrêter les écritures, conserver une copie de l’état courant, extraire vers un
dossier temporaire sous `/home/site`, vérifier empreintes et permissions, puis permuter les
dossiers. Vérifier ensuite `/health/ready` et un échantillon autorisé de médias publics et privés.

État constaté en lecture seule le 30 juillet 2026 : les App Services `yazoo` et `yazoo-api`
étaient démarrés, et le backend déclarait `WEBSITES_ENABLE_APP_SERVICE_STORAGE=true` avec
`MEDIA_STORAGE_DRIVER=filesystem`. L’inventaire du système de fichiers distant n’a pas pu être
automatisé avec la commande Azure CLI disponible; aucune modification Azure n’a été effectuée.
