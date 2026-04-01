# Realtime Design

## Realtime Role

Colyseus is the authoritative server for live room behavior.

It is responsible for:

- room membership
- avatar positions
- movement validation
- chat broadcasting
- furniture placement and movement validation

## Room Types

### Lobby Room

The lobby is a special room that:

- always exists
- acts as the app entry point after login
- can show active users and available rooms

### User Rooms

User rooms are persistent rooms with:

- fixed size
- defined max users
- saved furniture layout

## Room State Model

Suggested room state includes:

- `roomId`
- `users`
- `furnitures`
- `recentMessages`

### Player State

- `userId`
- `username`
- `avatarConfig`
- `x`
- `y`
- `direction`
- `lastMessage` optional

### Furniture State

- `id`
- `typeId`
- `x`
- `y`

## Client Messages

### `move_to`

Payload:

- `x`
- `y`

Validation:

- room bounds
- tile not occupied by furniture
- tile not otherwise blocked by chosen occupancy rule

### `chat_send`

Payload:

- `message`

Validation:

- trimmed message is not empty
- length limit
- rate limit

### `furniture_place`

Payload:

- `furnitureTypeId`
- `x`
- `y`

Validation:

- sender is permitted to edit room
- furniture type is valid
- target tile is in bounds and empty

### `furniture_move`

Payload:

- `furnitureId`
- `x`
- `y`

Validation:

- sender is permitted to edit room
- furniture exists in room
- target tile is valid and empty

## Server Rules

1. Server is authoritative for room state
2. Client input is treated as a request, not a fact
3. Invalid actions are rejected without mutating state
4. Furniture mutations are persisted after successful room-state update
5. Movement is not persisted to the database

## Realtime Notes

### Movement

For MVP, use tile movement without pathfinding.

Recommended visual behavior:

- server accepts target tile
- clients animate a short tween to that tile

### Chat

For MVP, keep room chat simple:

- room-scoped only
- bubble above avatar for a few seconds
- recent log on screen

### Permission Model

Recommended MVP permission rule:

- room owner can place and move furniture

This keeps room state understandable and avoids collaborative griefing in early versions.
