# API routes and environments

| Consumer | API base | Authentication |
| --- | --- | --- |
| Hosted Web | `VITE_API_URL=/api` on `https://yazoo-showcase.pages.dev` | HttpOnly Sanctum token cookie, CSRF/XSRF protection |
| Distributed Android | `EXPO_PUBLIC_API_URL=https://yazoo-showcase.pages.dev/api` | Expiring Sanctum Bearer token in SecureStore, no browser cookies |
| Pages Functions upstream | `BACKEND_ORIGIN=https://yazoo-showcase.onrender.com` | Forward the existing auth and CSRF headers; never embed secrets in the Web build |
| Backend health | `/health/live`, `/health/ready` on Render | Public health contracts |
| Broadcast authorization | `/broadcasting/auth`, outside `/api` | Sanctum and channel membership checks |

Pages Functions under `frontend/functions/{api,sanctum,storage,broadcasting}`
preserve the incoming pathname and query string. `BACKEND_ORIGIN` must be an
origin without `/api`; client methods use paths such as `/posts`, never `/api/posts`.
The native broadcast helper removes the API suffix before `/broadcasting/auth`.

The mobile login/register session contains `user.email: string | null`. Laravel
deliberately returns `null` for synthetic phone-account addresses; clients must
accept and preserve that value in SecureStore without exposing the internal
address. An absent or non-string/non-null email remains an invalid response.
Token, numeric user identity and expiration checks still apply.

| Feature | Backend route families | Web consumer | Native consumer |
| --- | --- | --- | --- |
| Account | `/api/auth/*`, `/api/auth/mobile/{login,register}` | auth.js and AuthContext | App.tsx and native client |
| Social | `/api/posts`, `/api/posts/{post}/comments`, `/api/stories` | posts.js, stories.js | useSocial.tsx |
| Profile | `/api/users/{user}`, followers/following | profile.js | profile views and useSocial |
| Marketplace | `/api/{animals,products,services,veterinarians}`, `/api/marketplace/public/*` | marketplace API modules | native discovery/listings |
| Booking | `/api/reservations`, `/api/veterinarian-appointments`, veterinarian availability/appointments | reservation and appointment API modules | App.tsx |
| Messaging | `/api/conversations`, direct/read/messages, `/api/notifications` | messages.js, notifications.js | App.tsx |
| Administration | `/api/admin/*` | admin API modules and protected pages | No unrestricted administrative access |
| Media | `/api/media/*`, `/storage/*` | existing media helpers | authenticated media headers restricted to the API origin |

Multipart updates intentionally use HTTP POST with `_method=PUT` or
`_method=PATCH`; Laravel resolves these to the registered update routes.
OAuth callbacks, signed verification links, CMI callbacks, health checks and media
URLs need not appear as literal Axios calls to remain useful routes.

Errors retain HTTP status codes, stable `error` codes and field-level `errors`.
Collections use `data` and pagination metadata. Both clients discard responses
from an earlier account session. A write timeout must never trigger automatic replay.

The local release audit exports the complete `artisan route:list --json` inventory,
the route-to-client matrix, validation results and unresolved checks. It is evidence
for a particular source state, not a permanent claim that hosted deployments match it.
