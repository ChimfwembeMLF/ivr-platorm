# Implementation Plan: IVR Platform

**Branch**: `001-ivr-platform` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ivr-platform/spec.md`

## Summary

Build a production-ready multi-tenant IVR platform with a React-based visual flow builder, a FastAPI REST/WebSocket backend, and an Asterisk FastAGI execution engine. The platform relies on Redis for real-time state management to ensure stateless AGI handlers and high scalability.

**Additions**: 
- **Database Fix**: Alembic migrations must be fully initialized and executed within the Docker container to ensure tables like `audio_assets` are created, fixing 500 API errors.
- **UI Overhaul**: The ReactFlow builder interface must be upgraded from basic styling to a premium, state-of-the-art aesthetic featuring glassmorphism, dynamic micro-animations, neon accents, and custom visual ReactFlow nodes for IVR steps.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript/React (Frontend)

**Primary Dependencies**: FastAPI, ReactFlow, asyncpg, redis-py, asterisk-agi

**Storage**: PostgreSQL (Persistent data, CDRs, Tenant configs), Redis (Call sessions, Flow state)

**Testing**: pytest (Backend), Jest/React Testing Library (Frontend)

**Target Platform**: Linux server / Docker (Asterisk + Services)

**Project Type**: Web application + Telephony integration (AGI Server)

**Performance Goals**: <100ms latency for AGI response resolution to ensure seamless caller experience.

**Constraints**: All state MUST be externalized to Redis; no local memory state for active calls.

**Scale/Scope**: Multi-tenant architecture capable of supporting concurrent flows isolated per tenant.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **API-First & Asynchronous**: Are all I/O operations and database queries designed to be asynchronous? (Yes, using FastAPI, asyncpg, and asyncio FastAGI server).
- [x] **Stateless Handlers**: Is all call/session state explicitly stored in Redis rather than local memory? (Yes, explicitly mandated).
- [x] **Multi-Tenant Isolation**: Do all new data models and queries include `tenant_id` filtering? (Yes).
- [x] **Visual Flow Driven**: Are IVR steps implemented both in ReactFlow (frontend) and AGI Flow Engine (backend)? (Yes, defined via standardized step schemas).
- [x] **Audio Resolution Strategy**: Is the standard audio fallback hierarchy utilized for all new prompts? (Yes).

## Project Structure

### Documentation (this feature)

```text
specs/001-ivr-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── api/
│   ├── routes/
│   └── dependencies.py
├── core/
├── agi/
│   ├── server.py
│   ├── flow_engine.py
│   └── session_manager.py
├── models/
├── services/
└── main.py

frontend/
├── src/
│   ├── components/
│   │   ├── FlowBuilder/
│   │   ├── AudioManager/
│   │   └── Dashboard/
│   ├── pages/
│   ├── services/
│   └── store/
└── package.json

asterisk/
├── Dockerfile
└── etc/asterisk/
```

**Structure Decision**: Option 2 (Web application with Telephony Engine). Frontend and Backend are decoupled, with Asterisk configured via Docker for easy deployment and testing alongside the FastAGI python server.

## Complexity Tracking

N/A - All constitution checks pass without violations.
