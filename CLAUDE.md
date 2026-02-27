# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PwnDoc is a pentest reporting application with a Node.js/Express backend and Vue 3/Quasar frontend. It uses MongoDB for storage, Socket.io for real-time collaboration, and docxtemplater for Word report generation.

## Architecture

**Monorepo layout:**
- `backend/` — Express API server (HTTPS on port 4242), Mongoose ODM, JWT auth
- `frontend/` — Vue 3 SPA with Quasar framework, Pinia stores, Vite build
- `languagetool/` — Spellcheck/grammar Docker service

**Backend structure:** Routes in `backend/src/routes/`, Mongoose models in `backend/src/models/`, auth/report-gen/utilities in `backend/src/lib/`. API prefix is `/api`. ACL roles defined in `backend/src/config/roles.json`.

**Frontend structure:** Pages in `frontend/src/pages/`, API services in `frontend/src/services/`, Pinia stores in `frontend/src/stores/`, Quasar boot files in `frontend/src/boot/` (auth token refresh, axios, socket.io, i18n).

**Auth flow:** JWT + refresh tokens via httpOnly cookies, auto-refresh every 14 min. TOTP 2FA support. Frontend axios interceptor queues requests during token refresh.

**API response format:** `{ status: 'ok', data: {...} }` or `{ status: 'error', message: '...' }`.

**Real-time:** Socket.io rooms keyed by audit ID for multi-user collaboration and presence tracking.

## Development Commands

All operations go through `./pwndoc-cli`. Run `./pwndoc-cli help` for full usage.

### Environments
```bash
./pwndoc-cli up                    # Production (default, pulls pre-built images)
./pwndoc-cli up --dev              # Dev environment (hot-reload, source mounts)
./pwndoc-cli up --prod-local       # Build from local source, production config
./pwndoc-cli down                  # Bring down current environment
./pwndoc-cli logs                  # Follow logs (add --backend-only or --frontend-only)
./pwndoc-cli ps                    # Show container status
```

Ports: Frontend 8443 (nginx), Backend 4242, MongoDB 27017, LanguageTool 8010/8020.

### Testing (via Docker)
```bash
./pwndoc-cli test                              # Run ALL tests (backend + unit + e2e)
./pwndoc-cli test --backend                    # Backend API tests (Jest, ephemeral MongoDB)
./pwndoc-cli test --frontend-unit              # Frontend Vitest unit tests (jsdom, no browser)
./pwndoc-cli test --frontend-e2e               # Frontend Playwright E2E tests (full stack)
./pwndoc-cli test --frontend-e2e --ui          # Playwright UI mode (port 8082)
./pwndoc-cli test --backend --frontend-unit    # Combine flags to run specific suites
./pwndoc-cli test --coverage                   # Coverage mode: backend + frontend-unit
./pwndoc-cli test --backend --coverage         # Backend coverage only
./pwndoc-cli test --frontend-unit --coverage   # Frontend unit coverage only
```

Backend tests spin up an ephemeral MongoDB (dropped before each run). Frontend unit tests run in a lightweight Node container (no browser/backend needed). E2E tests build and start the full stack.
Coverage reports are written to `backend/coverage/` and `frontend/coverage/`.

### Test file structure
- Backend: `backend/tests/index.test.js` (Jest)
- Frontend unit: `frontend/tests/unit/` (Vitest, `*.test.js`)
- Frontend E2E: `frontend/tests/e2e/` (Playwright, `*.spec.js`)

### Direct npm commands (inside containers or local)
```bash
# Backend
npm run dev          # nodemon hot-reload
npm run test:api     # Jest test run

# Frontend
npm run dev          # Quasar dev server with HMR (port 8081)
npm run build        # Production build
npm run test:run     # Vitest single run
npm run test:ui      # Vitest with UI
npm run test:coverage
```

## Key Technical Notes

- Frontend build requires `NODE_OPTIONS=--openssl-legacy-provider` (already set in npm scripts)
- Backend serves HTTPS using certs in `backend/ssl/`; frontend nginx uses certs in `frontend/ssl/`
- Report generation: `backend/src/lib/report-generator.js` uses docxtemplater with a custom image module. Templates in `backend/report-templates/`
- Audit types: `default`, `multi`, `retest`
- CVSS v3 and v4 scoring support
- Frontend uses Vue 3 `<script setup>` syntax with Quasar components
