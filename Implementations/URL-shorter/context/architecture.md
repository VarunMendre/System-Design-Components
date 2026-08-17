# URL Shortener Architecture

## Purpose
This document captures the current high-level architecture for the URL shortener system. It is intended to stay aligned with the project requirements and evolve as we move into implementation.

## Design Goals
- Fast redirect performance
- Production-grade correctness
- Simple initial implementation
- Clear path to scale later
- Strong ownership and access control

## High-Level Architecture
- **API layer**: REST endpoints for authenticated link management, public redirects, and admin operations.
- **Application layer**: A monolith with internal modules for now.
- **Cache layer**: Redis for fast short-code lookup.
- **Database layer**: PostgreSQL as the source of truth.

## Runtime Flow
1. A user creates or updates a link through the authenticated API.
2. The application validates the request and writes the link data to PostgreSQL.
3. The application updates Redis with the short-code to destination URL mapping.
4. A redirect request first checks Redis.
5. If Redis misses, the application falls back to PostgreSQL.
6. The application repopulates Redis after a database hit.

## Key Architectural Decisions
- Start as a monolith with modules.
- Keep Redis in the redirect path.
- Use graceful fallback to the database on cache misses.
- Separate services later only when scale or team structure requires it.
- Use a public redirect endpoint and authenticated management endpoints.

## Why This Shape
- The redirect path is read-heavy, so Redis reduces latency and database load.
- A monolith keeps early development and reasoning simpler.
- PostgreSQL gives us strong consistency, constraints, and ownership modeling.
- Fallback to the database preserves availability when Redis is cold or partially unavailable.

## Scale Considerations
- At small scale, this design is easy to operate.
- At medium scale, Redis absorbs most redirect traffic.
- At large scale, the database still acts as the source of truth, while Redis handles hot paths.
- At very large scale, this design can evolve into separated services, replicas, and additional abuse controls.

## Open Questions For Later
- Redis eviction strategy
- Cache TTL policy
- Abuse detection and moderation workflow
- Read replica strategy
- Horizontal scaling plan for the application layer

## Implementation Milestones
- Milestone 1: project scaffolding and folder structure.

## Initial Folder Tree
```text
src/
  modules/
    auth/
      controllers/
      services/
      routes/
      validators/
      tests/
    users/
      controllers/
      services/
      routes/
      validators/
      tests/
    links/
      controllers/
      services/
      routes/
      validators/
      tests/
    health/
      routes/
  services/
  utils/
  middleware/
  config/
  constants/
  db/
    migrations/
    seeds/
  app.ts
  server.ts
```

## Folder Responsibilities
- `modules/auth`: sign-in, token/session handling, authorization helpers, and auth-specific validation.
- `modules/users`: user profile, ownership, user lookup, and account-level behavior.
- `modules/links`: link creation, redirect handling, link updates, access control, and link lifecycle logic.
- `modules/health`: health checks and readiness/liveness endpoints.
- `services/`: shared application services used across multiple modules, such as cache, database, email, or rate-limit helpers.
- `utils/`: pure helper functions that should not depend on business state.
- `middleware/`: request-level concerns like authentication, authorization, error handling, and logging hooks.
- `config/`: environment loading, runtime settings, and infrastructure configuration.
- `constants/`: shared enums, status values, and reusable fixed values.
- `db/`: database client setup, migrations, and seed data.
- `app.ts`: application wiring and module composition.
- `server.ts`: process bootstrap and startup.

## TypeScript Scaffold Files
```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
      auth.validator.ts
    users/
      users.controller.ts
      users.service.ts
      users.routes.ts
      users.validator.ts
    links/
      links.controller.ts
      links.service.ts
      links.routes.ts
      links.validator.ts
    health/
      health.routes.ts
  services/
    cache.service.ts
    db.service.ts
  utils/
    logger.ts
    asyncHandler.ts
  middleware/
    auth.middleware.ts
    error.middleware.ts
  config/
    env.ts
    db.ts
    redis.ts
  constants/
    httpStatus.ts
    errors.ts
  db/
    migrations/
    seeds/
  app.ts
  server.ts
```

## Scaffold Plan
- Create the root TypeScript entry points.
- Add module-specific controllers, services, routes, and validators.
- Add shared services for cache and database access.
- Add middleware for auth and error handling.
- Add config files for env, database, and Redis.
- Add shared constants and basic utilities.
- Keep the first scaffold minimal and production-oriented.

## Package Scripts and Config
- Use `npm` as the package manager.
- Use `tsc` for build and type-checking.
- Use `tsx` for development runtime.
- Include scripts for `dev`, `build`, `start`, `typecheck`, and `lint`.
- Keep the initial config focused on TypeScript, ESLint, and environment loading.
- Use ESM-only modules throughout the codebase.
- Root config files should include `package.json`, `tsconfig.json`, `.env.example`, and `eslint.config.js`.

## Suggested Script Responsibilities
- `dev`: run the app in development mode with `tsx`.
- `build`: compile TypeScript for production.
- `start`: run the compiled production output.
- `typecheck`: run TypeScript without emitting files.
- `lint`: run code quality checks.

## Config Shape
- `tsconfig.json` should define the TypeScript compiler behavior.
- `eslint` config should enforce consistency and catch obvious mistakes.
- `.env` should store runtime secrets and connection details.
- `config/env.ts` should read and validate environment variables.
- `config/db.ts` should initialize PostgreSQL access.
- `config/redis.ts` should initialize Redis access.

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

## Notes
- This architecture is intentionally simple first.
- The design should be revisited after implementation milestones and load assumptions are validated.
- The codebase should be TypeScript-based.
