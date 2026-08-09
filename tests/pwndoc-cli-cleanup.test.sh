#!/bin/bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TEST_TMP=$(mktemp -d)
trap 'rm -rf "$TEST_TMP"' EXIT

cat > "$TEST_TMP/docker" <<'FAKE_DOCKER'
#!/bin/bash
set -u
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"

if [[ " $* " == *" run "* ]]; then
    exit "${FAKE_DOCKER_RUN_EXIT:-0}"
fi

if [[ " $* " == *" down "* ]]; then
    exit "${FAKE_DOCKER_DOWN_EXIT:-0}"
fi

exit 0
FAKE_DOCKER
chmod +x "$TEST_TMP/docker"

run_cli() {
    local log_file=$1
    shift
    : > "$log_file"
    PATH="$TEST_TMP:$PATH" FAKE_DOCKER_LOG="$log_file" "$REPO_ROOT/pwndoc-cli" "$@"
}

assert_cleanup_command() {
    local log_file=$1
    grep -F -- '-f docker-compose.yml -f docker-compose.test.yml -p pwndoc-test --profile languagetools down -v --remove-orphans' "$log_file" >/dev/null
}

for suite in backend frontend-unit; do
    log_file="$TEST_TMP/$suite.log"
    run_cli "$log_file" test "--$suite"
    assert_cleanup_command "$log_file"
done

e2e_log="$TEST_TMP/frontend-e2e.log"
run_cli "$e2e_log" test --frontend-e2e --chromium
assert_cleanup_command "$e2e_log"

failure_log="$TEST_TMP/backend-failure.log"
set +e
PATH="$TEST_TMP:$PATH" \
    FAKE_DOCKER_LOG="$failure_log" \
    FAKE_DOCKER_RUN_EXIT=23 \
    "$REPO_ROOT/pwndoc-cli" test --backend
failure_status=$?
set -e

if [[ $failure_status -ne 23 ]]; then
    echo "Expected backend test exit 23, got $failure_status" >&2
    exit 1
fi
assert_cleanup_command "$failure_log"

echo "pwndoc-cli cleanup regression tests passed"
