#!/bin/sh
set -eu

backend_root="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
gate="$backend_root/scripts/run-production-preflight.sh"
test_root="$(mktemp -d)"
fake_bin="$test_root/bin"
invocation_log="$test_root/invocations.log"
mkdir -p "$fake_bin"

cleanup() {
    rm -rf "$test_root"
}
trap cleanup EXIT INT TERM

cat > "$fake_bin/id" <<'EOF'
#!/bin/sh
printf '%s\n' "${PREFLIGHT_FAKE_UID:-1000}"
EOF
chmod +x "$fake_bin/id"

cat > "$fake_bin/php" <<'EOF'
#!/bin/sh
printf 'php %s\n' "$*" >> "$PREFLIGHT_INVOCATION_LOG"
exit "${PREFLIGHT_FAKE_EXIT_CODE:-0}"
EOF
chmod +x "$fake_bin/php"

cat > "$fake_bin/su-exec" <<'EOF'
#!/bin/sh
printf 'su-exec %s\n' "$*" >> "$PREFLIGHT_INVOCATION_LOG"
exit "${PREFLIGHT_FAKE_EXIT_CODE:-0}"
EOF
chmod +x "$fake_bin/su-exec"

run_gate() {
    expected_status="$1"
    app_environment="$2"
    enabled="$3"
    fake_status="$4"
    mode="${5:-full}"
    fake_uid="${6:-1000}"
    output_file="$test_root/output"

    : > "$invocation_log"
    set +e
    PATH="$fake_bin:$PATH" \
        PREFLIGHT_INVOCATION_LOG="$invocation_log" \
        PREFLIGHT_FAKE_EXIT_CODE="$fake_status" \
        PREFLIGHT_FAKE_UID="$fake_uid" \
        APP_ENV="$app_environment" \
        YAZOO_RUN_PRODUCTION_PREFLIGHT="$enabled" \
        sh "$gate" "$mode" > "$output_file" 2>&1
    actual_status=$?
    set -e

    if [ "$actual_status" -ne "$expected_status" ]; then
        printf 'Expected status %s, got %s for APP_ENV=%s enabled=%s\n' \
            "$expected_status" "$actual_status" "$app_environment" "$enabled" >&2
        cat "$output_file" >&2
        exit 1
    fi
}

run_gate 0 production true 0
grep -Fxq 'php artisan yazoo:preflight-production' "$invocation_log"

run_gate 23 production true 23
grep -Fxq 'php artisan yazoo:preflight-production' "$invocation_log"

run_gate 0 production true 0 --configuration-only
grep -Fxq 'php artisan yazoo:preflight-production --configuration-only' "$invocation_log"

run_gate 0 production true 0 full 0
grep -Fxq 'su-exec www-data php artisan yazoo:preflight-production' "$invocation_log"

run_gate 64 production true 0 --unsupported
test ! -s "$invocation_log"
grep -Fq 'Unsupported production preflight mode' "$test_root/output"

run_gate 0 local true 23
test ! -s "$invocation_log"
grep -Fq 'skipped outside production' "$test_root/output"

run_gate 0 production false 23
test ! -s "$invocation_log"
grep -Fq 'explicitly disabled' "$test_root/output"

echo "production-preflight-gate=ok"
