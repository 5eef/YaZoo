# Private R2 media storage

Implementation only. No credentials, bucket provisioning or deployment is performed by this change.

## Owner configuration

Configure these environment names on the backend host using its secret manager:

- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET
- R2_ENDPOINT
- R2_REGION
- MEDIA_STORAGE_DRIVER
- PROFESSIONAL_VERIFICATIONS_DISK
- YAZOO_SHOWCASE_UPLOADS_ENABLED

The two storage selectors must select `r2`, region must be `auto`, and the endpoint must be an HTTPS R2 S3 API endpoint without credentials or query parameters. The dedicated disk is private. Keep the upload flag disabled until credentials and private bucket access have been validated by the owner. No changes to FILESYSTEM_DISK or MEDIA_FILESYSTEM_DISK are required: legacy bundled media keeps its existing public/local disk.

Use a private bucket without r2.dev public access or a public custom domain. Scope the storage credentials to the required bucket operations. Do not paste credentials into source, tests, reports or chat. An endpoint/bucket being configured does not prove live connectivity or bucket privacy.

## Paths and authorization

New objects use `media/posts`, `media/stories`, `media/profiles`, `media/animals`, `media/products`, `media/veterinarians`, `media/communities` and `private/professional-verifications`. Existing relational MediaAsset columns record disk, path, MIME, size, owner, visibility, attachment and state; no migration is required.

API URLs contain relational asset UUIDs, never signed or permanent R2 URLs. Existing GridFS ObjectId URLs continue to work. Posts remain behind the existing authenticated audience/moderation checks. R2 public-media delivery also rejects unavailable/deleted parent resources, hidden marketplace listings for non-owners, expired stories, and inaccessible private communities. Professional documents cannot use the generic media routes; their existing owner/admin document routes and admin MFA middleware remain authoritative.

The R2 adapter removes unsupported object ACL parameters before SDK serialization, including multipart initiation. Bucket privacy provides storage-level protection. Browser/mobile access is through the distributed Cloudflare API, with the local Pages proxy forwarding Range/If-Range and content-range/length/accept-ranges/security headers.

## Streaming and lifecycle

Remote video requests use S3 GetObject with a byte Range and streaming HTTP response. The API copies a resource stream to the response, without reading the full object into memory. Supported single ranges include closed, suffix and open-ended ranges. Invalid ranges return 416; HEAD returns metadata without a body. If-Range falls back to a complete response because this controller does not emit validators. Generic protected responses use private/no-store and nosniff.

Avatar, cover, community, veterinarian, post and story removal/replacement uses relational ownership and attachment checks. Physical deletion follows database commit. Animals/products intentionally retain attached media on soft deletion for recovery; replacement removes the previous managed object. The unique disk/path hash constraint prevents multiple MediaAsset rows from claiming one object. Cleanup additionally checks remaining relational references before deleting bytes. Legacy local media and GridFS remain supported.

Professional document replacement and retention cleanup understand both legacy private paths and new R2 paths. Account-deletion cleanup recognizes the new private prefix; no account-deletion operation is executed against showcase by these tests.

## Fail-closed and readiness

RejectDisabledShowcaseUploads remains installed. In showcase, uploaded files receive 409 showcase.uploads_disabled unless uploads are explicitly enabled, media and document disks select R2, and the required R2 configuration is complete. Missing configuration cannot silently fall back to Render local storage. Runtime storage failures are server errors; SDK request details are not exposed by the streaming/write abstraction.

/health/ready exposes media_driver and media_storage readiness without keys, bucket or endpoint. This is configuration readiness only, not proof of authenticated R2 access. Owner acceptance must additionally verify real upload/read/replace/delete, private document denial, video ranges through Pages, and persistence after a Render restart. No cloud uploads or restart are performed before owner configuration.

Tests use Storage::fake and AWS SDK MockHandler, with the complete backend suite on SQLite :memory: and Docker network disabled. Native device playback still requires OWNER DEVICE QA REQUIRED.

References: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-php/ and https://developers.cloudflare.com/r2/api/s3/api/
