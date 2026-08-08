# Account deletion recovery and media quarantine

This document describes the operational contract implemented by YaZoo. It does
not authorize a production deployment, a data migration, or the installation of
an antivirus provider.

## Account deletion attempt budget

`YAZOO_ACCOUNT_DELETION_RETRY_MAX_ATTEMPTS` is the single processing-attempt
budget. The administrator-triggered initial attempt is included in that number.
The supported range is 2 to 50 and the default is 5. For example, a configured
value of 2 permits the initial attempt plus one queued recovery.

Each successful claim increments `processing_attempts` exactly once under a row
lock. A `processing` lease becomes recoverable after
`YAZOO_ACCOUNT_DELETION_PROCESSING_LEASE_SECONDS` (default 900 seconds). The
scheduled dispatcher runs every five minutes when the queue is asynchronous and
recovers both pre-anonymization crashes and post-anonymization purges that have a
persistent manifest.

Exhausted requests are terminal:

- `processing_recovery_exhausted` before database anonymization;
- `storage_cleanup_exhausted` after database anonymization.

Terminal requests are not automatically dispatched again and generate a
critical log. Queue uniqueness uses
`YAZOO_ACCOUNT_DELETION_UNIQUE_LOCK_STORE`; the production preflight requires a
shared atomic cache driver such as Redis.

## Media quarantine contract

The provider-independent quarantine code is deliberately disabled by default
and is not yet connected to the existing public upload endpoints. Activating it
without a real scanner would change upload behavior and fail closed.

The implemented lifecycle is:

1. validate size, detected MIME type, extension and upload validity;
2. store under the private quarantine disk with state `pending`;
3. claim the asset under a row lock and set `scanning`;
4. scan through `MediaScanner` with bounded queue retries and timeout;
5. publish only a `clean` result;
6. keep `infected` and `scan_failed` files private;
7. emit bounded status metrics and logs without file content.

`MEDIA_SCAN_UNIQUE_LOCK_STORE` must be shared in production. The production
preflight refuses a required scan policy when scanning is disabled, the provider
is unavailable, or the unique-lock store is local.

## Provider decision required

| Option | Operational impact | Azure compatibility | Cost considerations |
| --- | --- | --- | --- |
| ClamAV `clamd` sidecar | Maintain the image and signature updates; bound `INSTREAM`, threads, queue and timeouts. ClamAV recommends at least about 3 GiB RAM and 5 GiB additional disk for a server installation. | App Service supports sidecars sharing the main container network, but enabling sidecar mode is an infrastructure change and plan capacity must be validated. | No scanner licence fee, but App Service memory/CPU, image maintenance and monitoring are operator costs. |
| Microsoft Defender for Storage malware scanning | Store uploads in private Azure Blob quarantine, consume scan results (for example through Event Grid/index tags), and publish only after a clean result. | Managed Azure option, but the current filesystem media pipeline must first be migrated atomically to Blob storage. | Defender for Storage account pricing plus scanned data per GiB and related Storage/Event Grid operations; configure and alert on the monthly scan cap. |

Official references:

- <https://docs.clamav.net/>
- <https://docs.clamav.net/manual/Usage/ClamdProtocol.html>
- <https://learn.microsoft.com/azure/app-service/configure-sidecar>
- <https://learn.microsoft.com/azure/defender-for-cloud/defender-for-storage-introduction>

Before provider integration, approve the expected Azure cost, maintenance owner,
memory budget, outage behavior, migration plan and rollback. Production must
remain fail-closed: a scanner outage must never publish an unscanned file.
