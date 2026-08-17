#!/bin/sh
set -eu

app_environment="${APP_ENV:-local}"
preflight_enabled="${YAZOO_RUN_PRODUCTION_PREFLIGHT:-false}"
preflight_mode="${1:-full}"

run_as_app_user() {
    if [ "$(id -u)" = "0" ]; then
        su-exec www-data "$@"
        return
    fi

    "$@"
}

if [ "$app_environment" != "production" ]; then
    echo "Production preflight skipped outside production."
    exit 0
fi

if [ "$preflight_enabled" != "true" ]; then
    echo "WARNING: production preflight is explicitly disabled; startup will continue."
    exit 0
fi

case "$preflight_mode" in
    full)
        echo "Running production preflight."
        run_as_app_user php artisan yazoo:preflight-production
        ;;
    --configuration-only)
        echo "Running production configuration preflight."
        run_as_app_user php artisan yazoo:preflight-production --configuration-only
        ;;
    *)
        echo "Unsupported production preflight mode: $preflight_mode" >&2
        exit 64
        ;;
esac
