# Frontend Architecture

## Frontend Role

The frontend is a React application that combines standard UI with a PixiJS-rendered room scene.

## Main Responsibilities

- authentication views
- lobby UI
- room UI shell
- realtime connection lifecycle
- PixiJS room rendering
- movement, chat, and furniture input handling

## Suggested App Sections

### Pages

- `LoginPage`
- `RegisterPage`
- `LobbyPage`
- `RoomPage`

### UI Areas

- auth forms
- room list panel
- room metadata panel
- chat panel
- furniture palette
- canvas container

## Rendering Layers

Recommended render order in PixiJS:

1. floor grid
2. walls and static room background
3. furniture
4. avatars
5. username labels
6. chat bubbles
7. placement highlight

## Client State Boundaries

### Server State

Use API fetching for:

- current user
- room metadata
- furniture catalog
- room history bootstrap

### Local UI State

Use lightweight client state for:

- selected furniture item
- active room UI mode
- chat input draft
- connection status

### Realtime State

Use Colyseus room state as the source for:

- visible users
- avatar positions
- live furniture state
- recent live messages

## Frontend Rules

1. Do not duplicate authoritative room logic on the client
2. Keep the Pixi scene focused on rendering and interaction
3. Keep application UI outside the canvas where possible
4. Support desktop first, but avoid layouts that break on smaller widths

## MVP UX Notes

To feel like Habbo, prioritize:

- readable names
- clear chat bubbles
- fast room join transitions
- clean room composition for screenshots
- simple controls that are obvious immediately
