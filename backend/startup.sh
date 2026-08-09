#!/bin/sh
set -e

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

chown -R nginx:nginx /var/lib/nginx /var/log/nginx /run/nginx
chown -R www-data:www-data storage bootstrap/cache

if [ -d /home/site/yazoo-storage ]; then
    chown -R www-data:www-data /home/site/yazoo-storage
fi
cp /var/www/html/nginx.conf /etc/nginx/http.d/default.conf

if [ "${YAZOO_RUN_SHOWCASE_BOOTSTRAP:-false}" = "true" ]; then
    if [ "${YAZOO_RUN_MIGRATIONS:-false}" != "true" ]; then
        echo "YAZOO_RUN_MIGRATIONS=true is required for showcase bootstrap." >&2
        exit 1
    fi

    if [ -z "${YAZOO_SHOWCASE_CONFIRMATION:-}" ]; then
        echo "YAZOO_SHOWCASE_CONFIRMATION is required for showcase bootstrap." >&2
        exit 1
    fi

    su-exec www-data php artisan yazoo:migrate-production

    if [ "${YAZOO_RESET_RUNTIME_STATE:-false}" = "true" ]; then
        su-exec www-data php artisan cache:clear
        su-exec www-data php artisan queue:clear "${QUEUE_CONNECTION:-redis}" --force
    fi

    su-exec www-data php artisan yazoo:bootstrap-azure-showcase \
        --images="${YAZOO_SHOWCASE_IMAGES_PATH:-/opt/yazoo-showcase-images}" \
        --confirmation="${YAZOO_SHOWCASE_CONFIRMATION}"

    sh /var/www/html/scripts/run-production-preflight.sh
else
    sh /var/www/html/scripts/run-production-preflight.sh

    if [ "${YAZOO_RUN_MIGRATIONS:-false}" = "true" ]; then
        su-exec www-data php artisan yazoo:migrate-production
    fi

    if [ "${YAZOO_RESET_RUNTIME_STATE:-false}" = "true" ]; then
        su-exec www-data php artisan cache:clear
        su-exec www-data php artisan queue:clear "${QUEUE_CONNECTION:-redis}" --force
    fi
fi

if [ "${YAZOO_RUNTIME_OPTIMIZE:-true}" = "true" ]; then
    su-exec www-data php artisan optimize
fi

managed_pids=""
scheduler_pid=""
queue_pid=""
php_fpm_pid=""
nginx_pid=""

start_managed_process() {
    process_name="$1"
    shift
    "$@" &
    process_pid=$!
    managed_pids="${managed_pids} ${process_pid}"
    eval "${process_name}_pid=${process_pid}"
    echo "Started ${process_name} with PID ${process_pid}."
}

shutdown_managed_processes() {
    exit_status="${1:-0}"
    trap - TERM INT

    for process_pid in ${managed_pids}; do
        kill -TERM "${process_pid}" 2>/dev/null || true
    done

    for process_pid in ${managed_pids}; do
        wait "${process_pid}" 2>/dev/null || true
    done

    exit "${exit_status}"
}

check_managed_process() {
    process_name="$1"
    process_pid="$2"

    if [ -z "${process_pid}" ] || kill -0 "${process_pid}" 2>/dev/null; then
        return
    fi

    set +e
    wait "${process_pid}"
    process_status=$?
    set -e

    if [ "${process_status}" -eq 0 ]; then
        process_status=1
    fi

    echo "Managed process ${process_name} exited unexpectedly with status ${process_status}." >&2
    shutdown_managed_processes "${process_status}"
}

trap 'shutdown_managed_processes 143' TERM INT

if [ "${YAZOO_RUN_SCHEDULER:-false}" = "true" ]; then
    start_managed_process scheduler su-exec www-data php artisan schedule:work
fi

if [ "${YAZOO_RUN_QUEUE_WORKER:-false}" = "true" ]; then
    start_managed_process queue su-exec www-data php artisan queue:work "${QUEUE_CONNECTION:-redis}" --sleep="${YAZOO_QUEUE_SLEEP:-1}" --tries="${YAZOO_QUEUE_TRIES:-3}" --backoff="${YAZOO_QUEUE_BACKOFF:-5}" --timeout="${YAZOO_QUEUE_TIMEOUT:-90}" --memory="${YAZOO_QUEUE_MEMORY:-256}"
fi

start_managed_process php_fpm php-fpm -F
start_managed_process nginx nginx -g "daemon off;"

while true; do
    check_managed_process scheduler "${scheduler_pid}"
    check_managed_process queue "${queue_pid}"
    check_managed_process php-fpm "${php_fpm_pid}"
    check_managed_process nginx "${nginx_pid}"
    sleep 2
done
