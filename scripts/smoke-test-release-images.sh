#!/bin/sh
set -eu

backend_image="${1:?backend image is required}"
frontend_image="${2:?frontend image is required}"
backend_container=""
frontend_container=""

cleanup() {
    if [ -n "$backend_container" ]; then
        docker stop "$backend_container" >/dev/null 2>&1 || true
    fi
    if [ -n "$frontend_container" ]; then
        docker stop "$frontend_container" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT INT TERM

fail_with_logs() {
    label="$1"
    container="$2"
    echo "${label} runtime smoke test failed." >&2
    docker logs "$container" >&2 || true
    exit 1
}

wait_for_endpoint() {
    label="$1"
    container="$2"
    endpoint="$3"

    for attempt in $(seq 1 30); do
        if docker exec "$container" wget -qO- "$endpoint" >/dev/null 2>&1; then
            return 0
        fi
        if [ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" != "true" ]; then
            fail_with_logs "$label" "$container"
        fi
        echo "${label} runtime smoke attempt ${attempt}/30 is not ready yet."
        sleep 2
    done

    fail_with_logs "$label" "$container"
}

assert_no_root_processes() {
    label="$1"
    container="$2"

    if docker top "$container" -eo user | tail -n +2 | grep -Eq '^[[:space:]]*root[[:space:]]*$'; then
        echo "${label} runtime unexpectedly contains a root process." >&2
        docker top "$container" -eo user,pid,comm >&2 || true
        exit 1
    fi
}

backend_container="$(docker run --detach --rm \
    --env APP_ENV=local \
    --env YAZOO_RUNTIME_OPTIMIZE=false \
    "$backend_image")"
frontend_container="$(docker run --detach --rm "$frontend_image")"

wait_for_endpoint backend "$backend_container" http://127.0.0.1:8080/health/live
wait_for_endpoint frontend "$frontend_container" http://127.0.0.1:8080/version.json
assert_no_root_processes backend "$backend_container"
assert_no_root_processes frontend "$frontend_container"

echo "release-image-runtime-smoke=ok"
