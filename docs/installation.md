# Installation

> PwnDoc uses 3 containers: the backend, the frontend and the database. All operations go through the `./pwndoc-cli` management tool.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Git

## Setup

```bash
git clone https://github.com/pwndoc/pwndoc
cd pwndoc
```

## Production

!> For production usage make sure to change the SSL certificates in `backend/ssl/` and `frontend/ssl/`, and optionally set the JWT secrets in `backend/src/config/config.json` (`jwtSecret` and `jwtRefreshSecret`) if you don't want random ones generated.

Start containers (pulls pre-built images)

```
./pwndoc-cli up
```

Application is accessible at https://localhost:8443  
API is accessible at https://localhost:8443/api

## Development

> Source code can be modified live. The application reloads automatically on changes.

```
./pwndoc-cli up --dev
```

Application is accessible at https://localhost:8081  
API is accessible at https://localhost:8081/api

## Build from Local Source

To run with production config but built from local source:

```
./pwndoc-cli up --prod-local
```

## Common Operations

Follow logs

```
./pwndoc-cli logs
./pwndoc-cli logs --backend-only
./pwndoc-cli logs --frontend-only
```

Container status

```
./pwndoc-cli ps
```

Stop / start / restart

```
./pwndoc-cli stop
./pwndoc-cli start
./pwndoc-cli restart
```

Remove containers

```
./pwndoc-cli down
```

Update

```
./pwndoc-cli update
```

## LanguageTool (Spellcheck)

LanguageTool is an optional spellcheck service. Start it alongside the main stack:

```
./pwndoc-cli up --with-lt
```

Retrieve the API key once running:

```
./pwndoc-cli lt-apikey
```

Per-user spellcheck configuration is available in the application Settings page.

## Tests

Run all test suites

```
./pwndoc-cli test
```

Run specific suites

```
./pwndoc-cli test --backend         # Backend API tests (Jest)
./pwndoc-cli test --frontend-unit   # Frontend unit tests (Vitest)
./pwndoc-cli test --frontend-e2e    # E2E tests (Playwright, full stack)
```

See [pwndoc-cli](pwndoc-cli.md) for the full list of test options.

## Backup

It is recommended to regularly back up the `backend/mongo-data` folder. It contains the entire database.

To restore:
- Stop containers
- Replace `backend/mongo-data` with the backed-up folder
- Start containers
