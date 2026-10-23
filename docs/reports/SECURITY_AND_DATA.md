# Securite et donnees — prototype DEMO

Web : cookie Sanctum HttpOnly, CSRF, changement d'epoque de session et barriere de deconnexion. Android : Bearer expirant en SecureStore, aucune conservation de credentials serveur dans le bundle. Les tests de permissions et MFA restent actifs. Aucune modification de mot de passe, APP_KEY ou MFA d'un compte existant pour la recette.

La cible TiDB est controlee contre les guards serveur et une connexion TLS reelle. Une sauvegarde chiffree a ete restauree en MySQL isole avec comparaison HMAC des lignes avant les mutations de recette. Les backups et credentials ne sont pas publies ; seuls les comptes, hashes et statuts non sensibles sont exportes. Aucun DROP/TRUNCATE/reseed/migration destructive sur la cible reelle. Les marqueurs de bootstrap et contenus historiques sont conserves. Rollback applicatif seulement, jamais restauration SQL automatique.

Le bucket R2 reste prive (r2.dev et domaines publics desactives). L'API controle proprietaire, audience, visibilite et etat de l'attachement. Les suppressions physiques suivent le commit et verifient les references restantes. Une recette operateur S3 ne remplace pas une verification applicative d'autorisation. Les cinq objets historiques absents restent signales ; ne pas les recreer avec des octets non prouves.

Le showcase utilise un manifeste de fichiers DEMO effectivement pre-scannes, lie aux hashes, MIME, tailles, proprietaires autorises et expiration. Ce n'est pas un service ClamAV general heberge. Un fichier different ou un manifeste expire doit echouer ferme. Aucun scanner ou controle n'est desactive pour accepter un upload.

Render Free peut dormir. Queue sync et processus Reverb supervises ne prouvent pas un scheduler quotidien ou une disponibilite 24/24. Le scheduler et le backup media automatique restent desactives lorsqu'ils ne sont pas fiables. Procedure operateur : sauvegarde verifiee, redemarrage de l'image validee avant jury si necessaire, lecture des logs de rafraichissement et verification des disponibilites publiques. Aucun ping artificiel pour eviter la veille.

Les alertes runtime et tooling sont separees. Une politique runtime PASS ne signifie pas audit npm complet propre. Sonar exclu a la demande du proprietaire ; CodeQL, secrets, audits et scans restent requis. Les revues contextuelles de faux positifs conservent leurs justifications et ne desactivent pas une regle.

COMMERCIAL PRODUCTION READY : NO. Aucune conformite CNDP/ONSSA, verification veterinaire reelle, autorisation de vente ou exercice professionnel n'est certifiee par ces tests. Les badges DEMO et dossiers de candidature ne constituent pas des justificatifs administratifs.

Le scan de la premiere candidate a detecte CVE-2026-111497 dans brotli-libs 1.2.0-r1. Les images exigent desormais la version corrigee >=1.2.1-r0 ; la construction Node et les jobs CI/EAS utilisent les versions de securite Node 22.23.4 / 24.22.1. Aucun ignore de CVE, seuil reduit ou exception Trivy n'est ajoute. Les nouveaux scans doivent confirmer le correctif sur les artefacts exacts.

L'avis [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) est corrige par Zod 4.6.7 dans les deux lockfiles. L'override mobile est limite a Expo CLI ; le SDK reste 57. Les vrais schemas de plugins/commandes Expo et le rejet des collections trop grandes font l'objet de tests, puis Doctor et export sont relances. Aucun alias vers l'ancien parseur v3, suppression d'avis ou nouvelle exception d'audit n'est utilise. La politique runtime reste inchangee ; les cinq alertes de tooling Node deja documentees ne deviennent pas un faux audit propre.

Source Node : [publication de securite du 21 octobre](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). La livraison locale utilise un binaire portable 24.22.1 verifie par SHA256 officiel, sans remplacer l'installation globale du poste.
