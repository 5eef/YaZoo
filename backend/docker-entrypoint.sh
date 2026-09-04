#!/bin/sh
set -e

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

mkdir -p /var/lib/nginx/tmp /var/log/nginx /run/nginx storage/app storage/app/private

if [ "${YAZOO_REQUIRE_PERSISTENT_STORAGE:-false}" = "true" ]; then
    if [ -z "${YAZOO_PERSISTENT_STORAGE_PATH:-}" ]; then
        echo "YAZOO_PERSISTENT_STORAGE_PATH is required when persistent storage is enabled." >&2
        exit 1
    fi

    mkdir -p "${YAZOO_PERSISTENT_STORAGE_PATH}/app/public" "${YAZOO_PERSISTENT_STORAGE_PATH}/app/private"
    rm -rf storage/app/public
    ln -s "${YAZOO_PERSISTENT_STORAGE_PATH}/app/public" storage/app/public
    rm -rf storage/app/private
    ln -s "${YAZOO_PERSISTENT_STORAGE_PATH}/app/private" storage/app/private
else
    mkdir -p storage/app/public storage/app/private
fi

chown -R www-data:www-data /var/lib/nginx /var/log/nginx /run/nginx storage bootstrap/cache

# Docker creates stdout/stderr pipes for root. Nginx and PHP-FPM reopen these
# paths while starting, so the non-root runtime user needs write permission.
# This changes only the container log pipes, never application files or data.
chmod a+w /dev/stdout /dev/stderr

if [ "${YAZOO_REQUIRE_PERSISTENT_STORAGE:-false}" = "true" ]; then
    chown -R www-data:www-data "${YAZOO_PERSISTENT_STORAGE_PATH}"
fi

# The entrypoint performs only filesystem initialization as root. Application,
# worker, scheduler, Reverb, PHP-FPM and Nginx processes all run as www-data.
exec su-exec www-data "$@"
