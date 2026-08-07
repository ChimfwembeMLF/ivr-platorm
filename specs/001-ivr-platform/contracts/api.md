# API Contracts

## REST Endpoints (Base: `/api/v1`)

### Flows
- `GET /flows`: List flows for the current tenant.
- `GET /flows/{flow_id}`: Retrieve full JSON definition of a flow.
- `POST /flows`: Create a new flow definition.
- `PUT /flows/{flow_id}`: Update flow definition.

### Calls
- `GET /calls`: List past and active calls with status filters.
- `GET /calls/{call_id}`: Get CDR and variable state for a specific call.

### Audio
- `GET /audio`: List audio assets.
- `POST /audio`: Upload a new audio asset (form-data).

## WebSocket (Realtime Updates)
- `ws://host/ws/calls`: Emits JSON events for active call states (`call.initiated`, `call.step_completed`, `call.ended`).
