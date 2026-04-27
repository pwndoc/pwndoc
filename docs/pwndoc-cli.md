# pwndoc-cli

`pwndoc-cli` is the management tool for all PwnDoc operations: starting environments, running tests, viewing logs, and updating the stack.

```
./pwndoc-cli <command> [options]
```

Enable tab completion:

```
source <(./pwndoc-cli completion)
```

## Commands

| Command | Description |
|---|---|
| `up` / `deploy` | Build, (re)create, and start containers |
| `down` / `destroy` | Bring down and remove containers |
| `build` | Build containers without starting |
| `update` | Pull/build latest images and recreate containers |
| `stop` | Stop containers |
| `start` | Start containers |
| `restart` | Restart containers |
| `logs` | Follow container logs |
| `ps` / `status` | Show container status |
| `lt-apikey` | Print the LanguageTool API key |
| `test` | Run tests |
| `help` | Show help |

## Environment Options

The default environment is **prod** (pre-built images). No flag needed.

| Flag | Environment |
|---|---|
| *(none)* | Production (pulls pre-built images) |
| `--prod-local` | Production config, built from local source |
| `--dev` | Development (hot-reload, source mounts) |

## Targeting Options

| Flag | Effect |
|---|---|
| `--backend-only` | Operate only on backend services |
| `--frontend-only` | Operate only on frontend services |
| `--with-lt` | Include the optional LanguageTool service |

## Test Options

| Flag | Description |
|---|---|
| `--backend` | Backend API tests (Jest) |
| `--frontend-unit` | Frontend unit tests (Vitest, no browser) |
| `--frontend-e2e` | E2E tests (Playwright, full stack) |
| `--ui` | Playwright UI mode (implies `--frontend-e2e`) |
| `--coverage` | Collect coverage (backend + frontend-unit) |
| `--chromium` | E2E on Chromium only |
| `--firefox` | E2E on Firefox only |
| `--webkit` | E2E on WebKit only |

Running `./pwndoc-cli test` with no flags runs all suites. Flags are combinable.

## Examples

```bash
# Start environments
./pwndoc-cli up
./pwndoc-cli up --dev
./pwndoc-cli up --with-lt

# Logs and status
./pwndoc-cli logs --backend-only
./pwndoc-cli ps

# Update
./pwndoc-cli update
./pwndoc-cli update --prod-local

# Tests
./pwndoc-cli test
./pwndoc-cli test --backend
./pwndoc-cli test --frontend-e2e --chromium --firefox
./pwndoc-cli test --backend --frontend-unit --coverage

# LanguageTool
./pwndoc-cli lt-apikey
```
