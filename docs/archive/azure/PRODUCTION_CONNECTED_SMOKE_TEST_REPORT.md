# Archive — Azure Production Connected Smoke Test Report

> Historical evidence only. The Azure environment has been decommissioned.

Date: 2026-07-09
Time window: 12:39-12:56 UTC
Production commit: `3ff84f8 ux: improve desktop typography readability`

## Scope

This report documents connected production smoke tests for YaZoo after the desktop typography deployment. The test used a normal test account only. No real payment, real CIN, real professional document, real verification file, public test listing, fake review, fake score, fake badge, or unnecessary public content was created.

The local machine still has the previously documented intermittent TCP connectivity issue to `yazoo.azurewebsites.net` / `51.116.145.45:443`. Public frontend availability was therefore validated through external Check-host nodes, while connected auth and data smoke checks were executed directly against the production API with secure cookies and CSRF.

## Test Account

- Account: `oh******@gmail.com`
- Type: normal user
- Status: created during first smoke pass via the intended auth endpoint, then reused successfully
- Password: not recorded
- Personal data: no CIN, no real document, no personal address, no sensitive upload

## Initial Git State

- `git status --short`: clean before smoke work
- Latest commit: `3ff84f8 ux: improve desktop typography readability`
- Recent docs commits present: `e7745d0`, `ac02b2a`
- No zip detected
- No real `.env` modified

## Production Health

Backend:

- `GET /health/ready`: 200
- `GET /api/payments/config`: 200
- `GET /api/auth/me` as guest: 401, expected
- `GET /api/veterinarians`: 200, HTTPS pagination links

Frontend:

- Local machine: `/`, `/login`, `/trust`, `/marketplace` still failed before HTTP because of the known local network route issue
- Local machine: `/marketplace/veterinarians` returned 200
- Check-host external probes returned 200 for:
  - `/`
  - `/login`
  - `/trust`
  - `/marketplace`
  - `/marketplace/veterinarians`

## Auth Smoke

Connected API cookie flow:

- CSRF cookie issued
- Login/register flow: OK
- `/api/auth/me` after login: 200, user present
- Logout: 200
- `/api/auth/me` after logout: 401, expected
- Re-login: 200
- No backend 500 observed
- No CORS issue observed on API-level requests
- Secure cookie flow observed

## Connected Navigation Coverage

The following production API endpoints used by connected pages returned 200:

- Feed: `/api/posts`, 3 items
- Profile: `/api/users/{current-user}`, user profile returned
- Marketplace animals: `/api/animals`, 1 item
- Marketplace products: `/api/products`, 1 item
- Marketplace services: `/api/services`, 0 items, clean empty dataset
- Marketplace veterinarians: `/api/veterinarians`, 0 items, clean empty dataset
- Reservations: `/api/reservations`, 200
- Messages: `/api/conversations`, 0 conversations, clean empty dataset
- Messages unread count: `/api/messages/unread-count`, 200
- Notifications: `/api/notifications`, 0 notifications, clean empty dataset
- Notifications unread count: `/api/notifications/unread-count`, 200
- Settings/privacy consents: `/api/privacy/consents`, 200
- Professional verification list: `/api/professional-verifications/me`, 0 items, clean empty dataset
- Favorites: `/api/favorites`, 0 after cleanup

Browser-level connected navigation against the production frontend could not be completed from this local network because the local route to `yazoo.azurewebsites.net` remains unreliable. Public frontend availability was externally confirmed, and local frontend e2e smoke tests passed separately.

## Marketplace

- Animals listing: 200, 1 item
- Animal detail: 200
- Products listing: 200, 1 item
- Product detail: 200
- Services listing: 200, empty state expected
- Veterinarians listing: 200, empty state expected
- No listing was created
- No real photo or sensitive media was uploaded
- No reservation was created

## Favorites

A safe add/remove cycle was performed on one existing animal item:

- Save favorite: 201
- Remove favorite: 200
- Final favorites list: clean, 0 items

No fake favorite volume was created.

## Messages

- Conversations endpoint: 200
- Empty state data: 0 conversations
- Unread count endpoint: 200
- No message was sent to a real user
- No second-account conversation test was performed

## Notifications

- Notifications endpoint: 200
- Empty state data: 0 notifications
- Unread count endpoint: 200
- No counter failure observed at API level

## Reservations

- Reservations endpoint: 200
- No real reservation was created
- No payment action was attempted
- Review creation was not attempted because no completed test reservation was created

## Reviews

- No fake review was created
- Existing automated backend tests confirm reviews are refused before completed reservations
- No public fake `0.0` review value was introduced by this smoke phase

## I18n And RTL

- Repository i18n audit: 1218 keys detected, 0 suspicious static UI strings
- Existing Playwright public smoke passed
- Connected API smoke did not exercise browser language switching because local production frontend routing remains unreliable
- No RTL-breaking code change was made in this phase

## Professional Verification

- `/api/professional-verifications/me`: 200, empty list
- No document uploaded
- No real CIN or professional proof used
- No public `document_path` key detected in the returned payload

## Payment And CMI

- `/api/payments/config`: 200
- `providers.cmi.enabled`: `false`
- No CMI button or card form was tested beyond confirming disabled configuration
- No real payment attempted
- Manual payment methods remain represented in config

## Realtime

- Azure frontend app setting `VITE_REALTIME_ENABLED`: `false`
- Realtime was not enabled or modified

## Console And Network Errors

No browser console session against the production frontend was possible from the local network because of the known route issue to `51.116.145.45:443`.

Observed network context:

- Backend API reachable from local machine
- Frontend public routes reachable from external Check-host nodes
- Local frontend route issue remains classified as local/ISP/DNS/routing, not global Azure outage

## Local Regression Tests

Backend:

- `php artisan test`: 166 passed, 831 assertions

Frontend:

- `npm.cmd run lint`: passed
- `npm.cmd test -- --run`: 17 files passed, 40 tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: 4 Playwright public smoke tests passed

Audit:

- `node scripts/audit-i18n.mjs`: passed, 0 suspicious static UI strings

## Non-Executed Tests

- No message send test: no confirmed second normal test account conversation cleanup path was used
- No reservation creation: would risk interacting with a real listing/provider
- No review creation: fake reviews are prohibited and completed reservation prerequisite was not created
- No professional upload: real documents are prohibited; no upload was needed for smoke confidence
- No browser connected production UI walkthrough: blocked by local network route to frontend; public frontend was checked externally and connected API flow passed

## Findings

No critical production bug found.

Non-critical residual limitation:

- Local network cannot reliably reach the Azure frontend default hostname, while external nodes can. This is already documented and remains non-blocking for global production availability.

## Recommendation

- Run a full browser connected smoke from a clean external network or CI runner with test secrets stored as GitHub Actions secrets.
- Add an optional production smoke workflow that uses masked secrets and runs read-only UI checks after deployment.
- Continue with Sonar UI, restore test MySQL, INDH business/legal dossier, and official CMI sandbox only with the bank kit.
