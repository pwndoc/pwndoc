# Installation

> PwnDoc uses 4 containers: backend, frontend, database, and optionally LanguageTool for spellcheck.

All operations are done through the `./pwndoc-cli` wrapper script. It handles environment selection, Docker Compose orchestration, and testing.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git (for dev and prod-local environments)

## Quick Start

### Production (recommended)

Pulls pre-built images and starts all containers:

```
./pwndoc-cli up
```

Application is accessible at **https://localhost:8443**
API is accessible at **https://localhost:8443/api**

### Development

Mounts local source and enables hot-reload:

```
./pwndoc-cli up --dev
```

Application is accessible at **https://localhost:8081**
API is accessible at **https://localhost:8081/api**

### Prod-local

Builds images from local source with production configuration:

```
./pwndoc-cli up --prod-local
```

## Common Operations

| Command | Description |
|---------|-------------|
| `./pwndoc-cli up` | Build and start containers |
| `./pwndoc-cli down` | Stop and remove containers |
| `./pwndoc-cli stop` | Stop containers (keep data) |
| `./pwndoc-cli start` | Start stopped containers |
| `./pwndoc-cli restart` | Restart containers |
| `./pwndoc-cli logs` | Follow container logs |
| `./pwndoc-cli ps` | Show container status |
| `./pwndoc-cli update` | Update to latest version |
| `./pwndoc-cli build` | Build images without starting |

Add `--backend-only` or `--frontend-only` to target specific services:

```
./pwndoc-cli logs --backend-only
./pwndoc-cli restart --dev --backend-only
```

## LanguageTool (spellcheck)

Start PwnDoc with the optional LanguageTool container:

```
./pwndoc-cli up --with-lt
```

Once running, retrieve the generated API key:

```
./pwndoc-cli lt-apikey
```

Enter this key in **Settings → Spellcheck** along with the LanguageTool URL (`http://languagetools:8010/v2`).

> When bringing containers down, `./pwndoc-cli down` always removes the LanguageTool container even if `--with-lt` wasn't passed.

## Update

```
./pwndoc-cli update
```

- **prod**: pulls the latest pre-built images, then recreates changed containers
- **dev / prod-local**: runs `git pull`, rebuilds images, then recreates containers

The command verifies all containers are running after update and reports any failures.

```
./pwndoc-cli update --dev
./pwndoc-cli update --prod-local
```

## Security

!> For production usage, replace the self-signed certificates in `backend/ssl/` with your own. You can also set custom JWT secrets in `backend/src/config/config.json` (`jwtSecret` and `jwtRefreshSecret`); if left empty, random secrets are generated on each start.

## Testing

> **Warning:** Tests use an ephemeral database that is wiped before each run. Never run tests against a production instance.

Run all test suites:

```
./pwndoc-cli test
```

Run specific suites:

```
./pwndoc-cli test --backend              # Backend API tests (Jest + ephemeral MongoDB)
./pwndoc-cli test --frontend-unit        # Frontend unit tests (Vitest, no browser needed)
./pwndoc-cli test --frontend-e2e         # E2E tests (Playwright, full stack)
```

Flags are combinable:

```
./pwndoc-cli test --backend --frontend-unit
```

### Coverage

```
./pwndoc-cli test --coverage                      # Backend + frontend-unit coverage
./pwndoc-cli test --backend --coverage            # Backend only
./pwndoc-cli test --frontend-unit --coverage      # Frontend unit only
```

Coverage reports are written to `backend/coverage/` and `frontend/coverage/unit/`.

> Coverage is not supported with `--frontend-e2e`.

### Playwright options

```
./pwndoc-cli test --frontend-e2e --ui             # Playwright UI mode (port 8082)
./pwndoc-cli test --frontend-e2e --chromium       # Chromium only
./pwndoc-cli test --frontend-e2e --firefox        # Firefox only
./pwndoc-cli test --frontend-e2e --webkit         # WebKit only
./pwndoc-cli test --frontend-e2e --chromium --firefox   # Multiple browsers
```

## Tab Completion

Enable bash tab completion for `./pwndoc-cli`:

```
source <(./pwndoc-cli completion)
```

Add this line to your `~/.bashrc` or `~/.zshrc` to make it permanent.

## Backup

The recommended way to create and manage backups is through the in-app **[Settings → Backups](settings.md#backups)** page, which supports encrypted backups, selective restore, and more.

As a lower-level fallback, you can back up the raw MongoDB data folder:

```
# Stop containers first
./pwndoc-cli stop

# Back up the database folder
cp -r backend/mongo-data /your/backup/location/

# Restart
./pwndoc-cli start
```

To restore from a folder backup: stop containers, replace `backend/mongo-data` with the backup, and start again.

---

## Manual Docker Compose

For users who prefer to run Docker Compose commands directly, here are the equivalents of what `pwndoc-cli` wraps:

**Production:**
```
docker compose -f docker-compose.yml -f docker-compose.prod.yml -p pwndoc up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml -p pwndoc down
docker compose -f docker-compose.yml -f docker-compose.prod.yml -p pwndoc logs -f
```

**Development:**
```
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p pwndoc-dev up -d --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p pwndoc-dev down
docker compose -f docker-compose.yml -f docker-compose.dev.yml -p pwndoc-dev logs -f
```

**With LanguageTool (add to any command):**
```
--profile languagetools
```
