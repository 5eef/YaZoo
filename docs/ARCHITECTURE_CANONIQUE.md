# Architecture canonique YaZoo

The repository contains three applications. Build every release from the same
reviewed commit on `main`; retain historical branches for recovery.

| Area | Laravel (`backend/`) | Web (`frontend/`) | Native (`mobile/`) |
| --- | --- | --- | --- |
| Authentication | AuthController, MobileAuthController, AuthService, Sanctum | src/api/auth.js, contexts/AuthContext.jsx, api/sessionEpoch.js | App.tsx, src/auth, src/api/client.ts, SecureStore |
| Social, Stories, Reels | PostController, CommentController, StoryController, policies | src/api/posts.js, stories.js, pages/FeedPage.jsx, ReelsPage.jsx | src/features/social, components/feed, components/reels |
| Profiles | ProfileController, ProfessionalVerificationController | src/api/profile.js, professionalVerifications.js, profile/settings pages | App.tsx, src/app/profile.tsx, settings.tsx, user-profile.tsx |
| Marketplace | AnimalController, ProductController, ServiceListingController, FavoriteController | src/api, pages, components/marketplace | App.tsx, src/app/marketplace.tsx, services.tsx, favorites.tsx |
| Booking | ReservationController, VeterinarianAppointmentController, domain services | src/api/reservations.js, veterinarianAppointments.js, booking pages | App.tsx, src/app/appointments.tsx, discover.tsx |
| Messaging | ConversationController, MessageController, NotificationController | src/api/messages.js, notifications.js, MessagesPage.jsx | App.tsx, conversation/messages/notifications screens |
| Administration | Controllers/Api/Admin, admin/admin_mfa middleware, policies | AdminRoute, Admin pages and API modules | Some tasks open the existing Web flow; native does not duplicate every administrative page |
| Media | MediaAssetService, MediaQuarantineService, MediaScanner, MediaController | Upload helpers, media components, Pages storage proxy | src/api/media.ts, Media.tsx, SocialVideo.tsx |
| Realtime | routes/channels.php, Events, Reverb configuration | src/lib/realtime.js | src/api/realtime.ts, realtimeConfig.ts |
| Languages/design | API locale middleware, lang | i18n contexts, styles, brand assets | src/i18n, src/theme, brand assets |

Laravel routes remain in `backend/routes`. Migrations remain in
`backend/database/migrations`. The Web router is `frontend/src/App.jsx`.
Expo Router's `mobile/src/app/_layout.tsx` delegates to the existing `App.tsx`.
The API clients keep their existing locations; no parallel service layer is required.

`Dockerfile.api-demo` builds `backend/` with the repository root as context.
`frontend/Dockerfile` and `docker-compose.yml` support the local Web/API setup.
Compose's database port 3308 remains separate from workstation MySQL 3306,
XAMPP MariaDB 3307, and MongoDB 27017.

The showcase image can supervise Reverb as a separate process on loopback 8081.
Nginx proxies `/app/` with WebSocket upgrade headers and restricts `/apps/` to
loopback. Enable `YAZOO_RUN_REVERB=true` and configure both the HTTP publisher
and public WSS consumer correctly; starting PHP alone does not enable realtime.

Historical reports, installed dependencies, local environments, archives and build
outputs are not release inputs. Local audit evidence remains in ignored `output/`.
