# SpacioPixel Docs

This directory contains the implementation planning and technical documentation for the Habbo-like MVP.

## Document Map

- `product-scope.md`: MVP scope, goals, constraints, and success criteria
- `architecture.md`: system architecture and service boundaries
- `technology-decisions.md`: chosen stack and rationale
- `database-schema.md`: PostgreSQL schema plan
- `api-contract.md`: Laravel API surface and auth flow
- `realtime-design.md`: Colyseus room model and realtime rules
- `frontend-architecture.md`: React/PixiJS client structure
- `docker-development.md`: local development topology using Docker
- `implementation-roadmap.md`: phased delivery plan and milestones

## Current Direction

The current plan uses:

- `Laravel` for auth, API, persistence, and product backend concerns
- `Colyseus` for realtime room simulation
- `React + Vite + TypeScript + PixiJS` for the web client
- `PostgreSQL` for durable storage
- `Redis` for cache, queues, and realtime support

## Product Principle

This MVP succeeds if it feels alive, expressive, and shareable. The technical plan is intentionally biased toward:

- reliable room joins
- visible presence
- simple movement
- fast chat
- minimal furniture placement
- persistence without overbuilding
