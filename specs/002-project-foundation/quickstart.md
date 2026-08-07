# Quickstart: Project Foundation

## Setup

1. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```
2. **Verify Containers**
   ```bash
   docker ps
   # Should list asterisk, postgres, and redis containers
   ```
3. **Start Backend Scaffolding**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn asyncpg redis asterisk-agi sqlalchemy alembic
   uvicorn src.main:app --reload
   ```
4. **Start Frontend Scaffolding**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Validation
- Navigate to `http://localhost:8000/docs` to verify FastAPI is running.
- Navigate to `http://localhost:5173` to verify the Vite React shell is running.
- Execute `docker exec -it <asterisk_container> asterisk -rx "core show uptime"` to verify the PBX is alive.
