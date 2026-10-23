# Audit commercial — 14 octobre 2026

**ROUGE pour un lancement réel.** Audit de code et tests disponibles, pas certification de sécurité ou de conformité. Les parcours existants sont conservés. Les preuves historiques restent dans PRODUCTION_READINESS_AFWAJ_2026.md et VETERINARIAN_FULLSTACK_AUDIT_2026-10-14.md ; les résultats de cette session sont dans RELEASE_READINESS.md. Aucune donnée commerciale créée.

| Domaine | État | Risques | Corrections / preuves | Blocages | Priorité |
| --- | --- | --- | --- | --- | --- |
| Architecture | Partielle | Veille et absence de SLA | Topologie progressive documentée | Instance permanente, objectifs charge/budget | P1 |
| Sécurité | Partielle | Couverture non exhaustive, tooling vulnérable | Policies, CSRF, MFA admin, tests ; CI image showcase renforcée | Pentest indépendant, risque tooling accepté/traité | P1 |
| Base de données | Partielle | Drift schéma distant, restauration non prouvée | Transactions et 4 tests MySQL concurrence | Base commerciale séparée et restore drill | P0 lancement |
| Stockage | Partiel | R2 configuré ne prouve pas lecture/écriture réelle | Adaptateur privé, contrôles audience, tests mock | Bucket commercial, IAM, R2 exercice autorisé | P1 |
| Authentification | Testée localement | Livraison email/SMS et OAuth non attestée | Sanctum Web/mobile, redirection sûre, MFA admin | Fournisseurs réels, domaine et recovery QA | P1 |
| Professionnels | Partiels | Approbation technique ≠ droit d'exercer | Demandes/documents privés, modération et accès admin existants | Procédure documentaire et responsables habilités | P0 lancement |
| Marketplace | Partielle | Responsabilité vendeurs, vente animale réglementée | CRUD, modération, contact, réservations conservés | CGV, vendeurs réels, périmètre animaux validé | P1 |
| Réservations | Testées localement | Disponibilités sans exploitation continue | Verrous vétérinaire/client, garde-fous de transition | Calendrier professionnel réel et contrôle public autorisé | P1 |
| Paiements | Préparatoires/manuels | Callback signé sans vérification montant/devise corrigé localement | Contrôle strict ajouté, rejets testés ; idempotence existante | Kit CMI officiel, contrat, sandbox, homologation, réconciliation | P0 lancement si paiement en ligne |
| Notifications | Partiellement testées | log/sync n'assurent ni livraison ni retry durable | Notifications internes et polling existants | SMTP/API email/SMS, worker, alertes, consentements | P1 |
| Sauvegardes | Non attestées pour cloud | Perte irréversible DB/objets | Runbook local existant et plan cloud séparé | Sauvegarde réelle et restauration isolée chronométrée | P0 lancement |
| Conformité | Non validée | Traitements/transferts et obligations commerciales | Cartographie CNDP et pages juridiques existantes | Entité, juriste, CNDP, fiscalité, professions/animaux | P0 lancement |
| Support | Non opérationnel attesté | Incidents et litiges sans responsable | Procédure et seuils proposés | Contacts surveillés, astreinte et délais approuvés | P1 |
| Performance | Non mesurée commercialement | Pics SQL/médias/polling | Pagination/index/streaming existants | Charge isolée avec objectifs réels | P1 |

## Parcours et rôles

Visiteur : découverte/filtre/fiche ; propriétaire : session, réservation, message et historique ; professionnel : profil, disponibilités et transitions ; vendeur : annonces, commandes/réservations et confirmations manuelles ; administrateur : modération, justificatifs privés et MFA. Les tests des modules prouvent les scénarios couverts, pas toutes les combinaisons de rôles et d'UI. Matrice de 36 configurations sur la fiche vétérinaire, suite responsive générale avec mocks ; aucun audit visuel intégral de chaque dashboard commercial. Ne pas remplacer le design, supprimer le feed ou simplifier les modules pour prétendre terminer l'audit.

Professionnels : dépôt de justificatif, type métier, demandes pending, accès propriétaire/admin, décision et journal de modération existent. Il reste à définir pièces acceptées, contrôle de validité, inscription professionnelle, expiration/recontrôle, motifs de refus/suspension, appel et révocation du badge. Un badge est un état applicatif ; la validation réelle doit être faite par un humain autorisé avec traces, jamais par un seed. Contacts/adresse exacte réels restent volontairement non exposés dans la nouvelle fiche sans consentement produit explicite.

Marketplace : statuts réservation/commande, paiement manuel, historique, annulations, clôture et avis autorisés sont présents avec tests. Valider commercialement livraison, preuves de réception, commissions, facturation, fiscalité, remboursement et litiges ; le code ne garantit pas l'exécution de ces procédures. Les avis de rendez-vous ne disposent pas de publication/modération dédiée et ne sont pas exposés automatiquement.

Paiements : cash_on_pickup et manual_bank_transfer sont manuels ; pas de débit bancaire automatisé. « Sur place » n'est pas un nouveau connecteur livré ; confirmer le modèle métier avant de renommer les moyens existants. CMI est un adaptateur préparatoire HMAC, explicitement non certifié par le kit officiel ; désactivé sans les quatre gardes de configuration. Payzone/Stripe désactivés. Remboursement CMI non implémenté ; aucune réconciliation bancaire automatique démontrée. Le nouveau contrôle montant/devise doit être adapté au contrat officiel (ex. devise numérique) avant homologation, sans relâcher la validation. Aucun paiement réel ni appel au prestataire effectué.

## Obligations marocaines à qualifier

Sources officielles consultées le 14 octobre 2026. Ne pas déduire une conformité d'un preflight ou d'un test.

- Données personnelles : qualifier finalités/bases, information et droits, sécurité, rétention et formalités loi 09-08 ; déterminer déclaration/autorisation avec spécialiste. [Procédures CNDP](https://www.cndp.ma/procedures-de-notification-process/).
- Hébergement/sous-traitants étrangers : inventorier pays réels, contrats et accès ; la CNDP conditionne l'autorisation de transfert à l'approbation du traitement sous-jacent. [Transfert à l'étranger](https://www.cndp.ma/transfert-de-donnees-a-letranger/).
- Consommateur/vente à distance : identité du vendeur, prix/frais, livraison, annulation/rétractation applicable, réclamations et information avant contrat ; juriste pour exceptions et responsabilités marketplace. [Ministère, protection du consommateur / loi 31-08](https://www.mcinet.gov.ma/fr/content/protection-du-consommateur).
- Vétérinaires : exercice privé réglementé par loi 21-80 et décret d'application ; vérifier les justificatifs avec les autorités/Ordre et un conseil habilité. [ONSSA, textes officiels](https://www.onssa.gov.ma/reglementation/reglementation-sectorielle/sante-animale/medecine-veterinaire-privee/). Le mandat sanitaire est une autorisation spécifique, pas un badge YaZoo.
- Animaux : définir espèces, élevage, vente, transport, médicaments/alimentation et services effectivement proposés ; faire qualifier ONSSA et autres autorités compétentes, espèces protégées le cas échéant. Aucun agrément ni exemption revendiqué ; conserver les flags restrictifs tant que le périmètre n'est pas validé.
- Fiscalité/commerce : propriétaire et comptable doivent déterminer statut, RC/ICE/IF applicables, taxes, facturation, commissions et obligations de conservation selon l'activité réelle. Aucun taux fiscal inventé ; cette partie n'est pas un avis fiscal final.

À fournir par le propriétaire : identité de l'entité et responsable de traitement, adresse/contacts réels, RC/ICE/IF applicables, prestataires/contrats/régions, politique de rétention, CGU/CGV/privacy/cookies validées, formalités CNDP accomplies selon qualification, procédure de vérification professionnelle, périmètre légal animaux, contrat PSP si paiement, responsables support/incident. Aucune fausse coordonnée ajoutée.
