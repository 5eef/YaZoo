# Administrateur initial de la release DATABASE #2

La base Azure `yazoo_azure_test` reçoit le jeu marketplace local explicitement
autorisé pour cette release : 14 comptes de test, leurs profils professionnels,
les annonces, réservations, paiements, rendez-vous, messages, 21 images PNG et
12 documents de vérification fictifs. La commande idempotente
`yazoo:bootstrap-database2-test-data` s'exécute après les migrations. Elle est
suivie de `yazoo:bootstrap-release-admin`, qui sécurise le compte administrateur
avec son mot de passe et son MFA propres avant le preflight complet.

Les deux fixtures `[TEST MODÉRATION]` font partie du jeu local canonique. Les
sessions, tokens Sanctum, caches, jobs, traces et fichiers GridFS orphelins ne
sont jamais copiés.

## Garde-fous

- La cible résolue doit correspondre à `YAZOO_EXPECTED_DB_HOST`,
  `YAZOO_EXPECTED_DB_PORT` et `YAZOO_EXPECTED_DB_NAME`.
- `yazoo` reste dans `YAZOO_PROTECTED_DB_NAMES` et ne peut pas être ciblée.
- Une confirmation exacte non sensible `<host>/<database>` est obligatoire.
- Un compte administrateur prévu par le jeu local peut uniquement être sécurisé
  s'il correspond exactement à l'email administrateur configuré. Un autre
  administrateur ou un compte non-admin portant cet email bloque la release.
- Le mot de passe doit contenir au moins 16 caractères, majuscule, minuscule,
  chiffre et symbole.
- Le MFA TOTP confirmé et huit codes de récupération hachés sont créés dans
  la même transaction que le compte.
- Les secrets temporaires sont supprimés des App Settings Azure après le
  premier health check, y compris lors du rollback.
- Le marqueur `database2-test-data-v1` est conservé dans la table
  `operation_markers`; les déploiements suivants n'écrasent pas les données.
- Les images sont copiées vers le volume persistant App Service
  `/home/site/yazoo-storage`, jamais servies depuis une couche éphémère.

## Configuration GitHub sans écrire les secrets sur disque

Depuis PowerShell, à la racine du dépôt :

```powershell
.\scripts\configure-release-admin-secrets.ps1
```

Le script demande le nom, l'adresse et le mot de passe, génère le secret TOTP
et huit codes de récupération, puis alimente l'environnement GitHub
`production` via l'entrée standard de `gh`. Les valeurs ne figurent pas dans
les arguments du processus et ne sont pas écrites dans le dépôt.

Enregistrer immédiatement dans un gestionnaire de mots de passe :

- le mot de passe administrateur choisi ;
- le secret ou l'URI TOTP affiché ;
- les huit codes de récupération affichés.

Pour une génération automatisée compatible avec Windows PowerShell 5.1 :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File ".\scripts\configure-release-admin-secrets.ps1" `
  -Environment production `
  -AdministratorName "Nom Administrateur" `
  -AdministratorEmail "admin@example.com" `
  -GenerateCredentials
```

Ce mode génère aussi le mot de passe. Il ne révèle aucun secret dans la sortie,
place le mot de passe dans le presse-papiers et conserve le matériel MFA dans
`%LOCALAPPDATA%\YaZoo\release-admin-enrollment.dpapi`. Ce paquet est chiffré
par DPAPI pour l'utilisateur Windows et la machine qui l'ont créé; il n'est
pas portable et n'est jamais ajouté au dépôt.

Pour recopier ultérieurement un élément dans le presse-papiers sans l'afficher :

```powershell
.\scripts\copy-release-admin-credential.ps1 -Field Password
.\scripts\copy-release-admin-credential.ps1 -Field AuthenticatorUri
.\scripts\copy-release-admin-credential.ps1 -Field RecoveryCodes
```

Les noms GitHub attendus sont :

- `YAZOO_RELEASE_ADMIN_NAME`
- `YAZOO_RELEASE_ADMIN_EMAIL`
- `YAZOO_RELEASE_ADMIN_PASSWORD`
- `YAZOO_RELEASE_ADMIN_MFA_SECRET`
- `YAZOO_RELEASE_ADMIN_MFA_RECOVERY_CODES`
- `YAZOO_DATABASE2_TEST_ACCOUNT_PASSWORD`

Le mot de passe partagé des 13 comptes de test non-admin est généré, transmis
à GitHub par l'entrée standard et sauvegardé localement sous DPAPI :

```powershell
.\scripts\configure-database2-test-account-secret.ps1
```

Si l'API GitHub des secrets d'environnement renvoie durablement une erreur
temporaire, les trois scripts de configuration peuvent cibler explicitement le
coffre chiffré du dépôt, que le workflow lit également :

```powershell
.\scripts\configure-database2-test-account-secret.ps1 -UseRepositoryScope
.\scripts\configure-production-profile-secrets.ps1 -UseRepositoryScope
.\scripts\configure-release-admin-secrets.ps1 -UseRepositoryScope
```

Cette portée est plus large que l'environnement `production`. Elle sert de
secours contrôlé ; les secrets doivent être replacés dans l'environnement dès
que son endpoint GitHub est disponible, puis supprimés au niveau dépôt.

Pour le copier ultérieurement sans l'afficher :

```powershell
.\scripts\copy-database2-test-account-password.ps1
```

Le workflow refuse la release avant le build et le push Docker Hub lorsqu'un
secret manque ou ne respecte pas le format attendu.

## Profil production légal et SMTP

Le preflight de production bloque volontairement une release qui utiliserait
des mentions légales fictives, un transport mail de log ou un scheduler
inactif. Configurer les valeurs réelles sans les publier dans le dépôt :

```powershell
.\scripts\configure-production-profile-secrets.ps1
```

Le script alimente l'environnement GitHub `production` par l'entrée standard
de `gh`. Il demande le statut légal, l'adresse officielle, l'ICE, les emails de
contact et la configuration SMTP réelle. Le workflow valide leur présence
avant de construire les images, les transmet à Azure uniquement pendant le
rollout et active `YAZOO_RUN_SCHEDULER=true`. Aucune valeur fictive ne doit être
utilisée uniquement pour faire passer le déploiement.

## Comptes utilisateurs normaux

Après ce bootstrap initial contrôlé, les nouveaux comptes sont créés
exclusivement par le parcours public d'inscription. Le marqueur persistant
empêche la réapplication du jeu de test lors des releases suivantes.
