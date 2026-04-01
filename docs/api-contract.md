# API Contract

## API Role

Laravel provides product APIs, auth, and durable data access. It does not host the realtime room simulation.

## Auth Strategy

Recommended auth strategy for MVP:

- email/password
- Laravel Sanctum session auth
- HTTP-only cookies for browser session management

## Auth Endpoints

### `POST /auth/register`

Creates a new user account.

Payload:

- `email`
- `password`
- `username`

### `POST /auth/login`

Creates a session for an existing user.

Payload:

- `email`
- `password`

### `POST /auth/logout`

Invalidates the current session.

### `GET /me`

Returns the current authenticated user.

### `PATCH /me`

Updates user profile fields.

Payload options:

- `username`
- `avatar_config`

## Room Endpoints

### `GET /rooms`

Returns room list and summary metadata.

Response should include:

- `id`
- `name`
- `max_users`
- `current_user_count` if available
- `is_lobby`

### `POST /rooms`

Creates a new room.

Payload:

- `name`

Server defaults:

- fixed width and height
- default max users

### `GET /rooms/{id}`

Returns room metadata and initial persistent layout data.

### `GET /rooms/{id}/furniture`

Returns room furniture layout.

### `GET /rooms/{id}/messages`

Returns recent chat history if persistence is enabled.

## Furniture Endpoints

### `GET /furniture-types`

Returns active furniture definitions.

## Realtime Join Endpoint

### `POST /realtime/token`

Returns a short-lived signed token for joining a Colyseus room.

Payload:

- `room_id`

Token should encode:

- `user_id`
- `username`
- `avatar_config`
- `room_id`
- expiration

## API Rules

1. Do not expose raw admin-only fields to clients
2. Do not allow direct furniture mutation through standard REST endpoints during live room play
3. Use the realtime server as the action path for movement, chat, and furniture changes
4. Use API endpoints for initial room bootstrap and durable reads
