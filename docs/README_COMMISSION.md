# YaZoo - Note de presentation commission INDH

## Positionnement

YaZoo est une plateforme marocaine de mise en relation responsable autour de l'adoption animale, des services animaliers et des professionnels locaux. Le projet vise a faciliter l'acces a l'information, a encourager l'adoption responsable, a donner de la visibilite aux professionnels de proximite et a renforcer la moderation des annonces.

YaZoo n'est pas un vendeur direct d'animaux. Les utilisateurs restent responsables des annonces, des informations publiees, des echanges, des prix eventuels, des documents et du respect de la reglementation applicable.

Porteur de projet: Youssef BOUGHIOUL. Email officiel: bough.youssef@gmail.com. Telephone officiel: +212606610014. Hebergement public: demonstration free-tier en preparation. Statut juridique, adresse officielle et ICE restent a completer.

## Fonctionnalites principales

- Comptes utilisateurs avec authentification email/OTP, OTP SMS et Google.
- Profils publics, feed social, posts, stories, reactions et communautes.
- Marketplace animaux, produits, services et veterinaires.
- Messagerie, notifications, follow et reservations.
- Recherche globale et interface FR/AR/EN avec support RTL.
- Pages legales, regles de publication et bannieres de securite.
- Signalements utilisateurs et moderation admin.
- Statistiques admin pour suivre les volumes de contenus.

## Interet social et economique

- Encourager l'adoption responsable et la transparence des annonces.
- Aider les associations, particuliers et professionnels locaux a etre visibles.
- Reduire les risques par la moderation, les signalements et les rappels de securite.
- Faciliter l'usage mobile et multilingue pour une inclusion numerique plus large.

## Limites actuelles

Ce depot ne constitue pas a lui seul une preuve de conformite totale CNDP, ONSSA ou administrative. Le responsable du traitement et le contact donnees personnelles sont identifies, mais les pieces reelles doivent encore etre completees: statut juridique, adresse officielle, ICE si disponible, documents juridiques, autorisations professionnelles, politique de conservation validee, procedures internes et registres.

Phase 3A ajoute une base plus credible pour la commission: documents professionnels stockes en prive, revue admin avec raison de refus visible, page "Confiance et securite", configuration legal d'exemple et documentation CNDP readiness. Ces elements doivent etre presentes comme preparation technique et organisationnelle, pas comme validation CNDP/ONSSA officielle.

## Partage du projet

Avant toute remise a une commission, generer un ZIP propre en suivant `docs/SECURITY_SHARING.md`:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
.\deploy\export-indh-clean.ps1
```

Un ZIP local cree precedemment pour analyse externe n'est pas un livrable officiel. Le ZIP officiel de partage doit etre regenere avec le script `deploy/export-indh-clean.ps1`, qui exclut et verifie l'absence de `.env`, `.git`, logs, dumps SQL, backups, `node_modules`, `vendor`, `coverage`, `.scannerwork`, anciennes archives et fichiers de cles.

Ne jamais partager `.env`, `.git`, backups SQL, logs, `node_modules`, `vendor`, volumes Docker ou fichiers de production. En cas de partage accidentel d'un secret, regenerer `APP_KEY`, mots de passe DB/Redis, Gmail SMTP, secret Google OAuth, tokens Sonar/Docker/GitHub et credentials Azure. En production, ces valeurs doivent etre stockees dans Azure App Settings, GitHub Secrets et eventuellement Azure Key Vault.

Pour la commission INDH, presenter les fonctionnalites, l'architecture, les captures, les limites connues et les prochaines validations sans exposer de secrets ni de donnees personnelles reelles.

## Execution locale indicative

Backend:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\backend"
composer install
php artisan migrate
php artisan test
```

Frontend:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo\frontend"
npm install
npm run lint
npm test -- --run
npm run build
```

Audit i18n:

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\YaZoo"
node scripts/audit-i18n.mjs
```
