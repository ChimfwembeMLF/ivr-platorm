# Quickstart: IVR Platform Validation

## Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm
- Python 3.11+ with `uv` or `pip`

## Setup

1. **Start Infrastructure (Postgres, Redis, Asterisk)**
   ```bash
   docker-compose up -d
   ```

2. **Start Backend (FastAPI & FastAGI)**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
   *(Note: The FastAGI server runs concurrently via the FastAPI lifespan hook on port 4573)*

3. **Start Frontend (React Builder)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Validation Scenarios

1. **Flow Creation**: Navigate to `http://localhost:3000`, open the Flow Builder, drag a "Play Audio" node and a "Hangup" node, connect them, and save. Verify the flow appears via `GET /api/flows`.
2. **Call Simulation**: Using a SIP softphone (e.g., Zoiper, MicroSIP) registered to the local Asterisk (localhost:5060), dial the trigger associated with the saved flow.
3. **Execution Verification**: Verify that the audio prompt plays, the call hangs up, and the CDR appears in the Call History dashboard.
