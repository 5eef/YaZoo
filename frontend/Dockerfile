FROM node:22.23.4-alpine3.24@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build

WORKDIR /app/frontend

ARG VITE_APP_NAME=YaZoo
ARG VITE_API_URL=/api
ARG VITE_STORAGE_URL=/storage
ARG VITE_REALTIME_ENABLED=false
ARG VITE_REVERB_APP_KEY=
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ARG VITE_MONITORING_ENABLED=false
ARG VITE_MONITORING_ENDPOINT=/api/monitoring/frontend-error
ARG VITE_NOTIFICATIONS_POLL_MS=30000
ARG VITE_BUILD_SOURCEMAPS=false
ARG VITE_SITE_URL=
ARG APP_VERSION=local

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL \
    VITE_REALTIME_ENABLED=$VITE_REALTIME_ENABLED \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME \
    VITE_MONITORING_ENABLED=$VITE_MONITORING_ENABLED \
    VITE_MONITORING_ENDPOINT=$VITE_MONITORING_ENDPOINT \
    VITE_NOTIFICATIONS_POLL_MS=$VITE_NOTIFICATIONS_POLL_MS \
    VITE_BUILD_SOURCEMAPS=$VITE_BUILD_SOURCEMAPS \
    VITE_SITE_URL=$VITE_SITE_URL

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY frontend/ ./
RUN npm run build

FROM nginx:1.30.6-alpine3.24@sha256:47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951

ARG APP_VERSION=local
ENV BACKEND_UPSTREAM=http://host.docker.internal:8000

LABEL org.opencontainers.image.title="YaZoo Frontend" \
      org.opencontainers.image.description="YaZoo social platform and animal marketplace frontend." \
      org.opencontainers.image.authors="Youssef BOUGHIOUL <bough.youssef@gmail.com>" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Youssef BOUGHIOUL"

COPY infra/nginx/frontend.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY LICENSE /usr/share/nginx/html/LICENSE.txt
RUN set -eux; \
    if apk info --exists brotli-libs >/dev/null; then apk add --no-cache 'brotli-libs>=1.2.1-r0'; fi; \
    apk upgrade --no-cache libcrypto3 libssl3 libexpat libuuid pcre2 tiff libx11; \
    printf '{"version":"%s"}\n' "$APP_VERSION" > /usr/share/nginx/html/version.json; \
    sed -i 's/listen  *80;/listen 8080;/' /etc/nginx/templates/default.conf.template; \
    sed -i 's!^[[:space:]]*pid[[:space:]].*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf; \
    chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
