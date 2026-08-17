# État de préparation des locales YaZoo

## Locales produit actives

`fr`, `ar` et `en` sont les seules locales activées de manière cohérente dans
le frontend, la validation backend et les préférences utilisateur. L'arabe est
la seule locale RTL.

## Locales candidates

Des fragments de dictionnaire existent pour `es`, `nl`, `pt` et `it`, mais ils
ne constituent pas une traduction produit complète et n'activent pas ces
langues. Ils doivent rester hors du sélecteur et de `User::SUPPORTED_LOCALES`
jusqu'à validation humaine de toutes les clés métier, pluriels, dates, montants,
emails et parcours critiques.

Checklist d'activation d'une candidate :

1. parité complète avec les clés FR/AR/EN;
2. revue humaine par un locuteur compétent;
3. ajout simultané aux constantes frontend et backend;
4. tests d'inscription, profil, API `Accept-Language` et formats `Intl`;
5. audit de texte hardcodé et tests E2E responsive;
6. mise à jour de la documentation et des mentions légales traduites.

Aucune traduction métier automatique ou non validée n'a été présentée comme
support produit pendant cette correction.
