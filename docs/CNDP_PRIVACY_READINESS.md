# YaZoo - Preparation CNDP et privacy

Ce document decrit l'etat technique de YaZoo pour soutenir une demarche privacy/CNDP. Il ne constitue pas une preuve de conformite officielle et doit etre valide par un professionnel juridique/comptable competent.

## Base technique disponible

- Consentements traces avec type, locale, date et empreintes IP/user-agent hachees.
- Export utilisateur authentifie pour profil, annonces, reservations, signalements, consentements et demandes de suppression.
- Demande de suppression traitee par un service transactionnel, relancable et
  idempotent; les echecs restent en statut `failed` et ne sont jamais marques
  `completed`.
- Preferences privacy accessibles depuis l'espace utilisateur.
- Configuration legal centralisee dans `backend/config/legal.php`.
- Stockage prive des documents de verification professionnelle via le disque Laravel `local`.

## Informations administratives a completer

- `LEGAL_ENTITY_NAME`
- `LEGAL_STATUS`
- `LEGAL_ADDRESS`
- `LEGAL_ICE`
- `PRIVACY_CONTACT_EMAIL`
- `DATA_CONTROLLER_NAME`
- `DATA_RETENTION_DAYS`
- `DATA_REQUEST_RESPONSE_DAYS`

Ces valeurs doivent etre renseignees en production via Azure App Settings, GitHub Secrets ou Azure Key Vault selon leur sensibilite et leur usage.

## Procedure recommandee

1. Receptionner la demande privacy depuis l'interface ou un canal officiel.
2. Verifier l'identite du demandeur avant tout export ou traitement sensible.
3. Journaliser la demande, la date, le statut et l'operateur interne.
4. Fournir l'export ou traiter la suppression dans le delai defini par la politique validee.
5. Conserver uniquement les traces necessaires aux obligations legales, securite et litiges.
6. Documenter tout refus ou report avec une raison claire.

## Traitement technique d'une suppression

- Acces bloque immediatement, tokens Sanctum et sessions revoques.
- Documents professionnels prives, avatars et medias appartenant au compte
  supprimes du stockage; un echec de stockage bloque la completion.
- Posts, commentaires, likes, favoris, abonnements, stories, appartenances et
  consentements supprimables effaces.
- Reservations, paiements, transactions, factures et traces de moderation
  conserves uniquement pour l'integrite comptable, la securite et les litiges,
  avec notes, contacts, adresses, IP, user-agent et payloads personnels effaces.
- Annonces liees a des commandes conservees sous forme retiree/suspendue et
  depouillees de leurs contacts et medias.
- Identite utilisateur remplacee par un identifiant HMAC non reversible, email
  `.invalid`, mot de passe aleatoire et champs OAuth/profil vides.

Les durees exactes des donnees comptables et de moderation doivent encore etre
validees juridiquement. `DATA_RETENTION_DAYS` ne doit etre fixe definitivement
qu'apres cette validation; le code ne pretend pas fournir a lui seul une base
legale de conservation.

## Points juridiques restants

- Determiner si une formalite CNDP est requise selon le traitement reel.
- Valider les durees de conservation par type de donnee.
- Valider la politique de confidentialite, les CGU et les mentions legales.
- Definir les roles internes: responsable du traitement, sous-traitants, support, moderation.
- Valider les procedures de suppression, opposition, rectification et portabilite.

YaZoo doit etre presente comme techniquement preparee pour une demarche privacy, pas comme officiellement conforme CNDP tant que ces validations ne sont pas terminees.
