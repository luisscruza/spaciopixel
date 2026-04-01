# Database Schema

## Database Choice

Use `PostgreSQL` as the primary database.

Reasons:

- strong relational modeling
- reliable constraints for room state rules
- good JSON support for avatar config
- mature tooling with Laravel

## Core Tables

### users

Purpose: account and identity.

Suggested fields:

- `id`
- `email` unique
- `password`
- `username` unique
- `avatar_config` jsonb
- `created_at`
- `updated_at`

### rooms

Purpose: persistent room metadata.

Suggested fields:

- `id`
- `name`
- `slug` nullable
- `owner_user_id` nullable
- `width`
- `height`
- `max_users`
- `is_lobby` boolean default false
- `created_at`
- `updated_at`

Defaults for MVP:

- `width = 10`
- `height = 10`
- `max_users = 12`

### furniture_types

Purpose: furniture catalog definitions.

Suggested fields:

- `id`
- `key` unique
- `name`
- `sprite_key`
- `category`
- `is_active` boolean
- `created_at`
- `updated_at`

### room_furniture

Purpose: current saved room layout.

Suggested fields:

- `id`
- `room_id`
- `furniture_type_id`
- `x`
- `y`
- `placed_by_user_id`
- `created_at`
- `updated_at`

Required constraint:

- unique index on `(room_id, x, y)`

### chat_messages

Purpose: optional recent room history.

Suggested fields:

- `id`
- `room_id`
- `user_id`
- `message`
- `created_at`

Retention policy for MVP:

- keep recent history only if needed operationally
- prune older messages later via job if necessary

## Relationships

- `rooms.owner_user_id -> users.id`
- `room_furniture.room_id -> rooms.id`
- `room_furniture.furniture_type_id -> furniture_types.id`
- `room_furniture.placed_by_user_id -> users.id`
- `chat_messages.room_id -> rooms.id`
- `chat_messages.user_id -> users.id`

## Seed Data

Seed these records before development testing:

### Lobby Room

- one room with `is_lobby = true`
- name: `Lobby`

### Furniture Types

- `chair`
- `table`
- `plant`
- `screen`
- `sofa`

## Schema Notes

1. Keep avatar config in JSON for MVP speed
2. Do not create inventory tables yet
3. Do not model pathfinding or tile graphs yet
4. Do not over-normalize furniture until the product needs it
