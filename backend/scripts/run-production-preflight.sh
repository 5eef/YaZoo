#!/bin/sh
set -eu

app_environment="${APP_ENV:-local}"
preflight_enabled="${YAZOO_RUN_PRODUCTION_PREFLIGHT:-false}"
preflight_mode="${1:-full}"

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
        su-exec www-data php artisan yazoo:preflight-production
        ;;
    --configuration-only)
        echo "Running production configuration preflight."
        su-exec www-data php artisan yazoo:preflight-production --configuration-only
        ;;
    *)
        echo "Unsupported production preflight mode: $preflight_mode" >&2
        exit 64
        ;;
esac
