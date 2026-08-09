# Docker Test Cleanup Design

## Problem

The Docker test commands start the `pwndoc-languagetools` service through the
optional `languagetools` Compose profile. Their cleanup commands omit that
profile. Docker Compose therefore leaves the LanguageTool container, its volume,
and the backend test network running after otherwise successful test runs.

The leak is reproducible with backend and E2E tests. A later test run can fail to
remove or recreate the test network because the leftover container still uses
it.

## Scope

This contribution will:

- centralize cleanup of the disposable `pwndoc-test` Compose environment;
- include the `languagetools` profile whenever test resources are removed;
- use the shared cleanup path before and after applicable test suites;
- preserve each test command's exit status;
- add an automated regression test for the CLI behavior.

It will not change production or development environments, LanguageTool runtime
configuration, application source code, or Docker image contents.

## Design

Add a `cleanup_test_environment` shell function to `pwndoc-cli`. The function
will invoke the test Compose configuration with the `languagetools` profile and
run:

```text
down -v --remove-orphans
```

All test cleanup call sites will use this helper instead of invoking `down`
directly. E2E setup will also use the helper before building its stack so a
previous interrupted run cannot contaminate the next run.

Each suite will capture its test-runner exit code before cleanup and return the
captured value afterward. Cleanup output or success must not turn a failing test
run into a passing one.

## Regression Test

Add a shell-level CLI test that places a fake `docker` executable earlier in
`PATH`. The fake records Compose arguments and returns controlled exit codes,
allowing the test to run without starting containers.

The regression test will verify:

1. cleanup targets the `pwndoc-test` Compose project;
2. cleanup includes `--profile languagetools`;
3. cleanup invokes `down -v --remove-orphans`;
4. the backend, frontend-unit, and E2E paths use the shared cleanup behavior;
5. a simulated test-runner failure remains the CLI's final exit status.

The test will use a temporary directory for command recordings and will remove
it on exit. It will not depend on an active Docker daemon.

## Error Handling

The test result remains authoritative. Cleanup is best-effort after a suite: a
test failure must remain a failure, and a cleanup failure must be visible in
command output. For pre-suite cleanup, failure stops the suite because a stale
environment makes results unreliable.

## Acceptance Criteria

- Backend and E2E test commands leave no profiled LanguageTool container,
  LanguageTool test volume, or `pwndoc-test` network behind.
- Existing test command flags and normal output remain compatible.
- The regression test fails against the current implementation and passes with
  the shared cleanup helper.
- Existing backend, frontend unit, and Chromium E2E suites continue to pass.

