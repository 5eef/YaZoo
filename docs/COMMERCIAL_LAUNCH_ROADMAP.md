# Feuille de route vers le lancement

Deux portes indépendantes : showcase fonctionnel fictif, puis production réelle isolée. Aucun délai ou budget engagé sans validation propriétaire.

| Porte | Travail | Preuve de sortie | Intervention nécessaire |
| --- | --- | --- | --- |
| 1 — Release showcase | Réconcilier commit mobile distant, revue manifeste, commit/push, CI, image SHA/digest, capture rollback | CI verte, artefact testé exact | Autorisations publication et accès comptes |
| 2 — Cutover showcase | Render puis Pages selon branche réelle ; tests lecture et parcours fictifs autorisés | Version/API/frontend/médias confirmés, réservation/message persistants | Autorisation cutover et mutations publiques délimitées |
| 3 — Exploitation | Environnement commercial séparé, instance disponible, queues/scheduler, email/recovery et monitoring | Preflight et alertes, tests échec/reprise/charge | Budget, objectifs de service, comptes/domaine/secrets via consoles |
| 4 — Données | Backups DB/R2 indépendants, rétention, export/effacement | Restauration isolée datée et RPO/RTO mesurés | Accès backup et politique approuvée |
| 5 — Métier | Onboarding vétérinaire/vendeur/prestataire, modération, annulation/livraison/clôture/avis | Parcours avec professionnels autorisés et responsabilités documentées | Vérificateurs humains, support et conditions réelles |
| 6 — Droit | Entité, CNDP/traitements/transferts, CGU/CGV/privacy/cookies, fiscalité, professions et animaux | Documents/recevabilités authentiques validés | Propriétaire, juriste, comptable, autorités compétentes |
| 7 — Paiements si requis | Kit officiel PSP, sandbox, signatures/settlement/replay, remboursements/réconciliation/factures/litiges | Homologation et recette sandbox, aucun débit réel pendant préparation | Contrat, accès sandbox, validation PSP et propriétaire |
| 8 — Lancement limité | Pentest/charge, support/incident, critères d'arrêt, revue finale | Tous bloqueurs P0 résolus et P1 acceptés explicitement | Autorisation commerciale finale distincte |

Un lancement de mise en relation sans paiement intégré peut être étudié, avec paiements en ligne désactivés ; cela ne dispense ni des règles des professionnels, ni des données personnelles, ni des obligations de consommateur applicables. Ne pas activer cette variante sans validation finale. Ne pas renommer un bloqueur en recommandation pour passer une porte.
