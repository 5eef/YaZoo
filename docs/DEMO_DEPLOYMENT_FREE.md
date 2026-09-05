# YaZoo public showcase deployment

This runbook describes the zero-cost recruiter showcase. It is not the commercial production topology and provides no SLA.

**Live showcase:** [https://yazoo-showcase.onrender.com/](https://yazoo-showcase.onrender.com/)

Verified deployment (5 September 2026): Render Free, Frankfurt, immutable image `docker.io/5eef/yazoo-demo:beca3d278146`, TiDB TLS readiness healthy, public/authenticated browser flows operational, and restart idempotence confirmed.

```text
Portfolio -> Render Free Web Service -> immutable Docker Hub image
                                    -> React + Laravel behind Nginx
                                    -> TiDB Cloud Starter over TLS
```

React and Laravel share one HTTPS origin. Nginx routes `/api`, `/sanctum`, `/health`, `/storage`, and `/broadcasting` to Laravel or its storage path; all other deep links fall back to the React SPA.

## Cloudflare split-frontend candidate

The current Render monolith remains the rollback deployment until the split architecture passes the full authentication checklist. The migration candidate is:

```text
Recruiter browser
  -> Cloudflare Pages: instant static React frontend
  -> Cloudflare Pages Functions: same-origin API proxy and wake handling
  -> Render Free: Laravel API, which may sleep after inactivity
  -> TiDB Cloud Starter: persistent showcase database
```

The React interface is delivered instantly from Cloudflare's CDN. The free Laravel demo API may take up to about one minute to wake after inactivity.

Cloudflare Pages settings:

| Setting | Value |
| --- | --- |
| Project | `yazoo-showcase` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output | `dist` |
| Production URL | `https://yazoo-showcase.pages.dev` |
| Server-side secret | `BACKEND_ORIGIN=https://yazoo-showcase.onrender.com` |

Production build variables must keep browser traffic same-origin:

```text
VITE_API_URL=/api
VITE_STORAGE_URL=/storage
VITE_SITE_URL=https://yazoo-showcase.pages.dev
VITE_GOOGLE_AUTH_ENABLED=false
VITE_REALTIME_ENABLED=false
VITE_MONITORING_ENABLED=false
```

Pages Functions are restricted by `frontend/public/_routes.json` to `/api/*`, `/sanctum/*`, `/storage/*`, `/broadcasting/*`, and `/demo-backend-status`. The proxy accepts no caller-selected target, forwards only allowlisted headers, does not replay mutations, converts expected JSON cold-start HTML to a controlled `503`, and makes origin cookies host-only for the Cloudflare domain.

Before the authentication cutover, update the existing Render environment without removing the Render hostname:

```text
APP_URL=https://yazoo-showcase.pages.dev
FRONTEND_URL=https://yazoo-showcase.pages.dev
YAZOO_SHOWCASE_APP_HOST=yazoo-showcase.pages.dev
SANCTUM_STATEFUL_DOMAINS=yazoo-showcase.pages.dev,yazoo-showcase.onrender.com
CORS_ALLOWED_ORIGINS=https://yazoo-showcase.pages.dev,https://yazoo-showcase.onrender.com
SESSION_DOMAIN=
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
GOOGLE_REDIRECT_URI=https://yazoo-showcase.pages.dev/api/auth/google/callback
GOOGLE_FRONTEND_REDIRECT=https://yazoo-showcase.pages.dev/feed
GOOGLE_LOGIN_REDIRECT=https://yazoo-showcase.pages.dev/login
```

Keep the Cloudflare URL out of the portfolio until CSRF acquisition, registration/login, `/api/auth/me`, and logout all pass through Cloudflare. Do not use cron pings or external uptime monitors to prevent normal Free-tier sleep.

## Financial guardrails

- Select only the Render compute plan identified as `free`.
- Do not attach a persistent disk or create a Render database.
- Do not add a payment method or accept a paid upgrade.
- Keep the TiDB Starter spending limit at zero.
- Stop without creating resources if either provider requires a paid plan or payment authorization.
- Review Render workspace usage before creation because free services still consume the workspace's included bandwidth and build allowances.

Render documents a 512 MiB / 0.1 CPU Free web service, 750 workspace hours per month, spin-down after 15 minutes without inbound traffic, and an ephemeral filesystem. Recheck the current terms before every deployment: [Render Free services](https://render.com/docs/free) and [Render compute plans](https://render.com/docs/compute-plans).

## Local verification

```powershell
docker build --pull -f Dockerfile.demo -t yazoo-demo:test .
```

Start the image against a disposable MySQL database with untracked test secrets. Verify two consecutive starts, `/`, `/health/live`, `/health/ready`, registration, login, CSRF-protected requests, logout, marketplace routes, deep links, assets, and the 21 bundled marketplace images.

The runtime configuration names are defined in [`backend/.env.showcase.example`](../backend/.env.showcase.example). Never commit a filled environment file.

## TiDB Cloud Starter

Use this application target:

```text
Host: gateway01.eu-central-1.prod.aws.tidbcloud.com
Port: 4000
Database: yazoo_showcase
TLS CA: /etc/ssl/cert.pem
```

The connection helper can display `sys`; never use it as `DB_DATABASE`. The deployment guards must continue to match `yazoo_showcase` before migrations or bootstrap can run.

1. Open the existing TiDB Starter cluster and keep its spending limit at zero.
2. Ensure the `yazoo_showcase` database exists.
3. Use the configured database user and generate the password through **TiDB Cloud -> Connect -> Generate password** only when required.
4. Keep TLS enabled with `MYSQL_ATTR_SSL_CA=/etc/ssl/cert.pem`.
5. After the Render service exists, copy its exact outbound CIDR ranges into the TiDB IP access list.
6. Do not use `0.0.0.0/0` without explicit approval.
7. Let `yazoo:migrate-production` run only after the expected-database guard passes.

Recheck the current Starter limits before deployment: [TiDB Cloud Starter limitations](https://docs.pingcap.com/tidbcloud/serverless-limitations/) and [Starter cluster creation](https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/?plan=starter).

## Docker Hub

After the working tree and all tests are validated, tag the exact source commit:

```powershell
$sha = git rev-parse --short=12 HEAD
docker tag yazoo-demo:test 5eef/yazoo-demo:$sha
docker tag yazoo-demo:test 5eef/yazoo-demo:latest
docker push 5eef/yazoo-demo:$sha
docker push 5eef/yazoo-demo:latest
```

Deploy the immutable SHA tag. Treat `latest` only as a convenience alias and verify the pushed digest.

## Render Free Web Service

Create exactly one service from `docker.io/5eef/yazoo-demo:<commit-sha>`:

| Setting | Value |
| --- | --- |
| Type | Web Service |
| Name | `yazoo-showcase` |
| Plan | `free` |
| Region | Frankfurt, or the available European free region |
| Port | `8080` |
| Health path | `/health/live` |
| Persistent disk | none |

Copy the variables from `backend/.env.showcase.example` into Render. Store secret values as secrets, never in Git. Once Render assigns the real hostname, use it consistently for:

```text
APP_URL
FRONTEND_URL
SANCTUM_STATEFUL_DOMAINS
CORS_ALLOWED_ORIGINS
YAZOO_SHOWCASE_APP_HOST
```

Keep `TRUSTED_PROXIES=REMOTE_ADDR`. This resolves the direct Nginx caller inside the single container without trusting a wildcard proxy list.

The showcase intentionally uses:

```text
QUEUE_CONNECTION=sync
CACHE_STORE=database
SESSION_DRIVER=database
BROADCAST_CONNECTION=log
MAIL_MAILER=log
SMS_DRIVER=disabled
CMI_ENABLED=false
YAZOO_RUN_QUEUE_WORKER=false
YAZOO_RUN_SCHEDULER=false
YAZOO_SHOWCASE_UPLOADS_ENABLED=false
YAZOO_REQUIRE_PERSISTENT_STORAGE=false
```

## Bootstrap and ephemeral storage

`Dockerfile.demo` embeds exactly 21 versioned marketplace images at `/opt/yazoo-showcase-images`. On every start:

1. the expected-database guard validates host, port, and database name;
2. production migrations run under a database lock;
3. `yazoo:bootstrap-showcase` creates the controlled demo dataset once;
4. `yazoo:ensure-showcase-media` restores missing versioned media;
5. the production preflight validates the resulting state;
6. Nginx and PHP-FPM serve port 8080.

Visitor uploads remain disabled because the Render Free filesystem is ephemeral. A restart can recreate versioned media without claiming that visitor-generated content is persistent.

## Post-deployment validation

Validate the real Render URL before adding it to the README or portfolio:

- HTTP 200 for `/`, `/health/live`, and `/health/ready`;
- API root, public marketplace sections, and versioned media;
- register, login, `/api/auth/me`, CSRF rejection and success paths, and logout;
- feed, profile, messages, notifications, reservations, and marketplace navigation;
- deep-link fallback and a genuine 404/API not-found response where applicable;
- 320 px, 768 px, and 1440 px layouts;
- no critical console errors, 5xx responses, CORS failures, mixed content, or broken assets;
- one explicit restart followed by the same health and data-count checks.

Only then publish the Render URL and update repository metadata.
