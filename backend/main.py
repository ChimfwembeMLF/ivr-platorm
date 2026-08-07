import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.config import settings
from agi.server import AGIServer
from api.routes import flows, calls, tenants

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

agi_server_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up IVR Platform Backend...")
    global agi_server_task
    server = AGIServer(host=settings.AGI_HOST, port=settings.AGI_PORT)
    agi_server_task = asyncio.create_task(server.start())
    
    yield
    
    # Shutdown
    logger.info("Shutting down IVR Platform Backend...")
    if agi_server_task:
        agi_server_task.cancel()
        try:
            await agi_server_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenants.router, prefix="/api/v1")
app.include_router(flows.router, prefix="/api/v1")
app.include_router(calls.router, prefix="/api/v1")

@app.websocket("/ws/calls")
async def calls_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Placeholder: In the future we will use Redis Pub/Sub to push events here
            data = await websocket.receive_text()
            await websocket.send_text(f"Message text was: {data}")
    except WebSocketDisconnect:
        logger.info("Client disconnected from call tracking websocket")

@app.get("/health")
async def health_check():
    return {"status": "ok"}
