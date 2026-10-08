# Mesure du pilote

Aucune valeur actuelle de traction n’est revendiquée. Exclure fixtures, seeds, démonstrations et tests. `PILOT_METRICS=true` uniquement sur une base pilote séparée ; défaut false. Pas de SaaS ajouté.

## Implémentation
`pilot_daily_counters` contient seulement `day`, `event`, `count`. Middleware `CountPilotConversions` compte les réponses API réussies des routes autorisées ; il ne copie ni corps, ni requête de recherche, ni token, ni ID, ni IP. Incrément transactionnel ; échec de mesure journalisé sans contexte PII et sans faire échouer le rendez-vous. Les événements peuvent manquer en cas de panne : suivre `pilot.metrics_write_failed`. Pas de fingerprint, identifiant de visiteur, session analytics ou cookie supplémentaire.

Les API admin BusinessKpiService existantes exposent des clés plates `pilot_*` et les comptages métier ; export CSV conservé. Accès admin/MFA existant. Cache de cinq minutes. Les métriques de stock métier sont différentes des événements : une demande créée puis complétée dans une autre période reste une même demande.

| KPI | Source | Interprétation |
| --- | --- | --- |
| Découvertes/recherches | `professional_discovery` | Requêtes réussies de catalogue soins, pas personnes uniques |
| Vues profil | `professional_profile_view` | Requêtes de fiche, les rafraîchissements comptent |
| Demandes rendez-vous | `appointment_requested` et table appointments | Demandes créées, pas confirmations |
| Réservations | `reservation_requested` et table reservations | Distinguer services des autres reservables dans l’analyse métier |
| Acceptées/refusées/terminées/annulées | `appointment_confirmed/rejected/completed/cancelled` et KPI métier | Transitions validées et état actuel, deux mesures distinctes |
| Conversations initiées | `conversation_started` / ActivityLog existant | Uniquement nouvelle conversation (201), pas réouverture |
| Avis éligibles/publiés | Appointments terminés sans review / reviews + `appointment_review_published` | L’éligibilité vient des policies, jamais de la seule UI |
| Inscriptions propriétaires | `account_registered`, Users | Inscription ne prouve pas rôle propriétaire ; qualifier au pilote |
| Candidatures et vérifications | ProfessionalVerification + KPI existant | Approved ne signifie pas certification publique |

Conversions agrégées indicatives : demandes/vues ; confirmées/demandes ; terminées/confirmées ; avis/expériences éligibles. Dénominateur nul → non calculable. Ces ratios ne constituent pas un funnel individuel ni causal : aucun suivi de personne n’est ajouté. Pour une cohorte métier, analyser les demandes autorisées dans l’administration avec accès restreint, sans exporter de PII dans un dossier AFWAJ.

Comparer périodes et villes via les objets métier autorisés, pas via collecte d’une nouvelle géolocalisation. Définir objectifs et seuils avant lancement, puis rapporter les valeurs effectivement observées avec période et méthode. La durée de conservation des agrégats doit être validée ; pas de purge automatique ajoutée à ce stade.
