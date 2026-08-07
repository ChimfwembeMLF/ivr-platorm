---
description: "Task list template for feature implementation"
---

# Tasks: IVR Platform

**Input**: Design documents from `/specs/001-ivr-platform/`

**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `backend/src/`, `frontend/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure per implementation plan (`backend/`, `frontend/`, `asterisk/`)
- [x] T002 Initialize Python FastAPI project with dependencies in `backend/`
- [x] T003 Initialize React/Vite project in `frontend/`
- [x] T004 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T005 Setup database schema and migrations framework (Alembic)
- [x] T006 [P] Configure Asterisk SIP & AGI configuration in `asterisk/etc/asterisk/`
- [x] T007 [P] Implement Redis connection client in `backend/core/redis_client.py`
- [x] T008 [P] Implement PostgreSQL connection in `backend/core/database.py`
- [x] T009 Create base models (`Tenant`, `Flow`, `Call`, `AudioAsset`) in `backend/models/`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AGI Engine & Telephony (Priority: P1) 🎯 MVP

**Goal**: Establish the FastAGI server and handle inbound calls executing basic dialplan commands.

**Independent Test**: Simulate SIP call; verify FastAGI server receives the channel and can answer.

### Implementation for User Story 1

- [x] T010 [P] [US1] Implement AGI Server logic in `backend/agi/server.py`
- [x] T011 [US1] Implement Call Session Manager in `backend/agi/session_manager.py`
- [x] T012 [US1] Implement Asterisk AMI/AGI Helper in `backend/services/asterisk_manager.py`
- [x] T013 [US1] Integrate basic Flow Engine executor in `backend/agi/flow_engine.py` (Answer, Hangup)

**Checkpoint**: At this point, the backend can receive and hang up calls.

---

## Phase 4: User Story 2 - Backend REST API (Priority: P1)

**Goal**: Expose flows, calls, and audio assets via REST APIs.

**Independent Test**: Use Postman/curl to CRUD flows and tenants.

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement Flow routes in `backend/api/routes/flows.py`
- [x] T015 [P] [US2] Implement Call history routes in `backend/api/routes/calls.py`
- [x] T016 [P] [US2] Implement Tenant routes in `backend/api/routes/tenants.py`
- [x] T017 [US2] Add WebSocket handler for real-time call tracking in `backend/main.py`

**Checkpoint**: APIs are fully operational for frontend consumption.

---

## Phase 5: User Story 3 - Visual Flow Builder UI (Priority: P2)

**Goal**: ReactFlow interface for constructing IVR logic visually.

**Independent Test**: Open browser, construct flow, save to backend API.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Create `FlowBuilder` component using ReactFlow in `frontend/src/components/FlowBuilder/FlowBuilder.tsx`
- [ ] T019 [US3] Create Flow Node palettes (Play Audio, DTMF, Hangup) in `frontend/src/components/FlowBuilder/StepPalette.tsx`
- [ ] T020 [US3] Create properties sidebar for node configuration in `frontend/src/components/FlowBuilder/StepProperties.tsx`
- [ ] T021 [US3] Integrate flow saving via REST API in frontend `services/api.ts`

**Checkpoint**: Flow builder successfully generates and saves JSON schema to the database.

---

## Phase 6: User Story 4 - Audio Resolution Strategy (Priority: P2)

**Goal**: Implement the robust audio fallback hierarchy (Step -> Flow -> Tenant -> System -> TTS).

**Independent Test**: Upload an audio file, trigger a flow, and verify Asterisk plays it.

### Implementation for User Story 4

- [ ] T022 [P] [US4] Implement Audio API routes for uploads in `backend/api/routes/audio.py`
- [ ] T023 [US4] Implement `AudioService` fallback logic in `backend/services/audio_service.py`
- [ ] T024 [US4] Integrate audio resolution into `play_audio` step in `backend/agi/flow_engine.py`
- [ ] T025 [P] [US4] Create Audio Manager UI in `frontend/src/components/AudioManager/`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T026 [P] Expand unit tests for `backend/agi/flow_engine.py`
- [ ] T027 Code cleanup and refactoring
- [ ] T028 Update quickstart documentation
- [ ] T029 Configure Docker-compose network links securely
