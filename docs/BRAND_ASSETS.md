# Identité visuelle YaZoo startup — 10 octobre 2026

Les originaux dans `docs/logo` sont la source de vérité. Aucun logo généré,
recoloré, redessiné ou étiré pendant cette intégration. Aucun chargement runtime
depuis `docs/`. La palette Web/native et les écrans connectés restent ceux du projet.

## Inventaire inspecté

| Original exact | Format/dimensions | Variante et fond |
|---|---|---|
| `YaZoo logo.svg` | SVG, width/height 2000, viewBox `0 0 1500 1499.999933` | Symbole seul, carré, fond clair intégré |
| `YaZoo logo (1).svg` | SVG, mêmes dimensions/viewBox | Symbole + wordmark YaZoo + signature CARE FOR ANIMALS, composition verticale dans un carré, fond clair intégré |
| `YaZoo logo.png` | PNG RGBA 2000 × 2000, 663 332 octets | Logo complet vertical, transparence alpha (3 267 684 pixels partiellement ou totalement transparents) |

Aucune variante horizontale ni monochrome distincte fournie. Les SVG contiennent
des PNG intégrés et des métadonnées de provenance C2PA ; aucun script,
gestionnaire d’événement, javascript:, foreignObject ou chargement externe.
Les métadonnées originales sont conservées. Le dossier ne contient que ces trois
fichiers ; aucun credential ou export temporaire ajouté. Les droits d’utilisation
et la marque restent une vérification du propriétaire.

## Mapping source → runtime

| Source | Destination | Usage |
|---|---|---|
| `YaZoo logo.svg` | `frontend/public/brand/yazoo-symbol.svg` | Landing, header, sidebar, shells publics, footer, loader, `brand.logo`, favicon SVG |
| `YaZoo logo (1).svg` | `frontend/public/brand/yazoo-logo.svg` | Variante complète disponible pour supports Web |
| `YaZoo logo.png` | `frontend/public/brand/yazoo-logo.png` | PNG complet ; générateur de soutenance |
| `YaZoo logo.png` | `mobile/assets/brand/yazoo-logo.png` | Intro et Login/Register ; original copié à l’identique |
| `YaZoo logo.svg` | `mobile/assets/brand/yazoo-symbol.png` (512²) | Header connecté, restauration, splash natif |
| Même symbole | `mobile/assets/brand/app-icon.png` (1024²) | Launcher carré ; centré sur fond clair YaZoo, largeur 80 %, ratio préservé |
| Même symbole | `mobile/assets/brand/adaptive-foreground.png` (432²) | Foreground Android, largeur 60 %, extérieur transparent ; background `#FAF7FF` |
| Même symbole | `mobile/assets/brand/favicon.png` (192²) | Favicon Expo Web, largeur 80 % |
| Même symbole | `frontend/public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180²) | PWA, SEO/social, Apple ; largeur 80 % |
| Même symbole | `frontend/public/icon-maskable-512.png` | PWA maskable ; largeur 60 %, marge dans la zone centrale sûre |

Contours, dégradés, couleurs, texte et proportions sont conservés. Le PNG complet
est présenté sur une surface claire arrondie dans l’entrée sombre pour garder
sa signature lisible. Le symbole SVG conserve son fond d’origine clair dans les
deux thèmes. Aucun filtre d’inversion ou variante artistique sombre ajouté.

Régénération technique avec les outils **déjà installés** (Playwright/Chromium
du frontend), depuis la racine : `node scripts/build-brand-assets.cjs`.
Le script copie les originaux puis rasterise le symbole à taille fixe, centré,
sans nouvelle dépendance. Les applications utilisent seulement les fichiers
runtime livrés ; aucun navigateur de build nécessaire en production.

Le service worker passe son cache public à v3 afin de renouveler les PNG aux URLs
PWA/SEO existantes. Les anciens `yazoo-logo.webp`, `favicon.svg` et PNG mobile
à la racine `assets/` restent inactifs, conservés pour les références des rapports
historiques. Aucune référence runtime vers l’ancien logo.

## Entrée mobile

`MobileAuthEntry.tsx` garde Login/Register, validations, consentement, sécurité
et liens légaux. Présence de 800 ms, animation native verticale 550 ms cubic out,
translation du centre vers le haut, scale 1 → 0,78 ; formulaire opacity 0 → 1 et
translateY 24 → 0, interactif au début de la transition. Aucun scroll automatique,
mouvement horizontal ou bounce. Une séquence par montage invité, indépendamment
du clavier, du thème ou du switch Register. Reduce Motion annule l’attente et
affiche l’état final ; un listener suit aussi les changements de préférence.

Au premier affichage : `getLocales()[0]?.languageCode`, ar → ar, en → en, autre
code ou échec → fr. L’entrée invitée suit le téléphone même si un ancien choix
était stocké. Une session restaurée garde son choix explicite SecureStore ; le
sélecteur reste uniquement dans les paramètres connectés. Textes/champs RTL arabe
et `I18nManager.allowRTL(true)` conservés. Animation verticale dans toutes les langues.

Pendant détection/restauration du thème et de la session, seul le nouveau symbole
est affiché. Une session valide localement rejoint le Feed ; un token révoqué
reste traité par le mécanisme 401 existant. `KeyboardAvoidingView`, `ScrollView`,
`keyboardShouldPersistTaps="handled"`, cibles ≥48, labels et textes adaptatifs
sont conservés. Logo décoratif masqué à l’accessibilité lorsque le titre annonce YaZoo.

Les tests ne remplacent pas la revue physique propriétaire : Expo Go/APK,
TalkBack, grands caractères, clavier et rendu natif du launcher.
## Current local source replacement

The local source previously named `YaZoo logo.png` was renamed to
`YaZoo logo romove background.png` before canonical integration. The rename is
preserved in Git. Existing Web/native runtime copies are retained; their historical
mapping above describes the original asset import, not a fresh regeneration.
The current Web artwork generator uses `YaZoo.png`, `YaZoo logo light.png` and
`YaZoo logo dark.png` and does not require the retired source filename.
