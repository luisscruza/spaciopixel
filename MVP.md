🚀 MVP Executive Summary

Goal:
Build a web-based isometric social space where users can:

create an avatar
enter a lobby
join rooms
chat
place basic furniture

👉 Think: Habbo stripped to the essentials + modern UX

🧩 Core pillars (only what matters)
1. Users & Identity

What exists:

simple signup (email or magic link)
username + avatar (basic customization)
session auth (cookie or token)

What matters:

username is visible above avatar
avatar is recognizable (even if simple)

👉 This is your identity layer

2. Lobby (entry point)
4

What exists:

1 global lobby room
shows active users
shows list of available rooms

User flow:

user logs in
lands in lobby
sees others + rooms
clicks → joins room

👉 This is your network effect surface

Rooms
4

What exists:

create room (name only)
fixed size grid (e.g. 10x10)
basic floor + walls
max users per room (e.g. 10–20)

Capabilities:

users walk
users join/leave in realtime
room persists (saved in DB)

👉 This is your core product unit

4. Furniture (very simple v1)
4

What exists:

5–10 furniture items only:
chair
table
plant
screen
sofa

Capabilities:

place item on grid
move item
no rotation needed (v1)
no collisions beyond “one tile = one object”

👉 Keep this dead simple

5. Chat (Habbo-style)
4

What exists:

text chat per room
chat bubble above avatar
small message history (last 20–50)

Capabilities:

send message
broadcast to room
basic rate limit

👉 This is your engagement engine

⚙️ Technical architecture (MVP level)
Frontend (web)
React + Vite
PixiJS for:
room rendering
avatars
furniture
chat bubbles
Realtime
Colyseus
handles rooms
syncs:
positions
joins/leaves
chat
furniture placement
Backend
Laravel
users
rooms (metadata)
furniture definitions
persistence
Data
PostgreSQL
Redis (optional for sessions/queues)

🔄 Core flows (what must work)
1. Join flow
login → lobby → click room → join
2. Movement
click tile → avatar moves
server validates position
3. Chat
user sends message
appears:
above avatar
in small log
4. Furniture
user selects item
clicks tile → place
updates for everyone in room



🎯 What makes this MVP successful

Not features. These 3 things:

1. Feels alive
multiple users visible
instant joins
smooth movement
2. Feels expressive
avatars visible
chat bubbles
basic personalization
3. Feels shareable
screenshot looks good
clear scene
recognizable layout

⚡ What NOT to build yet
economy
trading
AI rooms
voice chat
complex UI
large maps
animations beyond basic

👉 All distractions for MVP
