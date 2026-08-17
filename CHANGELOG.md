# Changelog

Toutes les modifications notables de YaZoo sont documentées ici. Le format suit
Keep a Changelog et les versions publiées suivent Semantic Versioning.

## [Unreleased]

### Sécurité

- Garde de cible DB obligatoire pour les migrations de production.
- Autorisation relationnelle des médias GridFS publics et privés.
- Codes d'erreur API stables et réduction des traces en production.
- Processus applicatifs durables exécutés sans privilèges root.

### Corrigé

- Transitions et suppression de créneaux vétérinaires atomiques.
- Rollback visible de la préférence de langue après échec réseau.
- Formats centralisés pour les dates et montants MAD.
- Couverture frontend calculée sur l'ensemble des sources applicatives.

## Stratégie de version et de tags

- Développement : entrée `Unreleased` et valeur `VERSION` suffixée `-dev`.
- Release : `vMAJOR.MINOR.PATCH` après CI, scans, validation DB2 et smoke tests.
- Pré-release : `vMAJOR.MINOR.PATCH-rc.N` sans alias `latest` automatique.
- Images : tag immuable SHA Git complet; `latest` seulement après rollout vert.
- Aucun tag n'est créé automatiquement pendant une session de correction.

[Unreleased]: https://github.com/Seef590/YaZoo/compare/HEAD
