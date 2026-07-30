# Redis, queues, scheduler et Reverb

Le dépôt fournit des services Docker séparés pour Redis, le worker, le scheduler et Reverb.
Reverb est local et open source; aucun service temps réel externe n’est activé.

Variables obligatoires pour le smoke test local : `APP_KEY`, paramètres MySQL/Redis et trois
valeurs locales distinctes `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`. Ces valeurs
ne doivent jamais être committées.

```powershell
docker compose config
docker compose up -d mysql redis app queue scheduler reverb
docker compose ps
curl.exe -i http://127.0.0.1:8000/health/ready
```

`/health/ready` vérifie DB, Redis et heartbeats. Si `YAZOO_REQUIRE_REVERB_HEALTH=true`, il vérifie
aussi qu’une connexion TCP au serveur Reverb est possible, sans exposer ses clés. L’interface
continue de sonder les notifications lorsque le temps réel est désactivé ou déconnecté; une
panne WebSocket ne doit donc pas bloquer les parcours HTTP.

Le serveur Reverb de production n’a pas été validé : son activation dépend d’une topologie Azure
capable d’exposer durablement le port WebSocket et de credentials configurés.
