# Data Model: IVR Platform

## Entities

### Tenant
- **Fields**: `id` (UUID), `name` (String), `default_language` (String), `created_at` (DateTime)
- **Relationships**: Has many Flows, Calls, and AudioAssets.

### Flow
- **Fields**: 
  - `id` (UUID)
  - `tenant_id` (UUID, FK)
  - `name` (String)
  - `trigger` (String - e.g., 'shortcode', 'did')
  - `trigger_value` (String)
  - `definition` (JSON - stores ReactFlow nodes and edges)
  - `status` (String - 'draft', 'published')
- **Relationships**: Belongs to Tenant, Has many Calls.
- **Validation**: JSON `definition` must pass schema validation for supported step types.

### Call
- **Fields**:
  - `id` (UUID)
  - `tenant_id` (UUID, FK)
  - `call_id` (String - Asterisk Channel ID)
  - `from_number` (String)
  - `to_number` (String)
  - `flow_id` (UUID, FK)
  - `status` (String - 'initiated', 'in_progress', 'completed', 'failed')
  - `session_data` (JSON - finalized state from Redis)
  - `duration_seconds` (Integer)
- **Relationships**: Belongs to Tenant, Belongs to Flow.

### AudioAsset
- **Fields**:
  - `id` (UUID)
  - `tenant_id` (UUID, FK)
  - `flow_id` (UUID, FK, nullable)
  - `step_id` (String, nullable)
  - `type` (String - 'prompt', 'welcome', 'error')
  - `language` (String)
  - `file_path` (String)
- **Relationships**: Belongs to Tenant, optionally belongs to Flow.

## Redis State (Ephemeral)
- **Key**: `session:{call_id}`
- **Value**: JSON containing `tenant_id`, `flow_id`, `variables` (dict), `steps_completed` (list).
- **TTL**: 3600 seconds (1 hour).
