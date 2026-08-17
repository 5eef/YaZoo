#!/bin/sh
set -e

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

mkdir -p /var/lib/nginx/tmp /var/log/nginx /run/nginx storage/app storage/app/private

if [ -d /home/site ]; then
    mkdir -p /home/site/yazoo-storage/app/public /home/site/yazoo-storage/app/private
    rm -rf storage/app/public
    ln -s /home/site/yazoo-storage/app/public storage/app/public
    rm -rf storage/app/private
    ln -s /home/site/yazoo-storage/app/private storage/app/private
else
    mkdir -p storage/app/public storage/app/private
fi

chown -R www-data:www-data /var/lib/nginx /var/log/nginx /run/nginx storage bootstrap/cache

# Docker creates stdout/stderr pipes for root. Nginx and PHP-FPM reopen these
# paths while starting, so the non-root runtime user needs write permission.
# This changes only the container log pipes, never application files or data.
chmod a+w /dev/stdout /dev/stderr

if [ -d /home/site/yazoo-storage ]; then
    chown -R www-data:www-data /home/site/yazoo-storage
fi

# The entrypoint performs only filesystem initialization as root. Application,
# worker, scheduler, Reverb, PHP-FPM and Nginx processes all run as www-data.
exec su-exec www-data "$@"
