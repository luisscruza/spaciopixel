# Docker Development Plan

## Goal

Use Docker Compose to provide a repeatable local environment for all core services.

## Planned Services

### `web`

Runs the React client development server.

### `api`

Runs the Laravel application.

### `realtime`

Runs the Colyseus Node server.

### `postgres`

Primary relational database.

### `redis`

Cache, queue, and realtime support service.

## Planned Local Ports

Suggested defaults:

- `web`: `5173`
- `api`: `8000`
- `realtime`: `2567`
- `postgres`: `5432`
- `redis`: `6379`

## Network Expectations

All services should share a Docker network so application containers can reference each other by service name.

Examples:

- Laravel connects to `postgres`
- Laravel connects to `redis`
- Realtime service connects to `redis`
- Realtime service can call Laravel if needed

## Environment Variables

### API

- `APP_URL`
- `DB_CONNECTION`
- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `SESSION_DRIVER`
- `CACHE_STORE`

### Realtime

- `PORT`
- `APP_URL`
- `API_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `DATABASE_URL` if direct writes are needed
- token verification secrets or public keys

### Web

- `VITE_API_URL`
- `VITE_REALTIME_URL`

## Container Strategy

For MVP, use Docker for consistency, but avoid production-grade container complexity during local development.

Recommended principles:

1. one container per service
2. bind mount source for local iteration
3. named volumes for database persistence
4. avoid adding reverse proxy containers until needed

## Initial Compose Scope

The first Compose file should support:

- booting all services together
- persistent Postgres data
- Redis availability
- clear per-service logs
- local inter-service connectivity

## Development Workflow

1. start compose stack
2. run database migrations and seeds
3. access web client in browser
4. log in and validate lobby and room behavior
