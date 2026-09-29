# Docker Test Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every Docker test command removes the profiled LanguageTool container, its volume, and all disposable `pwndoc-test` networks while preserving the test runner's exit code.

**Architecture:** Add one `cleanup_test_environment` function to `pwndoc-cli` and route every test cleanup through it. Exercise the CLI with a fake `docker` executable so cleanup arguments and exit-code behavior are tested without requiring a daemon.

**Tech Stack:** Bash, Docker Compose CLI, existing `pwndoc-cli` test orchestration.

## Global Constraints

- Production and development Compose behavior must not change.
- Cleanup must target only the `pwndoc-test` project.
- Cleanup must include `--profile languagetools down -v --remove-orphans`.
- A failing test command must remain the CLI's final exit status.
- Pre-E2E cleanup failure must stop the E2E suite.
- The regression test must not require an active Docker daemon.

---

## File Structure

- `pwndoc-cli`: owns the shared test-environment cleanup function and test-suite orchestration.
- `tests/pwndoc-cli-cleanup.test.sh`: owns the daemon-free regression harness, fake Docker command, assertions, and temporary-file cleanup.

### Task 1: Add the CLI cleanup regression harness

**Files:**

- Create: `tests/pwndoc-cli-cleanup.test.sh`
- Test: `tests/pwndoc-cli-cleanup.test.sh`

**Interfaces:**

- Consumes: `./pwndoc-cli test --backend`, `--frontend-unit`, and `--frontend-e2e --chromium`.
- Produces: a standalone Bash regression test whose fake `docker` records one argument vector per line and whose exit status is zero only when all assertions pass.

- [ ] **Step 1: Create the failing regression test**

Create `tests/pwndoc-cli-cleanup.test.sh` with this complete structure:

```bash
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
```

- [ ] **Step 2: Run the test to verify the current implementation fails**

Run:

```bash
"C:/Program Files/Git/bin/bash.exe" tests/pwndoc-cli-cleanup.test.sh
```

Expected: non-zero exit at `assert_cleanup_command` because existing cleanup omits `--profile languagetools`.

- [ ] **Step 3: Check shell syntax independently**

Run:

```bash
"C:/Program Files/Git/bin/bash.exe" -n tests/pwndoc-cli-cleanup.test.sh
```

Expected: exit 0 with no output.

- [ ] **Step 4: Commit the red regression test**

```bash
git add tests/pwndoc-cli-cleanup.test.sh
git commit -m "test: cover Docker test environment cleanup"
```

### Task 2: Centralize profile-aware cleanup

**Files:**

- Modify: `pwndoc-cli:208-293`
- Test: `tests/pwndoc-cli-cleanup.test.sh`

**Interfaces:**

- Consumes: existing `dc_cmd` behavior after setting `ENV=test`.
- Produces: `cleanup_test_environment() -> shell exit status`, using the test Compose files, project name, and LanguageTool profile.

- [ ] **Step 1: Add the shared cleanup function before `test_backend`**

Add:

```bash
function cleanup_test_environment {
    ENV=test
    $(dc_cmd) --profile languagetools down -v --remove-orphans
}
```

- [ ] **Step 2: Replace direct post-suite cleanup calls**

In `test_backend`, `test_frontend_unit`, and `test_frontend_e2e`, replace:

```bash
$(dc_cmd) down -v --remove-orphans
```

with:

```bash
cleanup_test_environment
```

Keep `rc=$?` immediately after the test-runner command and `return $rc` after cleanup so test failure remains authoritative.

- [ ] **Step 3: Make pre-E2E cleanup fail fast**

Replace the pre-build E2E cleanup with:

```bash
cleanup_test_environment || return $?
```

Apply the same replacement to `demo_record`, because it starts the same profiled disposable stack.

- [ ] **Step 4: Run the focused regression test**

Run:

```bash
"C:/Program Files/Git/bin/bash.exe" tests/pwndoc-cli-cleanup.test.sh
```

Expected: `pwndoc-cli cleanup regression tests passed` and exit 0.

- [ ] **Step 5: Verify cleanup failure does not hide a test failure**

Extend the failure invocation in `tests/pwndoc-cli-cleanup.test.sh` with:

```bash
FAKE_DOCKER_DOWN_EXIT=41
```

Run the focused test again. Expected: the simulated backend test still returns `23`, proving post-suite cleanup cannot replace the test failure.

- [ ] **Step 6: Check both shell files**

Run:

```bash
"C:/Program Files/Git/bin/bash.exe" -n pwndoc-cli
"C:/Program Files/Git/bin/bash.exe" -n tests/pwndoc-cli-cleanup.test.sh
```

Expected: both commands exit 0 with no output.

- [ ] **Step 7: Run existing Docker suites**

Run sequentially:

```bash
./pwndoc-cli test --backend
./pwndoc-cli test --frontend-unit
./pwndoc-cli test --frontend-e2e --chromium
```

Expected: backend reports 328 passing tests, frontend unit exits 0, and Chromium E2E reports 154 passing tests.

- [ ] **Step 8: Verify the disposable environment is absent**

Run:

```bash
docker ps -a --filter name=pwndoc-test --format '{{.Names}}'
docker network ls --filter name=pwndoc-test --format '{{.Name}}'
docker volume ls --filter name=pwndoc-test --format '{{.Name}}'
```

Expected: all three commands produce no resource names.

- [ ] **Step 9: Commit the implementation**

```bash
git add pwndoc-cli tests/pwndoc-cli-cleanup.test.sh
git commit -m "fix: clean profiled services after Docker tests"
```

- [ ] **Step 10: Review the final branch diff**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
git log --oneline origin/main..HEAD
```

Expected: no whitespace errors; only the intentionally untracked security scan directory remains outside the PR; branch history contains the design, regression test, and implementation commits.
