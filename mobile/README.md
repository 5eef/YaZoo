# Mobile YaZoo — pilote Android

Application Expo stable créée dans ce dépôt, TypeScript strict, même API Laravel. YaZoo reste une plateforme animale complète : Feed connecté, stories, communautés, profil social, messages, catalogue produits et professionnels. La vente publique d’animaux garde son flag juridique et ouvre le module Web lorsqu’il est actif. Version exacte : voir package-lock.json (SDK 57 au scaffold du 7 octobre 2026). Navigation Expo Router dans src/app ; état partagé dans le layout, mêmes services/API pour chaque écran. Les règles du scaffold mobile/AGENTS.md et la documentation SDK 57 ont été consultées.

## Démarrer sur Windows
```powershell
cd C:\project\YaZoo\mobile
npm ci
Copy-Item .env.example .env
npm start
```
`EXPO_PUBLIC_API_URL` est la seule configuration publique : URL sans secret, terminant éventuellement par /api. Android emulator : http://10.0.2.2:8000/api ; téléphone : adresse LAN du PC, API liée à 0.0.0.0, pare-feu local adapté. Production : HTTPS de votre API. Ne jamais mettre de credentials serveur dans EXPO_PUBLIC_*.

La session est stockée par expo-secure-store. POST /api/auth/mobile/login et register exigent device_name et réutilisent les mêmes règles que le Web ; token Bearer, expiration sept jours par défaut SANCTUM_EXPIRATION, révocation via POST /api/auth/logout. Le Web conserve son cookie HTTP-only et le CSRF. Le client n’imprime ni token ni Authorization. Une réponse 401 à une requête avec token invalide efface la session ; les autres erreurs restent récupérables. Le logout attend la révocation serveur : en cas de réseau absent, reconnecter et réessayer, ne pas prétendre avoir révoqué le token.

## Parcours
FR/AR/EN persistants ; RTL arabe avec sens des textes immédiat et redémarrage demandé pour le layout natif. Header YaZoo, dock à cinq destinations, drawer des modules secondaires et sidebar dès 900 px. Tokens issus du Web dans src/theme : system/light/dark persistants, logo historique et cartes violettes/lavande.

Après connexion, l’accueil est le Feed avec un raccourci professionnels. Publications texte/photo/vidéo, réactions, commentaires/réponses, édition/suppression autorisée, partage natif, signalements, stories, communautés et profil avec couverture/avatar/statistiques. Pagination Feed, publications filtrées par auteur, communautés, produits/favoris et vétérinaires. Les listes rendez-vous, messages et services affichent encore la première page API. Les réservations commerciales, commandes, vérification professionnelle et détails/transactions marketplace restent accessibles sur YaZoo Web depuis le menu ou les cartes.

Les parcours vétérinaires conservent recherche ville/spécialité, profil, créneaux réels, demande de rendez-vous, transitions professionnel, annulation et avis éligible. Messagerie avec avatars, aperçu, date, unread et conversation/relecture/envoi ; accès direct depuis les profils sociaux. Refresh explicite. Les liens Web et privacy/CGU proviennent de FRONTEND_URL de l’API. Voir ../docs/MOBILE_DESIGN_PARITY.md pour la distinction entre fonctionnalités implémentées et QA réellement vérifiée.

Touch targets ≥48, labels, rôles, champs password/email, clavier et texte adaptatif. Aucun succès de test TalkBack/appareil réel n’est revendiqué sans exécution. Voir l’audit final pour résultats réels.

## Gates
```powershell
npm ci
npx expo-doctor
npm run lint
npm run typecheck
npm test
npx expo export --platform android
npx expo prebuild --platform android --clean --no-install
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
.\gradlew.bat assembleRelease
.\gradlew.bat bundleRelease
```
CNG : android/ et ios/ sont générés et ignorés. Aucun keystore, APK/AAB ou credential versionné. Utiliser le wrapper généré. La configuration Gradle générée peut signer une release locale avec une clé debug : **ce résultat ne constitue pas un AAB prêt à publier**. Signature de publication via credentials EAS contrôlés par le propriétaire.

## EAS

Sorties locales vérifiées le 7 octobre 2026 : `android/app/build/outputs/apk/debug/app-debug.apk`, `android/app/build/outputs/apk/release/app-release.apk`, `android/app/build/outputs/bundle/release/app-release.aab`. APK release autonome avec signature de développement ; URL API locale par défaut si aucune variable fournie. Refaire le build avec la vraie URL HTTPS avant distribution pilote, puis vérifier sur appareil. Tous ces artefacts restent ignorés par Git. Les builds EAS nécessitent encore login/association/credentials ; aucun résultat cloud revendiqué.

La configuration Expo applique un mod Gradle (`withGradleProperties`) : heap 4 Go, Metaspace 1,5 Go, deux workers. Cela corrige l’OutOfMemoryError Metaspace rencontré dans lintVitalAnalyzeRelease de react-native-screens ; lint reste actif et la configuration survit à prebuild --clean. Aucun fichier natif généré n’est modifié manuellement. Référence : [config plugins Expo](https://docs.expo.dev/config-plugins/plugins/).

```powershell
cd C:\project\YaZoo\mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform android --profile production
```
`development` : dev client interne ; `preview` : APK interne ; `production` : AAB. Définir EXPO_PUBLIC_API_URL sur le projet/environnement EAS avec HTTPS avant build distribué. Vérifier app.json, branding et package provisoire com.yazoo.pilot avant init/publication. Aucun domaine tiers n’est revendiqué. Pas de publication automatique Google Play. Les credentials et association du projet Expo sont des étapes humaines si aucune session n’existe.

## Limites sécurité du tooling
Consulter ../docs/SECURITY_REVIEW.md : l’audit expose des dépendances transitives de Metro/Expo et un risque de décodage de paramètres de navigation dans la chaîne Router. Ne pas exécuter audit fix --force : les propositions changent le SDK ou introduisent une API incompatible. Aucun champ de l’API n’est utilisé comme pattern Metro ; build uniquement depuis dépôt de confiance. Résoudre/revoir les advisories et tester les liens malformés avant diffusion publique.
