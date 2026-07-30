FROM php:8.4-fpm-alpine AS vendor

WORKDIR /app

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN set -eux; \
    apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        linux-headers; \
    pecl install mongodb; \
    docker-php-ext-enable mongodb; \
    apk del .build-deps

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts

FROM php:8.4-fpm-alpine AS production

ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

LABEL org.opencontainers.image.title="YaZoo API" \
      org.opencontainers.image.description="YaZoo social platform and animal marketplace backend." \
      org.opencontainers.image.authors="Youssef BOUGHIOUL <youssefboughioul@gmail.com>" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Youssef BOUGHIOUL"

WORKDIR /var/www/html

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN set -eux; \
    apk add --no-cache \
        bash \
        icu-libs \
        libzip \
        nginx \
        supervisor \
        su-exec; \
    apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        icu-dev \
        libzip-dev \
        linux-headers; \
    docker-php-ext-install \
        bcmath \
        intl \
        opcache \
        pcntl \
        pdo_mysql \
        zip; \
    pecl install redis mongodb; \
    docker-php-ext-enable redis mongodb opcache; \
    apk del .build-deps

COPY --from=vendor /app/vendor ./vendor
COPY backend/ ./
COPY LICENSE /licenses/YaZoo-LICENSE

RUN set -eux; \
    composer dump-autoload --optimize; \
    php artisan package:discover --ansi; \
    mkdir -p \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache; \
    chown -R www-data:www-data storage bootstrap/cache

COPY backend/startup.sh /usr/local/bin/yazoo-startup
COPY backend/docker-entrypoint.sh /usr/local/bin/yazoo-entrypoint
RUN chmod +x /usr/local/bin/yazoo-startup /usr/local/bin/yazoo-entrypoint

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health/live >/dev/null || exit 1

ENTRYPOINT ["yazoo-entrypoint"]
CMD ["yazoo-startup"]
