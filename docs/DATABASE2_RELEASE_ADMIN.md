# Administrateur initial de la release DATABASE #2

La base Azure `yazoo_azure_test` ne doit recevoir aucun seeder de démonstration.
Le premier administrateur est créé par la commande idempotente
`yazoo:bootstrap-release-admin`, après les migrations et avant le preflight
complet de production.

## Garde-fous

- La cible résolue doit correspondre à `YAZOO_EXPECTED_DB_HOST`,
  `YAZOO_EXPECTED_DB_PORT` et `YAZOO_EXPECTED_DB_NAME`.
- `yazoo` reste dans `YAZOO_PROTECTED_DB_NAMES` et ne peut pas être ciblée.
- Une confirmation exacte non sensible `<host>/<database>` est obligatoire.
- Un administrateur existant n'est jamais écrasé, promu ou réinitialisé.
- Le mot de passe doit contenir au moins 16 caractères, majuscule, minuscule,
  chiffre et symbole.
- Le MFA TOTP confirmé et huit codes de récupération hachés sont créés dans
  la même transaction que le compte.
- Les secrets temporaires sont supprimés des App Settings Azure après le
  premier health check, y compris lors du rollback.

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

Le workflow refuse la release avant le build et le push Docker Hub lorsqu'un
secret manque ou ne respecte pas le format attendu.

## Comptes utilisateurs normaux

Les nouveaux comptes sont créés exclusivement par le parcours public
d'inscription. Les migrations fournissent les colonnes de profil, locale,
authentification, modération et confidentialité. Aucun mot de passe fictif,
compte marketplace ou document de démonstration n'est injecté en production.
