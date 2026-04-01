# Docker Stack Workflow

Use this skill when creating or modifying local infrastructure for SpacioPixel.

## Goal

Keep local development reproducible with Docker Compose while avoiding unnecessary production complexity.

## Required Services

The local stack should support these services unless explicitly changed:

1. `web`
2. `api`
3. `realtime`
4. `postgres`
5. `redis`

## Docker Principles

1. Use one service per container.
2. Use named volumes for database durability.
3. Use bind mounts where fast local iteration matters.
4. Keep service names usable as internal hostnames.
5. Do not add reverse proxies, worker pools, or extra coordination services unless the current milestone needs them.

## Environment Expectations

### Web

- `VITE_API_URL`
- `VITE_REALTIME_URL`

### API

- database connection variables
- redis connection variables
- session and app URL settings

### Realtime

- `PORT`
- `API_URL`
- redis connection variables
- token verification config

## Setup Sequence

When introducing or updating Docker-based development:

1. define service list
2. define network relationships
3. define volumes
4. define env dependencies
5. verify startup order expectations
6. document how to run migrations and seeds

## Verification

Confirm that:

1. all core services boot together
2. Laravel can reach Postgres and Redis
3. Colyseus can start and accept room connections
4. the frontend can call the API and realtime endpoints
