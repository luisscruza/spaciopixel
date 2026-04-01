# Implementation Roadmap

## Delivery Strategy

Build the system in phases that prove the multiplayer core early, while keeping scope narrow.

## Phase 1: Project Foundation

Goals:

- establish repo structure
- create Docker Compose setup
- scaffold Laravel API
- scaffold React frontend
- scaffold Colyseus server
- configure PostgreSQL and Redis

Deliverables:

- runnable local stack
- seeded database
- baseline health checks

## Phase 2: Authentication And Identity

Goals:

- user registration
- login and logout
- current-user endpoint
- username and avatar config support

Deliverables:

- authenticated browser session
- profile bootstrap on app load

## Phase 3: Lobby

Goals:

- seed and expose global lobby
- list rooms
- create room
- show active room counts if available

Deliverables:

- user can log in and land in lobby
- user can create and select rooms

## Phase 4: Realtime Room Join

Goals:

- issue realtime join tokens from Laravel
- connect frontend to Colyseus
- join room successfully
- show other users in room

Deliverables:

- multi-user room presence

## Phase 5: Movement

Goals:

- click-to-move
- server validation
- client-side tweening
- occupied tile enforcement

Deliverables:

- visible authoritative movement

## Phase 6: Chat

Goals:

- room chat input
- room message log
- avatar chat bubbles
- message validation and rate limiting

Deliverables:

- reliable room chat visible to all users

## Phase 7: Furniture

Goals:

- furniture catalog UI
- place furniture
- move furniture
- room-owner edit permissions
- persistence of room layout

Deliverables:

- shared persistent room customization

## Phase 8: Stability And Polish

Goals:

- reconnect behavior
- error handling
- loading states
- visual cleanup
- screenshot-friendly layout polish

Deliverables:

- demo-ready MVP

## Testing Priorities

At minimum, validate:

1. auth flow
2. room creation flow
3. realtime room join
4. multi-user movement visibility
5. chat broadcast behavior
6. furniture placement persistence

## Exit Criteria

Implementation should not move beyond MVP scope until the following are stable:

1. two users can coexist in the same room
2. room interactions are authoritative and consistent
3. persisted rooms survive restart and reload
4. core loop is simple and dependable
