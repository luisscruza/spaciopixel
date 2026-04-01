# Architecture

## System Overview

The system is split into three application layers and two infrastructure services.

### Applications

1. `web`
2. `api`
3. `realtime`

### Infrastructure

1. `postgres`
2. `redis`

## Service Responsibilities

### Web

The web client is responsible for:

- login and account screens
- lobby interface
- room shell UI
- PixiJS rendering
- input handling for movement, chat, and furniture placement
- calling Laravel APIs
- connecting to Colyseus rooms

### API

Laravel is responsible for:

- auth and sessions
- user profile and avatar config
- room creation and room listing
- furniture catalog
- persistent room data
- issuing signed realtime join tokens

### Realtime

Colyseus is responsible for:

- room state
- player joins and leaves
- movement validation
- chat broadcasting
- furniture placement and move validation
- authoritative in-room rules

## Data Ownership

### Laravel / PostgreSQL Owns

- users
- rooms
- furniture definitions
- persisted furniture placements
- optional stored chat history

### Colyseus Owns

- current room occupants
- avatar positions
- active chat bubbles
- in-memory room state during live sessions

## Core Integration Pattern

### Auth and Realtime Join

1. User logs in through Laravel
2. Frontend loads current session via API
3. Frontend requests a short-lived realtime join token
4. Frontend connects to Colyseus using that token
5. Colyseus validates the token before adding the player to the room

### Durable Mutations

Authoritative room actions happen in Colyseus first. Persistent mutations are then written to the database.

Examples:

- movement: realtime only, no database write required
- chat: realtime broadcast, optional database write
- furniture placement: realtime validation, then database write
- furniture move: realtime validation, then database write

## Scaling Shape

### MVP

- one Laravel instance
- one Colyseus instance
- one Postgres database
- one Redis instance

### Early Scale

- multiple Colyseus instances
- Redis-backed presence and coordination
- sticky websocket routing
- managed database and Redis

## Architecture Rules

1. Laravel does not simulate room state
2. Colyseus does not own product auth or account management
3. Persistent room layout is stored in PostgreSQL
4. Room behavior is validated server-side
5. The client is never the source of truth for movement or furniture state
