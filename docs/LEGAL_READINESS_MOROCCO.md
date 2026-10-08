# Préparation juridique et données personnelles — Maroc

**Ce dépôt ne prouve aucune conformité administrative obtenue.** YaZoo est une plateforme de mise en relation, pas un vétérinaire, organisme public ou certificateur officiel. Conseil juridique local requis avant publication du pilote.

## Informations à compléter
Raison sociale : À RENSEIGNER. Statut juridique : À RENSEIGNER. ICE : À RENSEIGNER. RC : À RENSEIGNER. Adresse : À RENSEIGNER. Responsable du traitement : À RENSEIGNER. Contact privacy : À RENSEIGNER. Numéro/récépissé CNDP : À RENSEIGNER après démarche réelle. Aucune valeur fictive ne doit servir à faire passer le preflight.

## Checklist
- [CODE READY] Pages privacy/CGU/confiance existantes en FR/AR/EN ; configuration juridique via API.
- [CODE READY] Consentements existants, demandes d’export et suppression, accès aux documents privés contrôlé, suppression avec suivi/retry.
- [CODE READY] Cookie d’authentification Web HTTP-only et CSRF ; mobile SecureStore avec révocation de token.
- [CODE READY] Compteurs pilote agrégés sans PII, désactivables, sans identifiant de visiteur ni cookie analytique ajouté.
- [CODE READY] `php artisan yazoo:preflight-production --configuration-only` refuse les mentions absentes/example.com/« À RENSEIGNER »/placeholders. Les environnements local et test ne l’exécutent pas automatiquement. Les autres exigences opérationnelles du preflight restent actives.
- [OWNER ACTION REQUIRED] Renseigner les informations exactes et un contact privacy surveillé ; valider le délai de réponse, les durées de conservation et l’exécution effective des demandes.
- [OWNER ACTION REQUIRED] Cartographier comptes, coordonnées, rendez-vous, messages, justificatifs, journaux, sauvegardes, fournisseurs email/SMS/OAuth et accès admin.
- [LEGAL REVIEW REQUIRED] Déterminer les bases et finalités de chaque collecte, information des personnes, consentements nécessaires, droits, modération, responsabilité du professionnel, CGU et mentions légales.
- [LEGAL REVIEW REQUIRED] Définir les durées par catégorie, les obligations justifiant une conservation après suppression, le cycle de purge des sauvegardes et la confidentialité des documents professionnels. Le compteur journalier n’a pas encore de purge automatique : fixer une durée et programmer celle-ci si nécessaire.
- [CNDP ACTION REQUIRED] Identifier déclaration/autorisation applicable, constituer et déposer le dossier, conserver les preuves authentiques ; afficher un numéro uniquement après attribution réelle.
- [CNDP ACTION REQUIRED] Qualifier les transferts internationaux et démarches adaptées, après qualification du traitement sous-jacent.
- [OWNER ACTION REQUIRED] Vérifier les contrats, régions et accès de Render, Cloudflare, TiDB et tout stockage/SMTP réellement choisi. Une marque de fournisseur ne prouve pas la région effective ni un contrat signé.
- [LEGAL REVIEW REQUIRED] Examiner sous-traitants, transferts à l’étranger, clauses, sécurité, sauvegardes et accès depuis d’autres pays. La [CNDP](https://www.cndp.ma/notifier-un-traitement/) indique que l’autorisation de transfert dépend de l’approbation du traitement sous-jacent ; voir les [procédures de notification](https://www.cndp.ma/procedures-de-notification-process/).
- [OWNER ACTION REQUIRED] Tester la réponse aux demandes d’accès/rectification/suppression, le support et la modération avec des responsables réels.
- [LEGAL REVIEW REQUIRED] Réexaminer la vente d’animaux avant toute activation publique. Le feature flag ne constitue pas une autorisation juridique.
- [OWNER ACTION REQUIRED] Garder paiements automatisés OFF ; valider contrats et sandbox avant activation.

Sources officielles consultées le 7 octobre 2026. Ce document prépare les questions à traiter ; il ne délivre pas d’avis juridique et n’invente pas de formalité accomplie.
## Revue finale — 8 octobre 2026

| Domaine | État | Action |
|---|---|---|
| Contrôles techniques de confidentialité, export/effacement et médias protégés | CODE READY | Limites et preuves dans PRODUCTION_READINESS_AFWAJ_2026.md ; revoir les anciens fichiers publics |
| Entité, RC/ICE, adresse, contacts, hébergeurs et sous-traitants | OWNER ACTION REQUIRED | Renseigner uniquement des données réelles et contrats vérifiés |
| Conditions, politique privacy/cookies, rétention, responsabilité et badges | LEGAL REVIEW REQUIRED | Faire valider les textes et les pratiques effectives avant collecte publique |
| Formalités et transferts de données | CNDP ACTION REQUIRED | Déterminer et accomplir les formalités applicables ; aucun récépissé n'est revendiqué |
| CMI | OWNER ACTION REQUIRED | Rester désactivé sans contrat, sandbox, homologation et configuration complète |

Un preflight technique réussi ne prouve aucune autorisation administrative. Consulter les [formalités CNDP officielles](https://www.cndp.ma/notifier-un-traitement/) ; leur applicabilité au traitement effectif exige une revue humaine. Aucun revenu, partenaire, entité constituée ou agrément n'est attesté par ce dépôt.

## Clôture technique AFWAJ

La cartographie est maintenant disponible dans [CNDP_DATA_MAP.md](CNDP_DATA_MAP.md), avec rétention et pays **TO VALIDATE**. La liste des seules démarches humaines figure dans [CNDP_OWNER_ACTIONS.md](CNDP_OWNER_ACTIONS.md). **LEGAL CODE READINESS = PASS** : confidentialité, export/effacement, médias privés et guards de placeholders disponibles et testés. **CNDP ADMINISTRATIVE = OWNER ACTION REQUIRED** : identité, sous-traitants/pays, transferts, durées et formalités applicables restent à faire valider. Aucun numéro fictif ni approbation administrative n'est ajouté.
