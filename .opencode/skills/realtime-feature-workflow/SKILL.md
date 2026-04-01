# Realtime Feature Workflow

Use this skill when implementing or modifying any feature that touches Laravel, Colyseus, and the frontend together.

## Goal

Keep cross-service multiplayer features consistent across API, persistence, realtime behavior, and client rendering.

## Workflow

Follow this order unless there is a strong reason not to:

1. Confirm the user-visible behavior and room rules.
2. Identify durable data requirements in Laravel/PostgreSQL.
3. Define the realtime message flow and validation in Colyseus.
4. Define the client bootstrap path and live rendering updates.
5. Implement server-side validation before client-side polish.
6. Verify that the client never becomes the authority for multiplayer state.

## Responsibility Checklist

### Laravel

Use Laravel for:

- authenticated user identity
- room metadata
- furniture definitions
- persisted room layout
- signed realtime join tokens

### Colyseus

Use Colyseus for:

- join and leave lifecycle
- movement validation
- chat broadcast
- furniture placement and movement validation
- authoritative room state

### Frontend

Use the frontend for:

- UI state
- room rendering
- input collection
- scene transitions
- local animation after authoritative updates

## Validation Rules

For any realtime mutation, verify:

1. user is authenticated and allowed to act
2. target room exists and is joinable
3. payload is valid and bounded
4. action respects room rules
5. persistent writes happen only after a successful authoritative update

## Verification Checklist

After implementation, verify:

1. two clients see the same state
2. invalid actions are rejected cleanly
3. refresh restores durable room state
4. live updates do not require page reloads
