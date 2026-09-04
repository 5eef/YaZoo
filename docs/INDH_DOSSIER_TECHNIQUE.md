# YaZoo - Dossier technique INDH

## 1. Presentation

YaZoo est une plateforme marocaine de mise en relation responsable autour de l'adoption animale, des services animaliers et des professionnels locaux. YaZoo n'est pas vendeur direct d'animaux.

Porteur de projet: Youssef BOUGHIOUL. Email officiel: bough.youssef@gmail.com. Telephone officiel: +212606610014. Hebergement public: demonstration free-tier en preparation. Statut juridique, adresse officielle et ICE: a completer.

## 2. Probleme traite au Maroc

Les annonces animales et services animaliers sont souvent disperses, peu moderes et difficiles a verifier. Les associations, particuliers et professionnels locaux manquent d'outils simples pour gagner en visibilite tout en gardant des regles de securite claires.

## 3. Objectif social et economique

- Encourager l'adoption responsable.
- Reduire les risques d'annonces abusives ou trompeuses.
- Donner de la visibilite aux professionnels locaux.
- Favoriser l'inclusion numerique avec une interface mobile FR/AR/EN.
- Construire une base de projet entrepreneurial prudent et documente.

## 4. Public cible

- Particuliers souhaitant adopter ou proposer une mise en relation responsable.
- Associations et refuges.
- Veterinaires, toiletteurs, pensions, educateurs, animaleries.
- Administrateurs et moderateurs YaZoo.

## 5. Fonctionnalites principales

- Authentification email, OTP, SMS OTP et Google.
- Profils publics, feed social, stories, reactions et communautes.
- Marketplace animaux, produits, services et veterinaires.
- Messagerie, notifications, follow et reservations.
- Recherche globale.
- Signalements utilisateurs.
- Admin stats, moderation, utilisateurs, historique, exports CSV.
- Pages legales, privacy, regles, accessibilite, impact et presentation pro.

## 6. Stack technique

- Laravel 12.
- React 19.
- Vite.
- Tailwind CSS.
- MySQL.
- Redis.
- Docker Compose local.
- API REST avec Sanctum.

## 7. Architecture simplifiee

Frontend React SPA consomme une API Laravel. MySQL stocke les donnees metier. Redis sert au cache, sessions ou files selon configuration. Docker Compose fournit un environnement local reproductible.

## 8. Securite

- Authentification par session/API.
- Routes admin protegees.
- Middleware de suspension prudent.
- Signalements et moderation.
- Journalisation des actions admin.
- Exports CSV sans secrets.
- Consignes de partage sans `.env`, `.git`, logs, backups ou dumps.

## 9. CNDP / Loi 09-08

Base technique implementee: consentements, cookies, export utilisateur, demande de suppression, hash IP/user-agent pour consentements. La conformite finale depend des informations administratives, declarations ou formalites CNDP, durees de conservation validees et procedures internes.

## 10. ONSSA et professionnels

Base technique implementee: informations de conformite animaux, seller type, statut de revue, verification professionnelle interne, badges prudents. YaZoo ne remplace pas l'ONSSA et ne certifie pas officiellement les professionnels.

## 11. Admin et moderation

Le back-office permet les statistiques, signalements, revue animaux, verification pro, gestion utilisateurs, suspension sans suppression, historique de moderation et exports CSV.

## 12. PWA et mobile

Le frontend est responsive et dispose d'une base PWA: manifest, theme color, service worker prudent, page demo mobile. Le mode hors ligne complet n'est pas promis.

## 13. Impact local

YaZoo peut contribuer a une meilleure visibilite des acteurs locaux, une adoption plus responsable et une sensibilisation des utilisateurs aux regles et risques.

## 14. Modele economique prudent

Au demarrage: pas de paiement en ligne obligatoire. Options futures: visibilite pro, abonnements pro, accompagnement associations, partenariats locaux, sans confondre intermediation et vente directe d'animaux.

## 15. Limites et prochaines etapes

- Completer les informations administratives restantes: statut juridique, adresse officielle, ICE si disponible.
- Demarche CNDP selon avis competent.
- Validation juridique/ONSSA si necessaire.
- Stockage prive renforce des documents.
- Audit securite, accessibilite et production.
