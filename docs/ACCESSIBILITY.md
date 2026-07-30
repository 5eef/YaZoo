# Contrôle d’accessibilité

Le contrôle Playwright utilise `@axe-core/playwright` sur les parcours publics, la connexion,
l’inscription, le feed, le marketplace et le tableau de bord administrateur. La matrice couvre
mobile et desktop, français clair et arabe RTL sombre.

Commande :

```powershell
cd frontend
npx playwright test e2e/accessibility.spec.js
```

Le seuil initial bloque toute nouvelle violation Axe d’impact `critical` ou `serious` relevant
des niveaux WCAG 2 A/AA et 2.1 A/AA. Le test vérifie aussi l’absence de débordement horizontal
global et qu’une navigation par tabulation atteint un élément interactif. Les contrôles manuels
restent nécessaires pour la pertinence des textes alternatifs, le zoom, les lecteurs d’écran et
les parcours clavier complexes.
