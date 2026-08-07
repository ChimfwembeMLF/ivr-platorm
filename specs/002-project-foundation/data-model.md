# Data Model: Project Foundation

## Entities

### Base Entity
- **Fields**: `id` (UUID), `created_at` (DateTime), `updated_at` (DateTime)
- **Relationships**: Parent class for all ORM models.

### Tenant
- **Fields**: `id` (UUID), `name` (String)
- **Relationships**: Base entity for isolation.

## Database Migrations
- Initial migration script to set up `alembic_version` table and basic UUID/UTC timestamp utilities.
