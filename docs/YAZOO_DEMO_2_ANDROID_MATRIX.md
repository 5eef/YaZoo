# YaZoo Demo 2.0 — couverture Android

Statuts de présence du code, distincts de la validation sur appareil. Package com.yazoo.pilot ; owner youssef5ef ; projet EAS 55196a69-8fc1-4849-be9f-c01964b0f9dd conservé. Aucun nouveau projet EAS ni soumission Play.

| Fonction | Statut | Composant / limite |
|---|---|---|
| Inscription / connexion Bearer | NATIVE_IMPLEMENTED | App.tsx, MobileAuthEntry, api/client, auth/session ; API mobile existante |
| SecureStore / restauration / expiration | NATIVE_IMPLEMENTED | auth/session ; invalidation des 401 existante |
| Déconnexion / changement de compte | NATIVE_IMPLEMENTED | App.tsx ; révocation serveur dépend du réseau, appareil à tester |
| Email de vérification / récupération | WEB_FALLBACK | Parcours email/web existants ; livraison Resend à valider |
| Google OAuth | MISSING | Aucun parcours natif raccordé |
| MFA administrateur / administration | WEB_FALLBACK | Interfaces web existantes ; aucun écran natif admin prétendu |
| Feed / navigation / recherche | NATIVE_IMPLEMENTED | useSocial, FeedScreen, feedModel |
| Publications texte / médias / édition / suppression | NATIVE_IMPLEMENTED | useSocial, Media ; upload antivirus hébergé bloqué |
| Likes / commentaires / réponses / réactions / partage | NATIVE_IMPLEMENTED | useSocial, PostActions ; permissions API conservées |
| Stories / consultation / suppression | NATIVE_IMPLEMENTED | useSocial ; création média dépend du scanner |
| Reels / vidéo | NATIVE_IMPLEMENTED | ReelsScreen, expo-video ; codecs/appareil à vérifier |
| Profils / avatar / couverture / suivi | NATIVE_IMPLEMENTED | useSocial, ProfileHeader ; médias nouveaux bloqués |
| Communautés / adhésion | PARTIAL | useSocial ; gestion fine des demandes et administration via web |
| Catalogue produits / favoris | PARTIAL | useSocial ; fiche détaillée ouvre le site |
| Animaux / fiches marketplace | WEB_FALLBACK | Liens du catalogue existant, pas d’écran natif inventé |
| Services / consultation | NATIVE_IMPLEMENTED | App.tsx, API services |
| Vétérinaires / filtres / profils / créneaux | NATIVE_IMPLEMENTED | App.tsx, ProfessionalCard ; données Laravel |
| Rendez-vous / transitions / avis vétérinaire | NATIVE_IMPLEMENTED | App.tsx ; permissions serveur |
| Réservations / historique / offres marketplace | WEB_FALLBACK | Liens web explicites du shell |
| Demandes de vérification professionnelle | WEB_FALLBACK | Lien web existant ; justificatifs protégés |
| Conversations / envoi / historique / non lus | NATIVE_IMPLEMENTED | App.tsx ; compteur par conversation |
| Temps réel pendant ouverture de l’app | PARTIAL | api/realtime.ts, autorisation Bearer ; protocole testé localement, APK/appareil non vérifié |
| Notifications / liste / marquage lu | NATIVE_IMPLEMENTED | useSocial ; réception privée ajoutée |
| Compteur global mobile / notification système arrière-plan | PARTIAL | Pas de preuve de compteur global complet ; aucun push système annoncé |
| Reconnexion / synchronisation / polling de secours | PARTIAL | Realtime + fallback App.tsx ; appareil réel à tester |
| Thèmes / FR EN AR / RTL | NATIVE_IMPLEMENTED | ThemeProvider, dictionnaires et direction existants ; changement RTL peut nécessiter redémarrage |
| Build preview signé / installation QR | PARTIAL | Profil et projet EAS conservés ; nouveau build après approbation |

Tous les tests ANDROID_DEVICE et parcours R2/WSS hébergés de la nouvelle release sont NOT_TESTED. Un export Hermes ou un échange du module client sous Node ne constitue pas une installation Android.
