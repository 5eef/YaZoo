# Idea'Wave operations candidate — 20 October 2026

This candidate preserves the existing showcase configuration. No service activation,
DNS change, purge, account promotion, password change or public deployment is implied.

## Dependency and activation matrix

| Capability | Code path / dependency | External prerequisite | Activation gate |
| --- | --- | --- | --- |
| Email | Laravel native Resend transport + resend/resend-php 1.17 | Server key, verified sender domain, authorized recipient | Real receipt, provider error tests, then MAIL_MAILER=resend |
| Scheduler | startup.sh schedule:work; OperationsSchedule; shared database locks | Running Render process; reviewed retention selections | Recurrent heartbeat and purge dry-run proof; Free sleep remains a limitation |
| Realtime | Reverb, Laravel Echo, pusher-js; existing private channels | WSS endpoint, private auth, memory/load evidence | Two real authenticated sessions, reconnect/account isolation; keep polling |
| Alternative realtime | Ably Free, not implemented or enabled by this candidate | Existing account/key; token adapter and client integration still required | Scoped tokens, private channels, bounded reconnect and real WSS tests |
| Upload scan | ClamAvMediaScanner, MediaQuarantineService | Private clamd, current signatures, adequate memory | Real CLEAN/EICAR tests and complete MIME/video/error matrix before public activation |
| Administration | Existing Sanctum, MFA, role checks and audit | Explicitly authorized administrator; admissible documents | Positive hosted MFA/admin tests without promotion or fabricated verification |
| TiDB recovery | Logical encrypted snapshot + isolated MySQL restoration | Owner-controlled encrypted off-machine destination | Counts, row HMACs, relationships, key recovery; native TiDB restore remains separate |
| R2 recovery | List/read only inventory; encrypted object copy | Existing private bucket credentials; protected recovery destination | Reference reconciliation, byte verification, isolated S3 restore and off-machine recovery |
| MongoDB | mongodb/mongodb 2.4.2, PHP extension, GridFS abstraction | Configured cluster, quota and recovery evidence | No migration from R2; no active cluster or backup certification inferred |

## Email

Use `RESEND_API_KEY` on the server. `RESEND_KEY` remains a compatibility fallback;
the canonical name takes precedence. Never place either key in Vite or mobile config.
The native Laravel transport uses the locked PHP SDK, HTTPS to api.resend.com,
3-second connect and 10-second total timeouts, no redirects and no automatic retry.
A timeout can follow successful acceptance: investigate delivery before resending.
Account recovery keeps a generic response when the provider fails. Existing rate
limits, token hashes, expiry and single-use consumption remain intact.

Before activation, inspect Resend's domain status. Obtain the exact required DNS
records from that account; review existing MX/SPF/DKIM/DMARC and portfolio impact.
Do not invent DNS values or change portfolio DNS without authorization. Send one
test only to the authorized validation recipient, and confirm receipt. API acceptance
alone is insufficient. Reservation, appointment and message notifications currently
use the existing database notifications; this candidate adds no unsolicited mail.

The `log` mail and broadcast transports now emit only technical delivery-skipped
metadata. They deliberately provide no receipt or WebSocket delivery evidence.

## Quarantine and ClamAV

`MEDIA_SCAN_DRIVER=clamav` selects the new adapter. Configure `CLAMAV_ENDPOINT`
with a Unix socket or a trusted private TCP endpoint, never a public unauthenticated
clamd port. `CLAMAV_TIMEOUT_SECONDS` defaults to 20, below the queue job timeout.
Set clamd StreamMaxLength at least as high as MEDIA_SCAN_MAX_BYTES. Enable
AlertExceedsMax and AlertEncrypted as appropriate; keep signatures current and
monitor signature age, reload memory peaks and failures. The local stock daemon
reported AlertExceedsMax disabled; it is not a hardened production configuration.

The adapter streams framed INSTREAM chunks and recognizes only the exact CLEAN
reply. Infection, incomplete/malformed response, timeout, read error, over-limit
stream or unavailable daemon never authorizes publication. The existing result
contract has CLEAN, INFECTED and SCAN_FAILED; reason `scanner_unavailable`
distinguishes unavailability without an incompatible database state.

The shared upload service now scans avatars, covers, posts/Reels, Stories, marketplace
images, veterinarian/community images and professional documents when scan policy
applies. The production deployment profile always requires scanning, even if scan
flags are false. Existing showcase flags are preserved pending impact approval.
Private clean uploads stay on private storage. Only CLEAN assets can leave quarantine;
UUID names, directory rejection and MIME/extension pairing apply before quarantine.
Synchronous upload scans have no automatic retry; async jobs retain bounded retries.
Failed files remain unattached and private for investigation/retry/retention review.
No historical objects are rescanned, rewritten or deleted by these changes.

Local benchmark: clamd idle memory approximately 1.018 GiB; PNG and EICAR about
28 ms each on this workstation. This excludes signature-update peaks and concurrent
uploads. Do not cohost it in the existing Render Free service on that evidence.

## Scheduler and realtime decision

Do not activate all scheduled tasks as a connectivity test. Inventory with
`php artisan schedule:list`; run destructive commands only with an existing dry-run
option or on a disposable database and synthetic storage. Review shared-object
selection, limits, locks and interruption handling before any remote purge.
Render Free sleeps and may restart: schedule:work is not continuous scheduling.
No keepalive traffic, paid Cron service or generic Artisan HTTP endpoint is added.
Cloudflare Cron remains blocked on credentials and a reviewed HMAC/replay/locking
implementation; no unsigned endpoint exists in this candidate.

Prefer evaluating Ably for the prototype once an existing free account is available;
it avoids cohosting another daemon with PHP-FPM. Its current Free documentation lists
200 concurrent connections and 6 million messages/month, subject to account limits.
No Ably adapter is claimed implemented. Reverb remains the existing code adapter;
Render needs a single public-port Nginx WSS reverse proxy, origin checks and a
separate memory/reconnect benchmark. Neither provider is hosted-validated here.
Keep VITE_REALTIME_ENABLED=false and the existing polling until those gates pass.

## Recovery and rollback

Before any public change, record the effective Render variables by name/presence,
current image digest, deploy IDs, health version, database counts/migrations and R2
inventory. Keep values and private object manifests out of Git and reports.
Never interpret an unreferenced object as permission to delete it; legacy model
paths can still refer to it. Never sync destructively into the active bucket.

The mission's encrypted snapshots and private recovery material live outside tracked
files in output/ideawave-operations. TiDB SQL exists only in memory and ciphertext.
Windows DPAPI protects the key; this is not an off-machine recovery solution.
Arrange an owner-controlled encrypted independent destination and a recoverable
key escrow before claiming disaster recovery. Do not transfer private documents to
public analysis services. An incremental production backup job is not deployed.

No migration is introduced. Rollback of this candidate uses the unchanged public
application image at commit df06914fc596a73d2b775156f7be0c7b5598cfad, after verifying
the live target still matches the baseline. Never restore a database automatically
as part of an application rollback; retain newly created data and R2 references.

## Blocking findings from this mission

R2 inventory found 15 objects and 18 MediaAsset references. Five active attached
images are missing: two Animal and three Product assets. Thirteen references match
object sizes; two other objects are not classified as orphans. No bucket mutation
or relational cleanup was performed. Restore only original verified bytes after
identifying the authoritative source; do not regenerate historical media.

Trivy reports two HIGH findings in the unchanged mobile dependency tree:
braces 3.0.3 (CVE-2026-93687) and node-forge 1.4.0 (CVE-2026-85393).
The npm registry still lists those versions as latest. npm audit reports 19 HIGH
entries including their dependent packages. No compatible upstream fix was found;
automatic forced fixes propose incompatible Expo downgrades. No waiver, ignored
advisory or mobile dependency change is introduced. Publication remains blocked.

The first candidate CI could not initialize MongoDB on the new ubuntu-latest
kernel (SERVER-121912). The concurrency job now uses ubuntu-22.04, retaining the
pinned MongoDB image, its startup safety check and every concurrency assertion.
This changes only the disposable test runner, not any YaZoo database or cluster.

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv

Sources checked during this mission:

- https://docs.clamav.net/manual/Usage/ClamdProtocol.html
- https://docs.clamav.net/manual/Installing/Docker.html
- https://render.com/docs/free
- https://render.com/docs/websocket
- https://ably.com/docs/platform/pricing/free

## Manual 2–3 minute backup demonstration

Use only authorized DEMO identities and clearly label all demo data. Prepare two
browser profiles beforehand; never record login passwords, recovery links or MFA.

| Time | Recording step |
| --- | --- |
| 0:00–0:20 | Open YaZoo; show waking/retry honestly if the backend is asleep. |
| 0:20–0:45 | Search for a DEMO veterinarian in Sefrou, open the profile and services. |
| 0:45–1:10 | Show availability and request one appointment from the client session. |
| 1:10–1:35 | Switch to the authorized DEMO veterinarian and confirm that request. |
| 1:35–2:00 | Return to the client; show status and the persisted notification. |
| 2:00–2:25 | Exchange one message in the two prepared sessions; identify polling if used. |
| 2:25–2:45 | Reload history and demonstrate that the request/message remain present. |

Record only after reconciling current availability and authorized accounts. If a
mutation times out, read its status before deciding whether another request is safe.
This is a recording script, not evidence that the hosted journey was replayed.
