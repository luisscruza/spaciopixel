# MVP Scope Guard

Use this skill when planning or implementing features for the SpacioPixel MVP.

## Goal

Keep the product aligned with the documented Habbo-like MVP and prevent scope creep.

## Core Rules

1. Prioritize presence, chat, movement, and room persistence over secondary systems.
2. Reject or defer inventory, economy, trading, friend systems, moderation panels, voice, and complex animation unless explicitly requested.
3. Prefer the smallest correct implementation that preserves the MVP feel.
4. Keep rooms fixed-size and mechanics tile-based unless existing docs are updated first.
5. Preserve the split of responsibilities:
   - Laravel owns auth, persistence, product APIs
   - Colyseus owns live room state and validation
   - React/PixiJS owns rendering and input

## Before Implementing A Feature

Check the feature against these questions:

1. Does it make the world feel more alive?
2. Does it improve expression or room ownership?
3. Does it directly support a documented MVP flow?
4. Can it be built without introducing a second-order system?

If the answer is mostly no, defer it.

## Preferred Decisions

- owner-only furniture editing for MVP
- simple tile movement without pathfinding
- room chat only
- simple avatar config stored as JSON
- persistence for rooms and furniture before feature expansion

## Output Style

When using this skill, clearly state:

- what is in scope
- what is deliberately deferred
- what minimal implementation is recommended
