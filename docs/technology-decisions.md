# Technology Decisions

## Chosen Stack

### Frontend

- `React`
- `Vite`
- `TypeScript`
- `PixiJS`
- `TanStack Query`
- `Zustand`

### Backend

- `Laravel`
- `Laravel Sanctum`
- `PostgreSQL`
- `Redis`

### Realtime

- `Node.js`
- `TypeScript`
- `Colyseus`

### Local Development

- `Docker Compose`

## Why Laravel Stays

Laravel remains a good fit for:

- user authentication
- account management
- room metadata APIs
- furniture catalog APIs
- durable persistence
- queues, jobs, and admin workflows later

Laravel is not the right place to run the multiplayer room simulation. That responsibility belongs to Colyseus.

## Why Colyseus Stays

This product behaves more like a lightweight multiplayer game than a standard CRUD application. Colyseus is a good fit because it provides:

- room-based state
- websocket transport
- authoritative server state
- realtime syncing
- presence and room lifecycle handling

## Why Docker Is Included

Docker should be used for local infrastructure and service orchestration so the development environment is repeatable.

Use Docker for:

- `postgres`
- `redis`
- `api`
- `realtime`
- `web`

For early development, the team can still run app processes outside containers if needed, but the documented default should be Docker Compose.

## Technology Principles

1. Keep runtime responsibilities clear
2. Keep the live room server authoritative
3. Use PostgreSQL for all durable product data
4. Use Redis only where it helps latency, queues, and scale
5. Avoid adding infrastructure that the MVP does not need
