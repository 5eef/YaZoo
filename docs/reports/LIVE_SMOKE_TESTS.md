# Recette des services reels

Les executions horodatees et codes HTTP sont dans `output/release-unified-20261023/`. Une ligne ci-dessous definit un controle ; son resultat effectif doit etre lu dans le JSON du SHA concerne, pas deduit du plan.

| Cible | Methode / scenario | Attendu |
| --- | --- | --- |
| Render /health/live, /health/ready | GET, version et services | 200, SHA final, DB/R2/Reverb prets |
| Pages /api | GET proxy | JSON 200, aucune duplication /api |
| Pages /api/auth/me | GET anonyme / Bearer / cookie | 401 puis identite attendue avec session |
| /sanctum/csrf-cookie et /auth/login | GET puis POST navigateur | Cookie CSRF et connexion ; aucune fuite de cookie |
| /broadcasting/auth | POST canal propre / autre compte | Autorisation propre, refus 403 pour tiers |
| WSS /app/{cle-publique} | Deux comptes fictifs | Message rendu sans reload, notification, native protocol, rattrapage |
| /api/messages/unread-count | GET avant / apres message | Compteur augmente hors conversation, pas de donnees croisees |
| /api/users/{id} | PATCH bio QA puis GET | Persistance puis restauration exacte du texte precedent |
| Veterinaires et RDV | GET liste/disponibilites, POST QA, PATCH annulation | Profil DEMO, creation fictive, conflit refuse, seul notre RDV annule |
| Medias API | POST fixture autorisee, GET/HEAD/Range | Octets attendus, 206 et refus tiers ; pas de media reel supprime |
| R2 cle qa/unified-20261023/ | PUT/GET/Range/PUT puis GET apres redeploiement et DELETE | Isolation par cle aleatoire et metadata QA ; uniquement notre objet nettoye |
| Resend / Laravel | Email, recuperation et verification | Acceptation fournisseur et reception distinctes ; aucun mot de passe imprime |

Responsive : 320, 375, 390, 768, 1024, 1440 pixels, FR/EN/AR, clair/sombre. Les tests avec API simulee restent identifies comme locaux/mocks ; une capture navigateur ne constitue pas une capture Android. Le telephone est NON TESTE si aucun appareil n'est accessible.
