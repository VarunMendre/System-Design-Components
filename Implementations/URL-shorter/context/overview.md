# URL Shortener Project Overview

## Goal
Build a production-grade URL shortener as a backend engineering learning project, with the design and implementation treated like a real system that should scale.

## Current Phase
Phase 1: Requirements Gathering

## Functional Requirements
- Users must sign in before creating or managing short links.
- Short URLs are permanent by default.
- Custom aliases are allowed when needed.
- Analytics are not required for the initial design.
- Access control is required for short links.
- QR code generation is not required.
- Bulk creation is not required at this stage.

## Non-Functional Requirements
- Availability target: 99.99%.
- Abuse, spam, and malicious link handling must be supported.
- This is primarily for learning, but the design should still be production-grade and able to scale.
- No compliance or audit requirements for now.
- Redirect performance is a top priority.

## Architecture Assumptions
- System is for authenticated users only.
- Fast redirect latency matters more than rich analytics.
- Short links should remain globally unique forever.
- The system should generate the short code.
- Read traffic and redirect performance are the main optimization target.

## Decisions To Carry Forward
- We will optimize for fast redirection first.
- We will keep the initial design simple, but discuss scale bottlenecks explicitly.
- Abuse prevention will be addressed during implementation planning.
- Initial architecture approach: simplicity first, then production hardening in later iterations.
- Initial service layout: single backend service with cache and database.
- Cache scope: short code to destination URL only.
- Cache miss strategy: read from database, then populate cache.
- Short codes should use variable length.
- Deleted or expired short links are never reused.
- Database choice: PostgreSQL.
- Links table: keep a main links table.
- Deletion model: prefer soft delete.
- Sharing model: keep a separate sharing table for selected-user access.
- Click storage: no click table for now.
- Short code uniqueness: globally unique.
- Relationship model: one user can own many links.

## Draft Links Table Fields
- `id`
- `user_id`
- `original_url`
- `short_code`
- `created_at`
- `updated_at`
- `deleted_at`
- `expires_at`
- `is_active`
- `is_custom_alias`
- `access_mode`

## Access Control Decisions
- `access_mode` should be an enum.
- Shared access should use a join table.
- Group sharing is out of scope for now.

## API Direction
- API style: REST with a public redirect endpoint and admin endpoints.
- Redirect endpoint: `GET /api/redirect/{shortCode}`.
- Create-link endpoint: `POST /api/users/{userId}/links`.
- Manage-link endpoints should use `/api/links` as the primary resource path.

## Link Operations
- Create links.
- List links.
- Get a link by id.
- Update the original URL.
- Delete links.
- Change access mode.
- Change expiry.
- Partial updates should use `PATCH /api/links/{id}`.
- User flow should use soft delete; admin flow may use hard delete.

## Validation Notes
- Include request and response validation in the API contract.
- Validate URL format, access mode, and expiry values.
- Keep validation rules high-level for now and refine them during implementation.

## Architecture Anchors
- Deployment model: monolith with modules for now, service-separated later.
- Cache strategy: Redis.
- Failure strategy: graceful fallback to the database.

## Initial Folder Structure Direction
- Use a hybrid structure.
- Keep feature-first modules internally.
- Add shared technical folders such as `utils`, `services`, and other cross-cutting helpers.
- Shared technical folders should include `utils`, `services`, `middleware`, `config`, and `constants`.
- Initial modules should include `auth`, `users`, `links`, and `health`.
- The codebase should use TypeScript.

## Tooling Choice
- Use `npm + tsc + tsx` for development.
- Initial package scripts should include `dev`, `build`, `start`, `typecheck`, and `lint`.
- The codebase should use ESM-only modules.
- Root config files should include `package.json`, `tsconfig.json`, `.env.example`, and `eslint.config.js`.

## Environment Variables
- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `APP_BASE_URL`

## Finalized Setup Decisions
- Authentication should store session info in Redis.
- ORM/database access should use Prisma.
- Validation should use Zod with TypeScript.
- Error handling should use a mixed approach with a shared `asyncHandler` helper.
- Logging and rate limiting are deferred for now.

## Capacity Assumptions
- Expected scale: large production scale.
- User count: unknown, but the system should be designed to handle a large number of users.
- Link creation rate: about 5 to 10 links per user per month.
- Redirect clicks per link: medium, roughly 100 to 1,000 clicks per month.
- Traffic pattern: moderate spikes at certain hours.

## Capacity Questions Still Open
- Whether link creation is evenly distributed or concentrated among power users.

## Open Questions For Later Phases
- Exact traffic and storage estimates.
- How to enforce access control on redirects.
- How to handle expired or blocked links, if those are introduced later.
- Whether custom aliases need conflict resolution rules.
- What datastore and caching strategy best fits the redirect-heavy workload.

## Notes
- This file should be updated as requirements evolve.
- A separate `architecture.md` can be introduced later once the architecture decisions are locked.
