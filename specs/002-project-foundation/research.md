# Research: Project Foundation

## Resolved Clarifications

### Frontend Framework
- **Decision**: Vite with React and TypeScript.
- **Rationale**: Vite provides extremely fast HMR and optimized builds, ideal for a SPA like the IVR flow builder (which relies heavily on ReactFlow).
- **Alternatives considered**: Next.js (unnecessary server-side rendering complexity for an authenticated dashboard), Create React App (deprecated).

### Database Scaffolding
- **Decision**: SQLAlchemy (Async) with Alembic for migrations.
- **Rationale**: Industry standard for Python async ORMs.
- **Alternatives considered**: Raw `asyncpg` (harder to maintain migrations and schema validation).

### Asterisk Docker Base
- **Decision**: Use `andrius/asterisk` (or similar lightweight Alpine Asterisk image) as the base.
- **Rationale**: Reduces image size and startup time. Allows mounting custom configuration volumes via `docker-compose.yml`.
