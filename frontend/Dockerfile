FROM node:22.22-alpine@sha256:e58326d0d441090181ac150dc2078d3e2cf6a0d42e809aebba3ef5880935ffdd AS build

WORKDIR /app/frontend

ARG VITE_APP_NAME=YaZoo
ARG VITE_API_URL=/api
ARG VITE_STORAGE_URL=/storage
ARG VITE_REALTIME_ENABLED=false
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ARG VITE_MONITORING_ENABLED=false
ARG VITE_MONITORING_ENDPOINT=/api/monitoring/frontend-error
ARG VITE_NOTIFICATIONS_POLL_MS=30000
ARG VITE_BUILD_SOURCEMAPS=false
ARG APP_VERSION=local

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_URL=$VITE_STORAGE_URL \
    VITE_REALTIME_ENABLED=$VITE_REALTIME_ENABLED \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME \
    VITE_MONITORING_ENABLED=$VITE_MONITORING_ENABLED \
    VITE_MONITORING_ENDPOINT=$VITE_MONITORING_ENDPOINT \
    VITE_NOTIFICATIONS_POLL_MS=$VITE_NOTIFICATIONS_POLL_MS \
    VITE_BUILD_SOURCEMAPS=$VITE_BUILD_SOURCEMAPS

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.30.4-alpine3.24@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46

ARG APP_VERSION=local
ENV BACKEND_UPSTREAM=https://yazoo-api.azurewebsites.net

LABEL org.opencontainers.image.title="YaZoo Frontend" \
      org.opencontainers.image.description="YaZoo social platform and animal marketplace frontend." \
      org.opencontainers.image.authors="Youssef BOUGHIOUL <youssefboughioul@gmail.com>" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.vendor="Youssef BOUGHIOUL"

COPY infra/nginx/frontend.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY LICENSE /usr/share/nginx/html/LICENSE.txt
RUN set -eux; \
    printf '{"version":"%s"}\n' "$APP_VERSION" > /usr/share/nginx/html/version.json; \
    sed -i 's/listen  *80;/listen 8080;/' /etc/nginx/templates/default.conf.template; \
    sed -i 's!^[[:space:]]*pid[[:space:]].*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf; \
    chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
