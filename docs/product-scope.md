# Product Scope

## Goal

Build a minimal Habbo-like web application where users can:

- create an account
- choose a username and simple avatar
- enter a global lobby
- browse and create rooms
- join rooms with other users
- walk around a tile-based room
- send room chat with avatar chat bubbles
- place and move simple furniture

## MVP Product Pillars

### 1. Identity

Users need a stable visible identity:

- account
- username
- recognizable avatar

### 2. Presence

The app must feel inhabited:

- users appear in lobby and rooms
- joins and leaves are instant
- movement is visible in realtime

### 3. Expression

Users need lightweight social expression:

- avatar appearance
- usernames over avatars
- chat bubbles

### 4. Ownership

Rooms should feel like persistent spaces:

- room creation
- saved room layout
- simple furniture placement

## MVP Features

### In Scope

- email/password authentication
- user profile with username and avatar config
- one global lobby
- user-created rooms
- fixed-size rooms
- realtime room join/leave
- tile-based movement
- room chat
- recent message history
- place and move furniture
- persistence of rooms and furniture

### Out of Scope

- trading
- economy
- inventory system
- friend system
- moderation tooling beyond basic admin-safe design
- voice chat
- pathfinding
- furniture rotation
- stacked furniture
- large maps
- advanced animation system

## Core User Flows

### Join Flow

1. User signs up or logs in
2. User lands in lobby
3. User sees available rooms and active users
4. User joins a room

### Movement Flow

1. User clicks a tile
2. Client sends target tile to realtime server
3. Server validates tile
4. Server broadcasts authoritative position
5. Clients animate movement

### Chat Flow

1. User submits room message
2. Server rate limits and validates message
3. Message appears in room log
4. Bubble appears above sender avatar

### Furniture Flow

1. Room owner selects furniture item
2. User clicks target tile
3. Server validates placement
4. Placement is broadcast to all clients
5. Layout is persisted

## Success Criteria

The MVP is successful when:

1. Multiple users can be online together
2. Realtime room joins feel immediate
3. Movement feels responsive and understandable
4. Chat is reliable and visible in-scene
5. Furniture placement works consistently
6. A room remains intact after reload or restart
7. The app is simple enough to share and demo
