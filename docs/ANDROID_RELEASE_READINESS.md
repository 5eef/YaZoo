# Android release readiness — YaZoo, 8 octobre 2026

La configuration de signature production est préparée. Les vrais credentials restent **OWNER ACTION REQUIRED**. Aucun test téléphone, upload Play, build cloud, commit ou push dans cette mission.

## Identité

Package stable conservé : `com.yazoo.pilot`, version `0.1.0`, versionCode initial `1`. Aucun domaine tiers revendiqué. Le propriétaire doit confirmer la disponibilité et l'association de cet identifiant dans son compte Play. EAS utilise les versions distantes et autoIncrement en production ; ne pas réutiliser un versionCode publié.

## Trois modes distincts

| Mode | Signature | Validation |
|---|---|---|
| Debug | Debug keystore généré localement | assembleDebug autorisé |
| Validation locale release | Explicitement non signée avec YAZOO_SIGNING_MODE=validation | Réservée à la compilation locale ; interdite sur EAS et profils preview/production |
| Production / preview distribué | Vraie clé d'upload locale ou credentials EAS remote | Échec explicite si absence ou signature debug ; aucun fallback |

Le plugin CNG `mobile/plugins/with-release-signing.js` retire le fallback release debug. Il contrôle les tâches release réellement présentes dans le graphe Gradle, y compris lorsqu'elles sont appelées par une tâche agrégée. Le dossier Android est généré et ignoré ; le plugin versionné est la source de vérité.

Signature locale : fournir exclusivement `YAZOO_UPLOAD_STORE_FILE`, `YAZOO_UPLOAD_STORE_PASSWORD`, `YAZOO_UPLOAD_KEY_ALIAS`, `YAZOO_UPLOAD_KEY_PASSWORD`. Aucun secret par défaut. Le keystore doit exister et ne doit pas être une clé debug. Les valeurs ne sont jamais imprimées.

Stratégie principale : EAS remote credentials + Google Play App Signing. Development crée un development client interne ; preview produit un APK interne signé ; production produit un AAB signé. Preview et production exigent une API HTTPS réelle sans localhost, IP, domaine d'exemple, credentials, query ou fragment, ainsi qu'une version et un versionCode valides.

## Actions propriétaire

Associer le projet EAS et le compte Play réels ; configurer l'environnement HTTPS production ; créer ou associer les credentials d'upload ; conserver les sauvegardes de clés ; publier les liens privacy/effacement validés ; compléter Data safety, fiche store et exigences de test applicables au compte. La QA physique Android sera exécutée par le propriétaire après cette mission.

```powershell
Set-Location C:\project\YaZoo\mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest credentials --platform android
npx.cmd eas-cli@latest build --platform android --profile preview
npx.cmd eas-cli@latest build --platform android --profile production
```

Ces commandes sont préparées et non exécutées. Aucun AAB local non signé/debug-signé ne doit être envoyé à Play.

Références : [credentials Expo](https://docs.expo.dev/app-signing/managed-credentials/), [configuration EAS](https://docs.expo.dev/build/eas-json/). Les résultats de compilation et du refus de fallback figurent dans [le rapport final](PRODUCTION_READINESS_AFWAJ_2026.md). Les audits npm complets restent RESIDUAL, avec runtime contrôlé dans [l'analyse des dépendances](DEPENDENCY_SECURITY_AFWAJ_2026.md).
