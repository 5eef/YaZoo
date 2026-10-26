# YaZoo — SEO, état du 25 octobre 2026

Les notes ci-dessous sont historiques. L’état courant et les résultats vérifiés sont dans [le rapport Global Startup](reports/GLOBAL_STARTUP_2026-10-25.md). Le domaine de démonstration cible est `https://yazoo-showcase.pages.dev` ; `VITE_SITE_URL` doit être explicitement défini lors du build.

Le générateur pré-rend désormais les composants React de la landing et des pages About/Pros/Partner dans le HTML initial, sans requête vers l’API. Les images importées sont résolues avec le manifeste Vite. `/fr`, `/en`, `/ar` ont un contenu localisé, canonical propre et hreflang réciproques. `/` reste compatible et canonise vers `/fr` dans le build français. Les autres pages ne revendiquent pas de variantes hreflang.

Le sitemap de build contient exclusivement `/fr`, `/en`, `/ar`, `/about`, `/pros`, `/partner`. Les autres pages institutionnelles ont des métadonnées par route mais restent des SPA sans contenu pré-rendu ; elles ne sont pas annoncées dans ce sitemap. Les catalogues et fiches précommerciaux sont non indexables et ne publient plus de schémas d’offres commerciales. Les contrôles `_headers` ajoutent X-Robots-Tag aux routes privées et de démonstration sur Cloudflare Pages ; vérifier les en-têtes réels après publication, notamment les routes éventuellement servies par Functions.

`robots.txt` laisse explorer pour permettre la lecture de `noindex` ; il ne protège aucune donnée privée. L’autorisation serveur existante demeure nécessaire. Les fichiers source robots/sitemap sont neutres sans origine configurée ; le générateur écrit les versions absolues dans `dist/`. Le favicon officiel reste l’image de partage carrée : aucune nouvelle campagne visuelle créée.

Validation locale après build cible : `node scripts/verify-static-seo.mjs`. Les règles de pré-rendu, canonical, contenu, images, sitemap et hreflang y sont contrôlées. La CI exécute également ce contrôle. Pas de classement Google, d’indexation effective ni de Core Web Vitals revendiqués.

Références consultées : [bases SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [multilingue](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), [hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Archive — Phase 5, ne pas utiliser comme état courant

## Elements ajoutes

- `frontend/public/robots.txt` autorise les pages publiques et exclut les routes admin, settings, messages, notifications, reservations et commandes.
- `frontend/public/sitemap.xml` liste les principales routes publiques utiles pour une presentation INDH.
- `frontend/index.html` contient une description globale, un theme color, un lien manifest et des meta OpenGraph/Twitter minimales.

## Limites SPA

YaZoo reste une application React SPA. Les balises meta sont globales et ne changent pas encore par route publique. Pour un referencement public plus robuste, il faudra envisager:

- prerender des pages publiques;
- SSR ou SSG pour les pages institutionnelles;
- generation automatique du sitemap avec le domaine final;
- meta descriptions par route;
- verification Search Console apres mise en production.

## Domaine public

Aucun domaine public n'est declare tant que la demonstration n'est pas reellement
deployee. Les pages SEO statiques, les URL canoniques et le sitemap absolu sont
generes uniquement lorsque `VITE_SITE_URL` contient l'origine HTTPS verifiee.

## Pages publiques importantes

- `/`
- `/about`
- `/privacy`
- `/cgu`
- `/rules`
- `/partner`
- `/pros`
- `/demo-mobile`
- `/accessibility`
- `/impact`
- `/contact`
- `/marketplace`
- `/marketplace/products`
- `/marketplace/services`
- `/marketplace/veterinarians`

## Decision projet

Ces elements preparent une base SEO propre pour un dossier INDH, sans pretendre a une optimisation de production complete.
