# YaZoo Startup 2026 — préparation d’une phase pilote

**Statut présenté : MVP technique en préparation de pilote.**

Ce document décrit le produit et les éléments vérifiables dans le dépôt. Il ne constitue pas une preuve de société constituée, de pilote autorisé, de partenariat, de professionnels réels, de transactions effectuées ou d’homologation.

## Proposition

YaZoo met en relation les propriétaires d’animaux au Maroc avec des professionnels animaliers dont le profil peut faire l’objet d’une vérification par YaZoo. Les propriétaires peuvent consulter les profils et services, demander un rendez-vous vétérinaire, échanger par messagerie et publier un avis après une activité éligible terminée.

Le marché d’annonces, le fil social et les communautés restent des fonctionnalités complémentaires.

## Parcours démontrables dans le code

| Parcours | Route ou surface existante |
| --- | --- |
| Découvrir les vétérinaires | /discover/veterinarians |
| Lire la présentation destinée aux professionnels | /pros |
| Créer un compte | /register |
| Soumettre des justificatifs professionnels après connexion | /settings/professional-verification |
| Gérer ou demander un rendez-vous vétérinaire | /veterinarian-appointments |
| Consulter et gérer les réservations | /reservations |
| Échanger par messagerie | /messages |
| Consulter les règles de confiance et signaler | /trust |
| Explorer les services publics | /discover/services |
| Accéder aux communautés et au fil | /communities, /feed |

La vérification est une revue de dossier interne à YaZoo. Elle ne vaut pas certification de l’État, agrément, partenariat officiel ou contrôle vétérinaire public. Les avis liés aux rendez-vous et réservations sont soumis aux règles d’éligibilité et d’achèvement présentes dans le code.

## État des preuves

Le dépôt prouve l’existence des écrans, routes frontend, routes API et tests associés. Les enregistrements de seed et fixtures de test ne prouvent pas l’existence de clients, professionnels, rendez-vous ou transactions réels. Aucun chiffre d’usage, taux de conversion, partenaire ou résultat de pilote n’est revendiqué dans ce document.

## Conditions avant un pilote public

- Valider les mentions, le responsable du traitement, les coordonnées de contact et les informations légales applicables au pilote.
- Recruter et vérifier les professionnels réels avant de présenter leurs profils comme disponibles.
- Définir avec le responsable du pilote le traitement des données, la conservation, les demandes des personnes et les réponses aux signalements.
- Configurer et vérifier les sauvegardes, le stockage durable des fichiers, l’envoi des communications nécessaires et les procédures de support.
- Garder les paiements en ligne désactivés tant que le contrat, le bac à sable et l’homologation du fournisseur ne sont pas établis. Les parcours manuels de paiement présents dans le code ne prouvent aucun encaissement par YaZoo.
- Effectuer une revue opérationnelle, juridique, de sécurité et d’accessibilité avec les responsables du pilote.

Les valeurs de configuration légale et les intégrations externes doivent être validées dans l’environnement réel du pilote. Ce dépôt ne fournit pas de raison sociale, RC, ICE, IF, contact CNDP, partenaire ou homologation vérifiés à reprendre dans une communication publique.

## État des quality gates locaux — 4 octobre 2026

- Les tests backend passent (394 tests, 2 148 assertions), mais `composer audit --no-dev` signale six avis sur cinq paquets verrouillés, dont des avis élevés dans CommonMark et MongoDB. Le PHP local n’a pas `ext-mongodb` ; Composer refuse la résolution même en laissant MongoDB verrouillé. L’actualisation de MongoDB vers une version corrigée demandera aussi `ext-mongodb` ≥ 2.4. Aligner l’extension CLI avec la version PHP prévue pour le pilote, actualiser les paquets et réexécuter l’audit avant un pilote public.
- Les contrôles frontend, 152 tests unitaires, 98 tests E2E et le build passent. `npm audit` signale encore cinq avis élevés dans la chaîne de dépendances de Tailwind 3. La correction automatisée proposée passe à Tailwind 4, changement majeur qui n’a pas été appliqué. Résoudre ou remplacer cette chaîne avant une publication commerciale.
- La génération des pages SEO statiques est ignorée localement faute de `VITE_SITE_URL`. Définir l’URL réelle et régénérer les pages avant publication.
