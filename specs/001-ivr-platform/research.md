# Research: IVR Platform

## Resolved Clarifications

### Testing Strategy
- **Decision**: `pytest` with `pytest-asyncio` for the Python backend; `Jest` and `@testing-library/react` for the React frontend.
- **Rationale**: Standard ecosystem choices for FastAPI and React. Async testing is critical for the FastAGI and asyncpg components.
- **Alternatives considered**: `unittest` (too verbose, poor async fixture support).

### Performance Goals
- **Decision**: Target < 100ms latency for all AGI step resolutions.
- **Rationale**: VoIP applications are highly sensitive to latency. Any delay in AGI responses results in dead air for the caller.
- **Alternatives considered**: N/A, strict requirement.

### TTS Engine
- **Decision**: Integrate Piper TTS (or an equivalent local/API-based TTS) as a fallback mechanism.
- **Rationale**: Ensures the system can degrade gracefully if specific pre-recorded audio prompts are missing in the resolution hierarchy.

### Asterisk Integration
- **Decision**: Use `asterisk-agi` (Python) and build a custom `asyncio` TCP server (FastAGI).
- **Rationale**: Allows non-blocking execution of concurrent calls within a single Python process, aligning with the asynchronous constitution principle.

### Initial Database Migration
- **Decision**: Manually run `alembic revision --autogenerate` and `alembic upgrade head` in the Docker container for the first time.
- **Rationale**: The FastAPI application's `lifespan` doesn't automatically create tables if an Alembic workflow is expected but no initial migration exists. The `audio_assets` table was missing, causing 500 errors.
- **Alternatives considered**: Using `Base.metadata.create_all` in `lifespan`, but Alembic is already configured in the Dockerfile, so generating the initial migration is the standard approach.

### Premium UI Redesign
- **Decision**: Overhaul the ReactFlow builder with Tailwind CSS glassmorphism, Google Fonts (Inter), and custom ReactFlow Nodes.
- **Rationale**: The user indicated the UI was "too basic". A premium aesthetic with dark mode gradients, micro-animations, and modern visual block nodes significantly enhances the perceived value of the application.
- **Alternatives considered**: Generic Material UI (too rigid, less visually stunning out-of-the-box compared to tailored Tailwind).
