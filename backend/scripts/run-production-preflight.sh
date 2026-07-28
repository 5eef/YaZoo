#!/bin/sh
set -eu

app_environment="${APP_ENV:-local}"
preflight_enabled="${YAZOO_RUN_PRODUCTION_PREFLIGHT:-false}"

if [ "$app_environment" != "production" ]; then
    echo "Production preflight skipped outside production."
    exit 0
fi

if [ "$preflight_enabled" != "true" ]; then
    echo "WARNING: production preflight is explicitly disabled; startup will continue."
    exit 0
fi

echo "Running production preflight."
su-exec www-data php artisan yazoo:preflight-production
