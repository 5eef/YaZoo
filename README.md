# YaZoo

The official release source is `main`, with Laravel in `backend/`, React/Vite in
`frontend/`, and Expo/React Native in `mobile/`. Historical branches, `output/`,
and local consolidation copies are recovery sources, never application build roots.
See [canonical architecture](docs/ARCHITECTURE_CANONIQUE.md) and
[API environments](docs/API_ROUTES_AND_ENVIRONMENTS.md).

> **Le monde des animaux, au même endroit.**
>
> **MVP Startup — phase pilote**

YaZoo is a precommercial technology startup project born in Morocco with an international ambition: a social animal community, an eligible products and services marketplace, and professional journeys. The proposed Fez–Meknes pilot is a validation step. Social experiences are central to the product; local services remain relevant to user location.

This branch is a product prototype for incubation and pilot preparation. It does not establish that a company has been legally incorporated, that a pilot has been approved, that listed professionals are real partners, or that real transactions have taken place.

The startup visual identity supplied in `docs/logo` is integrated into Web SVG assets and Android PNG assets. Mobile opens with a short brand intro followed by Login/Register, using the phone language automatically (Arabic/English, otherwise French), with dark/light, RTL and Reduce Motion support. See [asset mapping](docs/BRAND_ASSETS.md) and [AFWAJ demo guide](docs/AFWAJ_DEMO_GUIDE.md). Physical device review, public deployment and APK distribution remain owner actions.

## Product scope

### For pet owners

- Browse public veterinarian and animal care professional listings at /discover/veterinarians.
- Review public profiles, services, and available contact details.
- Request appointments with veterinarians that publish availability.
- Contact professionals through YaZoo messaging after creating an account.
- Review eligible completed appointments and reservations.

### For professionals

- Create an account and present an activity profile.
- Submit activity-related documents for YaZoo profile review in account settings.
- Publish eligible service, veterinarian, product, or animal listings.
- Manage veterinarian availability and appointment requests where that workflow applies.
- Use messaging and receive reviews tied to completed eligible activity.

YaZoo profile review is an internal platform process. A profile badge does not mean a government license, state certification, official partnership, or legal endorsement.

### Community at the heart of the product

Feed, photo and video posts, Stories, Reels, likes, comments, follows, communities and messaging form the social experience. Marketplace and professional workflows extend it. Feature flags and regulated listing safeguards remain applicable. Demo accounts do not establish real traction.

Community access is intended to remain free. Commissions of 3%, 5% and 8% on eligible commercial transactions are scenarios to validate, not active fees. Veterinary activities are excluded pending legal and professional review. No payment activation or revenue is claimed.

The current architecture includes `frontend/` (React/Vite Web), `backend/` (Laravel API, PHP 8.4.1 minimum for the current lock), and `mobile/` (Expo/React Native Android). Mobile includes professional discovery, services, appointments, messages, Feed, Stories and Reels. Video posts share their identity and interactions between Feed and Reels; Stories remain distinct.

See [the final readiness report](docs/PRODUCTION_READINESS_AFWAJ_2026.md) for tested gates and remaining blockers. AFWAJ candidate readiness does not constitute approval for public production, CNDP compliance, or Google Play distribution.

## Pilot status and limits

- The repository contains no verified company registration details or confirmed professional partners.
- Seed and test records are not evidence of real professionals, customers, appointments, or transactions.
- CMI is disabled by default and remains gated on contract, sandbox, homologation, and complete configuration checks.
- Cash-on-pickup and manual bank-transfer workflows exist in code. They are manual options, not proof that YaZoo processes or has completed real payments; do not use them for a public pilot until the pilot’s terms and safeguards are approved.
- Legal contact, data-controller, hosting, privacy, and retention details must be reviewed and completed for the actual pilot environment before collecting public users’ data.
- This branch has no deployment or production approval.

The pilot evidence, live-code routes, and readiness conditions are summarized in [the Startup 2026 pilot brief](docs/STARTUP_2026_PILOT.md).

## Architecture

    Browser
      └── React 19 + Vite + React Router + Tailwind
            └── Laravel 12 JSON API
                  ├── MySQL-compatible database
                  ├── optional Redis queue/cache
                  └── optional Reverb realtime delivery

The application uses French, Arabic, and English. Arabic pages set RTL direction through the existing i18n provider. The interface keeps the YaZoo violet and lavender palette in light and dark modes.

## Run locally

Prerequisites: Git and Docker Desktop with Compose, or PHP 8.2+, Composer, Node.js 22.22+, npm, and a local MySQL-compatible service.

### Docker Compose

    Copy-Item .env.example .env
    docker compose up -d --build
    docker compose exec app php artisan migrate --seed

Open the app at http://localhost:4173 and the API at http://localhost:8000.
Docker Compose publishes its MySQL-compatible database on port 3308, keeping it separate from workstation MySQL (3306) and XAMPP MariaDB (3307).

### Without Docker

    Copy-Item .env.example .env
    Copy-Item backend\.env.example backend\.env
    Copy-Item frontend\.env.example frontend\.env

In one terminal:

    cd backend
    composer install
    php artisan key:generate
    php artisan migrate --seed
    php artisan serve

In a second terminal:

    cd frontend
    npm ci
    npm run dev

Use local credentials only. Never copy hosted credentials into the repository or commit real `.env` files.

## Quality commands

    cd backend
    composer validate --strict
    php artisan optimize:clear
    php artisan test
    vendor\bin\pint --test
    composer audit

    cd ..\frontend
    npm ci
    npm run lint
    npm run typecheck
    npm run audit:i18n
    npm run audit:tailwind
    npm run test -- --run
    npm run build
    npm run test:e2e
    npm audit

## Technical references

- [Accessibility approach](docs/ACCESSIBILITY.md)
- [End-to-end test plan](docs/E2E_TEST_PLAN.md)
- [Security review](docs/SONAR_SECURITY_REVIEW.md)
- [Payment architecture](docs/PAYMENTS_ARCHITECTURE.md)
- [Production scaling plan](docs/production-scaling-plan.md)

## Repository map

- `frontend/` — React, Vite, Tailwind, unit tests, and browser smoke tests.
- `backend/` — Laravel API, configuration, migrations, and backend tests.
- `deploy/` and `infra/` — deployment and reverse-proxy helpers.
- `scripts/` — CI, audit, smoke-test, and maintenance scripts.
- `docs/` — technical reviews, operating notes, and historical audit records.
- `.github/workflows/` — repository CI, CodeQL, and image publishing workflows.

Older audit, demo deployment, and database compatibility documents are retained as historical technical records. Their branch, test, hosting, and readiness statements must be checked against the current code before being reused.

## Startup / pilote 2026

La communauté constitue le cœur du produit. Marketplace et parcours professionnels complètent l’expérience, avec un pilote proposé à Fès–Meknès et une ambition internationale. `main` est la branche officielle ; les anciens documents de pilote restent des archives à relire avant réutilisation. Les annonces animales réglementées conservent leurs garde-fous.

- [Brief AFWAJ](docs/AFWAJ_2026_STARTUP_BRIEF.md) et [plan 90 jours](docs/PILOT_90_DAY_PLAN.md).
- [Métriques](docs/PILOT_METRICS.md), [préparation juridique](docs/LEGAL_READINESS_MOROCCO.md), [décision de marque](docs/BRAND_DECISION.md).
- [Mobile Android réel](mobile/README.md), [déploiement](docs/DEPLOYMENT_STARTUP_2026.md), [sécurité](docs/SECURITY_REVIEW.md).
- [Audit final et résultats des commandes](docs/STARTUP_2026_FINAL_AUDIT.md).

Aucun partenaire, revenu ou statut CNDP n’est revendiqué à partir de seeds. Les informations administratives réelles et les credentials de publication restent des actions du propriétaire.
