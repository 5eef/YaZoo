# YaZoo - Notes SEO Phase 5

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
