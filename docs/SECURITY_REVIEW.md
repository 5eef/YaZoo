# Security review — startup 2026

**État de clôture du 8 octobre 2026 : runtime Web/mobile PASS, Composer audit PASS, Gitleaks PASS, Docker HIGH/CRITICAL zéro.** Les audits npm complets restent RESIDUAL (Web 5 HIGH, mobile 19 HIGH), exclusivement dans les chaînes de build documentées. Le risque URI runtime est corrigé. Les sections antérieures conservent l'historique des findings ; la section « Fermeture des blocages logiciels » et PRODUCTION_READINESS_AFWAJ_2026.md donnent l'état actuel.

## Corrections et protections vérifiées
MongoDB PHP 2.4.2 du changement initial conservé, extensions Docker alignées 2.4.1 pour production et démo. Composer audit ne signale aucun advisory lors de l’exécution locale. PRIVATE_STORAGE_PATH vide utilise le stockage privé local. Diagnostic Mongo ne retourne plus URI ni message d’exception susceptible de contenir des credentials.

Auth natif séparé : device_name obligatoire, mêmes FormRequests/AuthService que le Web, token JSON uniquement mobile, no-store, expires_at ; logout révoque le token. Cookie HTTP-only et middleware CSRF Web inchangés. Les tests existants couvrent CSRF cookie, origine refusée et Bearer sans cookie ; les nouveaux tests couvrent connexion/inscription/invalidité/révocation mobile. SecureStore côté client, aucun logging Authorization ajouté.

Les policies/transactions existantes contrôlent participants, transitions, documents privés, reviews après achèvement, admin/MFA et modération. Les tests couvrent réservations, rendez-vous, messages, privacy et paiements ; cela ne remplace pas un pentest externe. Les compteurs ne collectent aucune PII et n’autorisent pas l’envoi d’un nom d’événement arbitraire par un client.

## Dépendances — avis ouverts documentés
Frontend : chaîne Tailwind 3 → chokidar/micromatch/fast-glob → braces 3.0.3, GHSA-vfj7-8cjw-p6xm, DoS sur patterns profondément imbriqués. Le registre ne fournit pas de version braces corrigée au moment du contrôle. npm propose Tailwind 4, migration majeure ; non appliquée pour préserver le showcase. Le code n’envoie aucun pattern API à ces outils ; compilation depuis sources de confiance uniquement. Cette limitation justifie une exception temporaire de tooling, pas un audit PASS. Suivre correctif amont/migration contrôlée avant publication commerciale. PostCSS selector parser vulnérable remplacé par override 7.1.6 et CSS/tests/build revalidés.

Mobile : avis transitifs Metro/braces (même DoS), Expo/node-forge (vérification RSA GHSA-86w9-cpqp-85rv) et xcode/uuid (bounds check GHSA-w5hq-g745-h8pq). `npm audit fix` sans force exécuté ; les propositions force entraînent downgrade incompatible d’Expo. Aucun OTA signé ni certificat externe accepté par le produit n’est implémenté ; builds locaux de confiance, pas de réception de patterns utilisateur dans Metro. Ne pas activer un canal OTA signé ni traiter des certificats non fiables sans résolution/revue de node-forge. Contrôler les avis amont avant diffusion et conserver audit FAIL tant qu’ils existent.

Les advisories ne sont pas assimilés à des failles prouvées du parcours API, ni ignorés. Les audits complets de CI restent bloquants sur ces avis ; il faut résoudre la chaîne ou faire approuver explicitement une exception de risque tooling à durée limitée par le propriétaire. Aucun filtre silencieux d’audit ajouté.

Après ajout d’Expo Router, l’audit mobile compte 30 alertes (19 hautes, 11 modérées, zéro critique). Un avis supplémentaire concerne decode-uri-component <=0.4.2 via query-string : DoS sur paramètres percent-encoded malformés (GHSA-vcc3-ghjq-m6fr). Ce risque touche potentiellement la navigation native, pas uniquement le tooling. La version corrigée 0.5.0 est ESM, alors que query-string utilise require et attend une fonction CommonJS ; un override aveugle casserait cette API. Résolution compatible de la chaîne Router et test des liens malformés requis avant diffusion publique. La mise à jour Router majeure suggérée par npm n’a pas été appliquée hors compatibilité du SDK 57. Ne pas considérer le build réussi comme validation de sécurité des deep links.

## Secrets et rotation
Vrais .env non suivis selon git ls-files ; exemples seuls. Ignorés : .env, vendor/node_modules, clés, keystores, APK/AAB, android/ios CNG et credentials de service. Ne jamais inclure .env dans un contexte Docker. Le scan haute confiance des 908 fichiers suivis n’a détecté aucun secret. Gitleaks a ensuite été exécuté sur l’historique via Docker avec redaction complète : sortie FAIL, 250 alertes generic-api-key. Analyse sans affichage des valeurs : 245 identifiants d’issues/hotspots Sonar dans des rapports JSON, quatre références publiques d’images Docker et une phrase de présentation Key Vault. Aucun credential compromis confirmé. Le rapport brut expurgé reste local dans output/ ignoré ; aucun filtre global ni effacement d’historique ajouté. Les clés de test documentées et fixtures ne sont pas des credentials de production.

Toute valeur serveur déjà publiée dans l’historique ou un log : rotation obligatoire (DB/Mongo/SMTP/OAuth/CMI/APP_KEY selon nature), révocation des tokens associés et vérification des logs. Ne pas copier la valeur dans un ticket. Aucun secret compromis n’est revendiqué sans preuve.

## Priorités
P0 : incident de secret/PII, contournement auth, document privé public → blocage immédiat.
P1 : vérifier distribution Android, auth API sur vraie cible, sauvegarde/restauration, risques tooling, vraie information juridique et canaux support.
P2 : pagination mobile au-delà de la première page, tests TalkBack/RTL appareil, rétention des agrégats et polish.
P3 : feed/stories/communautés natives complètes, paiement live, vente animale publique, rebranding non validé.

Recherche TODO/FIXME/HACK/XXX dans app/src/scripts/workflows : aucune occurrence actionable détectée lors du scan initial. Les anciens rapports et archives décrivent leur époque ; ne pas les considérer comme preuves actuelles.

Docker : bootstrap/cache/*.php, dossiers de credentials/outils locaux et output sont exclus du contexte. Le cache Laravel peut contenir des secrets après config:cache ; il doit être recréé sur la cible avec ses variables. Le contrôle local des fichiers modifiés/créés détecte zéro secret selon les motifs haute confiance ; aucun contenu de .env lu dans les rapports.


## Revue corrective du 7 octobre 2026 — audits réellement exécutés

Frontend : **FAIL**, 5 high, 0 moderate, 0 critical. Mobile : **FAIL**, 22 alertes, dont 19 high et 3 moderate, 0 critical (initialement 30 : 19 high / 11 moderate). Composer : **PASS**, aucun advisory. Les comptes incluent la propagation aux paquets parents ; ils ne correspondent pas à 27 CVE différentes.

| Advisory | Projet | Package/version | Severity | Runtime/Dev | Exploitable dans YaZoo ? | Fix | Décision |
|---|---|---|---|---|---|---|---|
| GHSA-vfj7-8cjw-p6xm | Frontend | braces 3.0.3 | High | Build, transitive | DoS si patterns imbriqués non fiables fournis aux outils ; aucun chemin API → pattern trouvé | Aucune version braces corrigée au registre consulté ; npm propose Tailwind 4.3.3 | FAIL audit ; pas de migration majeure CSS improvisée. Sources de build de confiance et suivi amont |
| GHSA-vfj7-8cjw-p6xm | Mobile | braces 3.0.3 | High | Metro/build, transitive | Même condition ; Metro ne doit pas être exposé publiquement | Aucun correctif compatible confirmé ; proposition npm Expo 44 incompatible avec SDK 57 | FAIL audit ; conserver SDK compatible, résolution amont requise |
| GHSA-86w9-cpqp-85rv | Mobile | node-forge 1.4.0 | High | Tooling certificats Expo, transitive | Vérification RSA vulnérable si certificats/signatures non fiables traités. Pas de canal OTA signé configuré ; ne pas généraliser cette limitation à une future OTA | Dernière version consultée encore affectée ; downgrade Expo proposé inacceptable | FAIL audit ; revue préalable avant OTA/signature distante |
| GHSA-vcc3-ghjq-m6fr | Mobile | decode-uri-component 0.4.2 | Moderate | Runtime navigation, transitive | Potentiel DoS via paramètres URI malformés ; risque runtime non écarté | 0.5.0 ESM incompatible avec require de query-string 7.1.3 ; Router 58.0.16 proposé hors SDK actuel | FAIL ; correctif compatible et QA deep links requis avant distribution publique |
| GHSA-w5hq-g745-h8pq | Mobile | uuid 7.0.3 → 11.1.1, parent xcode 3 | Moderate | Prebuild/build, transitive | Parent inspecté utilise v4, pas les fonctions v3/v5/v6 affectées | Override limité xcode.uuid=11.1.1 ; exports CommonJS conservés | Corrigé, 8 alertes propagées retirées. Test génération 1000 identifiants, doctor, export, prebuild et debug validés |

Chaînes vérifiées : Tailwind 3.4.19 → chokidar / fast-glob / micromatch → braces ; React Native/Metro → metro-file-map/micromatch → braces ; Expo/@expo/cli et expo-updates → @expo/code-signing-certificates → node-forge ; expo-router 57.0.25 → query-string 7.1.3 → decode-uri-component ; Expo prebuild/config plugins → xcode 3 → uuid. Aucun override React Native/Metro, aucun audit-level ni audit fix --force utilisé dans cette correction.

Les autres mises à jour non cassantes disponibles ne résolvaient pas les versions racines de ces advisories. Le changement Composer exact 2.4.2 → ~2.4.2 autorise uniquement les correctifs compatibles ; lock conservé à 2.4.2, validation stricte et audit réussis.

Protection supplémentaire du client natif : une réponse authentifiée en vol est rejetée si le token a changé entre requête et réponse, pour empêcher une réapparition de données privées après déconnexion/changement de compte. Test dédié réussi. Les uploads natifs utilisent FormData sans imposer un Content-Type incorrect ni cookies. Les erreurs ne recopient ni réponse brute ni headers.

Références advisories : [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [URI](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Les exceptions de tooling n’équivalent pas à un audit PASS. Le risque URI runtime reste une action avant diffusion publique.

Le classement historique P3 des fonctions sociales natives est remplacé par la décision produit : feed, communautés et profil appartiennent à l’expérience YaZoo, avec priorité commerciale vétérinaires. Paiements et vente animale publique restent sous leurs flags.
## Revue finale locale du 8 octobre 2026

Périmètre : worktree local faisant autorité ; aucun commit, push ou test téléphone. Les priorités ci-dessous concernent les constats consolidés de cette passe, pas un décompte exhaustif de toutes les lignes modifiées auparavant.

| Finding | Severity | Component | Exploitability | Fix | Test | Status | Residual risk |
|---|---|---|---|---|---|---|---|
| F01 Médias de posts privés accessibles par chemin public | P0 | API/Nginx/Web | Connaissance d'une URL de fichier | Nouveaux uploads sur disque privé ; route autorisée GET/HEAD/Range ; cache privé/no-store ; blocage Nginx du chemin historique feed/posts ; URLs Web corrigées | PostMediaSecurityTest, FeedApiTest, media.test.js | PASS | Inventorier anciens fichiers, copies CDN et URLs externes ; configuration équivalente requise sur tout autre hébergeur |
| F02 Préflight acceptant debug/cookies/clé/proxies/CORS dangereux | P1 | API config | Mauvais déploiement | Validation stricte des paramètres et clé ; refus wildcard proxies/CORS credentialed | ProductionLegalPreflightTest, OperationsReadinessTest | PASS | Configuration réelle et documents légaux restent à fournir |
| F03 Objets/tableaux transformés en chaînes avant validation | P1 | API validation | Requêtes malformées provoquant 500 | Préserver types jusqu'à validation ; normalisation conditionnelle ; bail conversation | MalformedInputSecurityTest | PASS | Tests ciblés, pas preuve formelle de tous les endpoints |
| F04 Vulnérabilités système fixables dans images | P1 | Docker | Bibliothèques OpenSSL/expat/uuid/pcre2 | Mise à jour ciblée des paquets runtime Alpine | Trivy images finales | PASS | Résultat dépend de la base CVE du jour ; rescanner chaque build |
| F05 Mobile absent du workflow CI principal | P1 | CI | Régressions non détectées | Job indépendant réutilisable, Node24, Expo check/doctor, lint/types/tests/export/audit ; SBOM | Commandes locales équivalentes ; revue YAML | PASS | Exécution GitHub après commit reste à observer |
| F06 Advisories npm et gate sécurité non vert | P1 | Frontend/mobile | Braces et forge : principalement tooling ; URI : runtime DoS | Analyse publiée ; override uuid compatible conservé ; aucune major incompatible ni exception silencieuse | npm audit JSON, test xcode, Expo doctor | FAIL | 5 HIGH Web tooling ; mobile 19 HIGH/3 MODERATE ; diffusion publique bloquée jusqu'à résolution/revue |
| F07 Exceptions 5xx HTTP révélant détails en production | P2 | API | Erreur serveur avec message sensible | Masquer messages 5xx en APP_DEBUG=false | ProductionErrorLeakageTest | PASS | Journaux serveur à protéger séparément |
| F08 Signalement de post privé donnant oracle d'existence | P2 | API | ID connu d'un post privé | Scope visibleTo avant recherche | ReportApiTest | PASS | Autres politiques couvertes par suite existante |
| F09 Réponses JSON mobiles invalides et URLs malformées | P2 | Mobile | API/proxy dégradé | Erreurs sûres ; statut préservé ; 204 géré ; pas de retry POST ; auth uniquement URL valide | network-errors.test.mjs | PASS | Réseau natif et OS non testés sur téléphone |
| F10 Reels avec IDs dupliqués ou média retiré | P2 | Mobile | Pagination/rafraîchissement concurrent | Fusion par ID ; suppression entrée sans vidéo ; clé du player par URI | reels.test.mjs et tests statiques vidéo | PASS | Cycle de vie natif release/theme/navigation à valider sur appareil par le porteur |
| F11 Réponses discovery périmées après changement locale/unmount | P2 | Mobile | Requêtes hors ordre | Version requête, garde mount, cleanup | Typecheck/lint/tests ; inspection du code | PASS | Aucun test React Native monté pour ce chemin |
| F12 Sauvegarde média annonçant succès après échec | P2 | Backup | Stockage indisponible | Fail-closed lecture/écriture ; fermeture streams ; ne pas purger anciens backups ; snapshot privé obligatoire | MediaBackupFailureTest ; restauration SQL isolée | PASS | Restauration médias réels/GridFS non démontrée |
| F13 HSTS sur HTTP/local et streaming GridFS sans Range | P2 | API/Nginx | Configuration locale, lecture vidéo | HSTS conditionnel hors localhost ; parser Range partagé ; 206/416/HEAD avec fermeture stream | verify-frontend-headers, ByteRangeTest, filesystem Range | PASS | GridFS Range implémenté mais integration Mongo réelle non exécutée dans cette passe |
| F14 Gitleaks brut et revue historique | P2 | Git | Faux positifs bloquant scanner ; secrets locaux ignorés | Scan index/worktree/history ; classification sans valeurs ; aucune réécriture/allowlist globale | Rapports Gitleaks redacted | FAIL | Revue explicite des empreintes publiques/Sonar requise pour obtenir un scanner vert |

Constat additionnel F15 : **P2**, migration `2026_05_03_180000_add_scaling_indexes.php` : rollback MySQL refusé car l'index composite était le seul support d'une foreign key. Correction : rétablir l'index simple manquant avant suppression. Test : rollback puis migrate, puis cycle complet supplémentaire sur MySQL8.4 jetable, exit0. **PASS** ; aucun rollback complet effectué sur données réelles.

Comptage consolidé : **P0 1 trouvé / 1 corrigé / 0 restant ; P1 5 trouvés / 4 corrigés / 1 restant ; P2 9 trouvés / 8 corrigés / 1 restant.** Les états PASS d'un correctif ne lèvent pas les actions de déploiement décrites dans Residual risk.

### Secrets : classification sans valeurs

| Type | File | TRACKED/UNTRACKED | ROTATION NEEDED |
|---|---|---|---|
| Identifiants DB/Redis/Sonar locaux | .env, backend/.env, backend/.env.before-startup-demo | UNTRACKED, IGNORED | NO — aucune exposition Git confirmée ; renouveler si partagés ailleurs |
| Identifiants Sonar non secrets | sonar-issues.json, sonar-hotspots.json (historique) | TRACKED/history | NO |
| Tags publics Docker | README.md, DEPLOYMENT_YAZOO_FINAL.md, docs/DEMO_DEPLOYMENT_FREE.md, docs/POST_DEPLOYMENT_VERIFICATION.md (historique/index) | TRACKED/history | NO |
| Description KeyVault | scripts/build_yazoo_soutenance_pptx.py (historique) | TRACKED/history | NO |
| Clés et tokens de fixtures/exemples dépendances | vendor/, mobile/android/**/build/, output/ | UNTRACKED, IGNORED | NO — données synthétiques/exemples ; ne pas distribuer |

Gitleaks brut : 250 alertes historique, 29 worktree, 2 index exporté. Aucun credential réel commité confirmé après classification ; les scans restent FAIL tant que les faux positifs ne sont pas traités par revue ciblée. Si une valeur réelle est confirmée : **ROTATION REQUIRED ; HISTORY CLEANUP REVIEW REQUIRED**. Ne jamais réécrire automatiquement l'historique ni afficher ces valeurs.

CodeQL couvre JS/TS, y compris mobile une fois commité ; exécution distante non revendiquée. PHP n'est pas un langage [supporté officiellement par CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning). Composer audit, tests négatifs et analyse locale PHP restent les contrôles disponibles ; Sonar n'est pas rendu obligatoire par l'absence de token.

## Fermeture des blocages logiciels — 8 octobre 2026

Cette section remplace les statuts historiques F06 et F14 ci-dessus. Le décodeur URI runtime est corrigé avec la version upstream 0.5.0 derrière un adaptateur CommonJS compatible avec query-string ; tests URI malformées/Unicode et export Metro réussis. Frontend : audit complet 5 HIGH, runtime 0. Mobile : audit complet 19 HIGH, 0 MODERATE/CRITICAL ; braces, forge et certificate tooling absents du graphe Android livré, décodeur corrigé présent. Les audits complets restent **RESIDUAL**, jamais NPM PASS. Voir DEPENDENCY_SECURITY_AFWAJ_2026.md pour advisories, chaînes, versions et risque de build.

Gitleaks avec redaction totale : historique 144 commits, snapshot index et snapshot du worktree versionné sans findings après revue ciblée. Les allowlists imposent fichier exact et valeur exacte pour les tags Docker publics et identifiants Sonar ; seule la phrase historique Key Vault utilise une empreinte de finding exacte. Aucune règle globale désactivée, aucun répertoire entier exempté. Les secrets locaux ignorés ne sont pas des livrables et ne sont pas copiés dans les snapshots. Aucun secret réel confirmé, aucune rotation nécessaire identifiée dans Git.

Guards supplémentaires : refus des identités DB et credentials CMI placeholders ; aucune signature release debug silencieuse ; contrôle des tâches release dans le graphe Gradle ; smoke Docker fail-closed si l'inspection des processus échoue. Trivy CI inclut les HIGH/CRITICAL non corrigées. Le scan actuel a identifié CVE-2026-4775 dans libtiff de l'image Web ; mise à jour ciblée vers la version corrigée disponible, résultat final dans le rapport production.

Laravel : 425 tests / 2358 assertions ; concurrence MySQL réelle 14 / 94 ; GridFS réel 1 / 20 ; Web 155 tests / 101 E2E. La première relance MySQL sur montage Windows n'atteignait pas la barrière ; l'exécution des mêmes assertions sur filesystem du conteneur passe. Aucun test ni assertion désactivé. CodeQL reste **PENDING REMOTE CI** ; aucun commit/push effectué.

Les actions externes restent : configuration/secrets, domaines et infrastructure réels, revue juridique/CNDP, comptes EAS/Play et vraie clé d'upload, QA physique par le propriétaire. La fermeture technique ne revendique aucun déploiement, autorisation ni publication store. Les résultats définitifs et priorités sont dans PRODUCTION_READINESS_AFWAJ_2026.md.

Le démarrage public production exige désormais le preflight et refuse YAZOO_RUN_PRODUCTION_PREFLIGHT=false. Seul le profil de démonstration showcase garde une exception explicite. Le guard shell vérifie réussite, échec propagé, modes invalides et refus du bypass. APP_KEY à octets répétés est refusée même lorsque sa longueur respecte le cipher.

Dernier alignement CI : ContactController retourne explicitement la réponse métier 503 localisée et Retry-After=300 lorsque le destinataire est absent. Ce message constant ne contient aucun détail interne ; les exceptions HTTP 5xx arbitraires restent masquées. ContactApiTest impose APP_DEBUG=false et conserve ses assertions, avec vérification supplémentaire de Retry-After. Suite complète finale avec APP_DEBUG=false : 425 tests / 2358 assertions PASS, Pint PASS et Composer audit zéro.
