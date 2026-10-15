#!/bin/sh
# Exercise the actual supervisor with deterministic process/probe failures.
set -eu
root="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir "$work/bin"
export TEST_WORK="$work"
export REAL_SH="$(command -v sh)"
cat > "$work/bin/sh" <<'EOF'
#!/bin/sh
case "$1" in /var/www/html/scripts/run-production-preflight.sh) echo preflight >> "$TEST_WORK/events"; exit 0;; esac
exec "$REAL_SH" "$@"
EOF
cat > "$work/bin/php" <<'EOF'
#!/bin/sh
if [ "$1" = artisan ]; then echo "$*" >> "$TEST_WORK/events"; exit 0; fi
count=$(cat "$TEST_WORK/count" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "$TEST_WORK/count"
case "$TEST_CASE" in
    delayed) [ "$count" -ge 4 ] || exit 1;;
    timeout|exit) exit 1;;
    signal) kill -TERM "$PPID"; exit 1;;
esac
echo ready >> "$TEST_WORK/events"
exit 0
EOF
cat > "$work/bin/php-fpm" <<'EOF'
#!/bin/sh
echo fpm >> "$TEST_WORK/events"
[ "$TEST_CASE" != exit ] || exit 23
trap 'echo fpm-stopped >> "$TEST_WORK/events"; exit 0' TERM INT
while :; do sleep 0.1; done
EOF
cat > "$work/bin/nginx" <<'EOF'
#!/bin/sh
grep -q '^ready$' "$TEST_WORK/events" || exit 99
echo nginx >> "$TEST_WORK/events"
# Exit to verify the existing fail-closed supervisor and cleanup too.
exit 17
EOF
chmod +x "$work/bin/"*
for scenario in delayed timeout exit signal; do
    export TEST_CASE="$scenario"
    : > "$work/events"
    echo 0 > "$work/count"
    set +e
    PATH="$work/bin:$PATH" YAZOO_RUNTIME_OPTIMIZE=true \
        YAZOO_RUN_SHOWCASE_BOOTSTRAP=true YAZOO_RUN_MIGRATIONS=true \
        YAZOO_SHOWCASE_CONFIRMATION=test-only \
        "$REAL_SH" "$root/startup.sh" > "$work/log" 2>&1
    status=$?
    set -e
    case "$scenario" in
        delayed)
            test "$status" -eq 17
            grep -q '^nginx$' "$work/events"
            test "$(cat "$work/count")" -eq 4
            grep -q 'PHP-FPM is ready' "$work/log"
            ;;
        timeout)
            test "$status" -eq 1
            test "$(cat "$work/count")" -eq 30
            grep -q 'readiness timed out' "$work/log"
            ! grep -q '^nginx$' "$work/events"
            ;;
        exit)
            test "$status" -eq 23
            grep -q 'exited unexpectedly' "$work/log"
            ! grep -q '^nginx$' "$work/events"
            ;;
        signal)
            test "$status" -eq 143
            ! grep -q '^nginx$' "$work/events"
            ;;
    esac
    if [ "$scenario" != exit ]; then grep -q '^fpm-stopped$' "$work/events"; fi
    # Bootstrap and optimization must still precede PHP-FPM.
    grep -q 'artisan yazoo:refresh-showcase-availability' "$work/events"
    grep -q '^preflight$' "$work/events"
    grep -q 'artisan optimize' "$work/events"
    echo "php-fpm-readiness $scenario=ok"
done
