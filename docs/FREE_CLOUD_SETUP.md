# Free Cloud Setup

> Current provider-neutral showcase guide: [`DEMO_DEPLOYMENT_FREE.md`](DEMO_DEPLOYMENT_FREE.md). Any Azure material below is historical and no longer describes an active environment.

This project is local-first. These integrations are optional and safe to enable without a VPS or production domain.

## GitHub Actions

The main workflow is `.github/workflows/ci.yml`.

It runs:

- Backend dependency install.
- `composer audit --no-interaction`.
- Backend tests with coverage.
- Frontend dependency install.
- `npm audit --omit=dev`.
- Frontend lint, coverage, and production build.
- Optional SonarCloud scan.

## SonarCloud

Create a free SonarCloud project, then configure the GitHub repository:

- Secret: `SONAR_TOKEN`
- Variable: `SONAR_ORGANIZATION`

The scan is skipped automatically when either value is missing. No local SonarQube server is required by CI.

The repository keeps static scanner configuration in `sonar-project.properties`; the organization and SonarCloud host are supplied by GitHub Actions.

## UptimeRobot

Before a public VPS/domain exists, monitor only URLs that are reachable from the internet.

Recommended future monitors:

- API health: `https://api.<domain>/up`
- Frontend health: `https://app.<domain>/`

Suggested settings:

- Type: HTTPS.
- Interval: 5 minutes on the free plan.
- Alert contacts: founder email plus engineering email.
- Expected API response: HTTP `200`.

Do not point UptimeRobot at `localhost`; it cannot reach your local machine.

## Sentry

Sentry is intentionally not installed by default in this pass. Add it later when you have a real environment name and release process.

Recommended future environment variables:

- Backend: `SENTRY_LARAVEL_DSN`
- Frontend: `VITE_SENTRY_DSN`
- Shared: `APP_ENV=production` or `VITE_APP_ENV=production`

Keep DSNs out of git and add them only through `.env`, GitHub secrets, or a future VPS secret manager.

## GitHub Container Registry

GHCR publishing is optional and should wait until the Docker image naming and deployment target are final.

For now, validate Docker builds locally and in CI before adding image publishing. When enabled later, prefer tag-based publishing only:

- `ghcr.io/<owner>/yazoo-backend:<git-tag>`
- `ghcr.io/<owner>/yazoo-frontend:<git-tag>`

Avoid publishing `latest` from arbitrary branches.
