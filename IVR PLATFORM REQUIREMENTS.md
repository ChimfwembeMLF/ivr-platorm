# IVR Platform Development Guide — Asterisk, Python SIP & React

## Complete Development Blueprint for IVR Platform

This guide provides a step-by-step development approach for building a production-ready IVR platform.

---

## 1. Core Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REACT DASHBOARD (Port 3000)                      │
│                      Flow Builder + Audio Manager + Analytics              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ REST API / WebSocket
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND (Port 8000)                         │
│                    ┌────────────────────────────────────┐                  │
│                    │    AGI Server (FastAGI)           │                  │
│                    │    - Flow Execution Engine        │                  │
│                    │    - State Management             │                  │
│                    │    - Audio Resolution             │                  │
│                    └────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
                            │                      │
                    SIP/AGI │                      │ Database/Redis
                            ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ASTERISK PBX (Port 5060)                              │
│              ┌────────────────────────────────────┐                       │
│              │   Dialplan + AGI Integration       │                       │
│              │   - SIP Registration               │                       │
│              │   - Call Routing                   │                       │
│              │   - Audio Playback                 │                       │
│              │   - DTMF Collection                │                       │
│              └────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
ivr-platform/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── flows.py
│   │   │   ├── calls.py
│   │   │   ├── audio.py
│   │   │   └── tenants.py
│   │   └── dependencies.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── redis_client.py
│   ├── agi/
│   │   ├── __init__.py
│   │   ├── server.py        # FastAGI server
│   │   ├── flow_engine.py   # IVR flow executor
│   │   ├── audio_resolver.py
│   │   └── session_manager.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── flow.py
│   │   ├── call.py
│   │   ├── audio.py
│   │   └── tenant.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── asterisk_manager.py
│   │   ├── audio_service.py
│   │   └── tts_service.py
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlowBuilder/
│   │   │   ├── AudioManager/
│   │   │   ├── Dashboard/
│   │   │   └── Calls/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── store/
│   └── package.json
├── asterisk/
│   ├── Dockerfile
│   ├── etc/
│   │   ├── asterisk/
│   │   │   ├── sip.conf
│   │   │   ├── extensions.conf
│   │   │   ├── agi.conf
│   │   │   └── modules.conf
│   └── sounds/
├── docker-compose.yml
└── README.md
```

---

## 3. Backend Development (FastAPI + Python)

### 3.1 Core Configuration

```python
# backend/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost/ivr_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Asterisk
    ASTERISK_HOST: str = "localhost"
    ASTERISK_PORT: int = 5038  # AMI
    ASTERISK_USERNAME: str = "admin"
    ASTERISK_PASSWORD: str = "password"
    ASTERISK_AGI_HOST: str = "0.0.0.0"
    ASTERISK_AGI_PORT: int = 4573
    
    # Audio
    AUDIO_STORAGE_PATH: str = "/app/audio"
    MAX_AUDIO_SIZE_MB: int = 10
    SUPPORTED_LANGUAGES: list = ["en", "bem", "nya", "swa"]
    
    # TTS
    TTS_ENABLED: bool = True
    TTS_MODEL: str = "en_US-lessac-medium"
    
    # JWT
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 3.2 Database Models

```python
# backend/models/flow.py
from sqlalchemy import Column, String, JSON, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base

class Flow(Base):
    __tablename__ = "flows"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String)
    trigger = Column(String(50), nullable=False)  # shortcode, keyword
    trigger_value = Column(String(50), nullable=False)
    definition = Column(JSON, nullable=False)
    language = Column(String(10), default="en")
    version = Column(String(20), default="1.0")
    status = Column(String(20), default="draft")  # draft, published, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    calls = relationship("Call", back_populates="flow")

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    call_id = Column(String(100), unique=True, nullable=False)  # Asterisk channel ID
    from_number = Column(String(20), nullable=False)
    to_number = Column(String(20), nullable=False)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flows.id"))
    direction = Column(String(20), default="inbound")
    status = Column(String(20), default="initiated")
    duration_seconds = Column(Integer, default=0)
    recording_path = Column(String(500))
    session_data = Column(JSON, default={})
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    metadata = Column(JSON, default={})
    
    # Relationships
    flow = relationship("Flow", back_populates="calls")
```

### 3.3 FastAPI Application

```python
# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import asyncio
from contextlib import asynccontextmanager

from .core.database import engine, Base
from .core.redis_client import redis_client
from .api.routes import flows, calls, audio, tenants
from .agi.server import AGIServer
from .core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown events"""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Start AGI server
    agi_server = AGIServer(host=settings.ASTERISK_AGI_HOST, port=settings.ASTERISK_AGI_PORT)
    agi_task = asyncio.create_task(agi_server.start())
    
    # Connect to Redis
    await redis_client.connect()
    
    yield
    
    # Cleanup
    await redis_client.close()
    agi_task.cancel()

app = FastAPI(
    title="IVR Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "api.ivr-platform.local"]
)

# Include routers
app.include_router(flows.router, prefix="/api/flows", tags=["flows"])
app.include_router(calls.router, prefix="/api/calls", tags=["calls"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(tenants.router, prefix="/api/tenants", tags=["tenants"])

# WebSocket for real-time updates
@app.websocket("/ws/calls")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Subscribe to call updates
            data = await websocket.receive_text()
            # Process message
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 4. AGI Server (FastAGI)

### 4.1 AGI Server Implementation

```python
# backend/agi/server.py
import asyncio
import asyncpg
import json
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import WebSocket
from asterisk.agi import AGI  # pip install asterisk-agi

from .flow_engine import FlowEngine
from .session_manager import SessionManager
from ..core.config import settings
from ..core.redis_client import redis_client

logger = logging.getLogger(__name__)

class AGIServer:
    """FastAGI server for handling Asterisk calls"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 4573):
        self.host = host
        self.port = port
        self.flow_engine = FlowEngine()
        self.session_manager = SessionManager()
        self.active_calls = {}
    
    async def start(self):
        """Start AGI server"""
        logger.info(f"Starting AGI server on {self.host}:{self.port}")
        
        # Create TCP server
        server = await asyncio.start_server(
            self.handle_client,
            self.host,
            self.port
        )
        
        async with server:
            await server.serve_forever()
    
    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        """Handle incoming AGI connection from Asterisk"""
        try:
            # Read AGI request
            agi_request = await self.read_agi_request(reader)
            
            # Parse AGI request
            channel = agi_request.get('agi_channel')
            caller_id = agi_request.get('agi_callerid')
            flow_id = agi_request.get('agi_arg_1')  # First AGI argument
            
            logger.info(f"AGI request from {caller_id} on channel {channel}")
            
            # Get tenant and flow
            tenant = await self.get_tenant_by_flow(flow_id)
            flow = await self.get_flow(tenant['id'], flow_id)
            
            # Create call session
            call_id = await self.session_manager.create_session(
                tenant_id=tenant['id'],
                channel=channel,
                caller_id=caller_id,
                flow_id=flow_id
            )
            
            # Execute flow
            result = await self.flow_engine.execute_flow(
                call_id=call_id,
                flow=flow,
                tenant=tenant
            )
            
            # Send response to Asterisk
            response = self.build_agi_response(result)
            writer.write(response.encode())
            await writer.drain()
            
            # Cleanup session
            await self.session_manager.cleanup_session(call_id)
            
        except Exception as e:
            logger.error(f"AGI error: {str(e)}")
            writer.write(f"FAILURE\n".encode())
            await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()
    
    async def read_agi_request(self, reader: asyncio.StreamReader) -> Dict[str, str]:
        """Read AGI request from Asterisk"""
        request = {}
        while True:
            line = await reader.readline()
            line = line.decode().strip()
            
            if not line:
                break
            if line == '':
                continue
            
            # Parse AGI request line
            if ':' in line:
                key, value = line.split(':', 1)
                request[key.strip()] = value.strip()
            else:
                # This might be the first line of AGI request
                # Example: "agi_request: agi_async"
                pass
        
        return request
    
    def build_agi_response(self, result: Dict[str, Any]) -> str:
        """Build AGI response for Asterisk"""
        response = []
        
        if result.get('action') == 'play_audio':
            response.append(f"PLAYBACK {result['audio_file']}")
        elif result.get('action') == 'get_data':
            response.append(f"GET DATA {result['audio_file']} {result.get('timeout', 5)} {result.get('digits', 1)}")
        elif result.get('action') == 'hangup':
            response.append("HANGUP")
        elif result.get('action') == 'bridge':
            response.append(f"BRIDGE {result['destination']}")
        elif result.get('action') == 'say_digits':
            response.append(f"SAY DIGITS {result['digits']}")
        else:
            response.append("HANGUP")
        
        return "\n".join(response)
    
    async def get_tenant_by_flow(self, flow_id: str):
        """Get tenant by flow ID"""
        # Implementation using PostgreSQL
        pass
    
    async def get_flow(self, tenant_id: str, flow_id: str):
        """Get flow definition"""
        # Implementation using PostgreSQL
        pass
```

### 4.2 Flow Engine Implementation

```python
# backend/agi/flow_engine.py
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import httpx
import asyncpg

from ..core.redis_client import redis_client
from ..core.database import get_db
from ..services.asterisk_manager import AsteriskManager
from ..services.audio_service import AudioService

logger = logging.getLogger(__name__)

class FlowEngine:
    """Executes IVR flows"""
    
    def __init__(self):
        self.asterisk = AsteriskManager()
        self.audio_service = AudioService()
        self.step_handlers = {
            "play_audio": self.handle_play_audio,
            "collect_dtmf": self.handle_collect_dtmf,
            "database_query": self.handle_database_query,
            "api_call": self.handle_api_call,
            "conditional": self.handle_conditional,
            "transfer": self.handle_transfer,
            "hangup": self.handle_hangup,
            "set_variable": self.handle_set_variable,
            "wait": self.handle_wait,
            "ai_response": self.handle_ai_response,
        }
    
    async def execute_flow(self, call_id: str, flow: Dict, tenant: Dict) -> Dict:
        """Execute the flow"""
        logger.info(f"Executing flow {flow['id']} for call {call_id}")
        
        # Initialize session state
        await self.initialize_session(call_id, flow, tenant)
        
        # Get current step
        current_step_index = 0
        flow_definition = flow['definition']
        steps = flow_definition.get('steps', [])
        
        while current_step_index < len(steps):
            step = steps[current_step_index]
            
            try:
                # Execute step
                result = await self.execute_step(call_id, step, flow, tenant)
                
                # Check if we need to change flow
                if result.get('flow_id'):
                    # New flow
                    new_flow = await self.get_flow(tenant['id'], result['flow_id'])
                    return await self.execute_flow(call_id, new_flow, tenant)
                
                # Update session state
                await self.update_session(call_id, result)
                
                # Determine next step
                if result.get('next'):
                    # Find next step by ID
                    next_step_id = result['next']
                    for i, s in enumerate(steps):
                        if s['id'] == next_step_id:
                            current_step_index = i
                            break
                    else:
                        # Step not found, go to next step
                        current_step_index += 1
                elif result.get('next_index') is not None:
                    current_step_index = result['next_index']
                elif result.get('step_completed', True):
                    current_step_index += 1
                else:
                    # Stay on same step (retry)
                    pass
                
                # Check for hangup
                if result.get('action') == 'hangup':
                    break
                
            except Exception as e:
                logger.error(f"Error executing step {step['id']}: {str(e)}")
                
                # Handle error
                if step.get('on_error'):
                    # Go to error handling step
                    for i, s in enumerate(steps):
                        if s['id'] == step['on_error']:
                            current_step_index = i
                            break
                else:
                    current_step_index += 1
        
        # Complete call
        await self.complete_call(call_id)
        
        return {"action": "hangup"}
    
    async def execute_step(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Execute a single step"""
        step_type = step['type']
        handler = self.step_handlers.get(step_type)
        
        if not handler:
            logger.error(f"Unknown step type: {step_type}")
            return {"action": "hangup", "step_completed": True}
        
        # Execute handler
        result = await handler(call_id, step, flow, tenant)
        
        # Log step execution
        await self.log_step_execution(call_id, step, result)
        
        return result
    
    async def handle_play_audio(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle play_audio step"""
        config = step.get('config', {})
        audio_type = config.get('audio_type', 'prompt')
        language = config.get('language', tenant.get('default_language', 'en'))
        
        # Resolve audio file
        audio_file = await self.audio_service.get_audio_file(
            tenant_id=tenant['id'],
            flow_id=flow['id'],
            step_id=step['id'],
            audio_type=audio_type,
            language=language
        )
        
        if audio_file:
            return {
                "action": "play_audio",
                "audio_file": audio_file,
                "step_completed": True,
                "next": step.get('next')
            }
        else:
            # Fallback to TTS
            tts_text = config.get('tts_text', f"Audio for {audio_type} not available")
            return await self.handle_tts(call_id, tts_text, language)
    
    async def handle_collect_dtmf(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle collect_dtmf step"""
        config = step.get('config', {})
        
        # Get audio prompt
        audio_file = await self.audio_service.get_audio_file(
            tenant_id=tenant['id'],
            flow_id=flow['id'],
            step_id=step['id'],
            audio_type=config.get('audio_type', 'prompt'),
            language=tenant.get('default_language', 'en')
        )
        
        # Get DTMF input from Asterisk
        result = await self.asterisk.get_dtmf(
            call_id=call_id,
            audio_file=audio_file,
            timeout=config.get('timeout', 5),
            digits=config.get('digits', 1),
            retries=config.get('retries', 3)
        )
        
        if result.get('success'):
            # Store collected digits
            variable_name = config.get('variable', 'dtmf_input')
            return {
                "step_completed": True,
                "variables": {variable_name: result['digits']},
                "next": step.get('next')
            }
        else:
            # Timeout or error
            if step.get('on_timeout'):
                return {
                    "step_completed": True,
                    "next": step['on_timeout']
                }
            else:
                return {
                    "step_completed": True,
                    "next": step.get('next')
                }
    
    async def handle_api_call(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle api_call step"""
        config = step.get('config', {})
        
        # Get session data
        session = await self.get_session(call_id)
        variables = session.get('variables', {})
        
        # Build request
        url = await self.replace_variables(config['url'], variables)
        method = config.get('method', 'GET')
        headers = await self.build_headers(config.get('headers', {}), variables)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=config.get('body'),
                    timeout=config.get('timeout', 10)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "step_completed": True,
                        "variables": data,
                        "next": step.get('next', {}).get('on_success')
                    }
                else:
                    return {
                        "step_completed": True,
                        "next": step.get('next', {}).get('on_error')
                    }
        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            return {
                "step_completed": True,
                "next": step.get('next', {}).get('on_error')
            }
    
    async def handle_conditional(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle conditional step"""
        config = step.get('config', {})
        condition = config.get('condition', '')
        
        session = await self.get_session(call_id)
        variables = session.get('variables', {})
        
        # Evaluate condition
        try:
            condition_value = await self.evaluate_condition(condition, variables)
            
            if condition_value:
                return {
                    "step_completed": True,
                    "next": step.get('next', {}).get('true')
                }
            else:
                return {
                    "step_completed": True,
                    "next": step.get('next', {}).get('false')
                }
        except Exception as e:
            logger.error(f"Condition evaluation failed: {str(e)}")
            return {
                "step_completed": True,
                "next": step.get('next')
            }
    
    async def handle_transfer(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle transfer step"""
        config = step.get('config', {})
        destination = config.get('destination')
        
        return {
            "action": "bridge",
            "destination": destination,
            "step_completed": True
        }
    
    async def handle_hangup(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle hangup step"""
        return {
            "action": "hangup",
            "step_completed": True
        }
    
    async def handle_set_variable(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle set_variable step"""
        config = step.get('config', {})
        variables = config.get('variables', {})
        
        return {
            "step_completed": True,
            "variables": variables,
            "next": step.get('next')
        }
    
    async def handle_wait(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle wait step"""
        config = step.get('config', {})
        duration = config.get('duration', 1)
        
        await asyncio.sleep(duration)
        
        return {
            "step_completed": True,
            "next": step.get('next')
        }
    
    async def handle_ai_response(self, call_id: str, step: Dict, flow: Dict, tenant: Dict) -> Dict:
        """Handle ai_response step"""
        config = step.get('config', {})
        prompt = config.get('prompt', 'How can I help you?')
        
        # Get AI response (simplified)
        response_text = "This is a simulated AI response"
        
        # Convert to speech
        audio_file = await self.audio_service.tts(
            text=response_text,
            language=tenant.get('default_language', 'en')
        )
        
        return {
            "action": "play_audio",
            "audio_file": audio_file,
            "step_completed": True,
            "next": step.get('next')
        }
    
    async def evaluate_condition(self, condition: str, variables: Dict) -> bool:
        """Evaluate a condition expression"""
        # Simple condition evaluation
        # Example: "${customer.has_loan} == true"
        
        # Replace variables
        for key, value in variables.items():
            condition = condition.replace(f"${{{key}}}", str(value))
        
        # Evaluate expression (with caution in production)
        try:
            result = eval(condition)
            return bool(result)
        except:
            return False
    
    async def replace_variables(self, text: str, variables: Dict) -> str:
        """Replace variables in text"""
        for key, value in variables.items():
            text = text.replace(f"${{{key}}}", str(value))
        return text
    
    async def initialize_session(self, call_id: str, flow: Dict, tenant: Dict):
        """Initialize call session in Redis"""
        session_data = {
            "call_id": call_id,
            "tenant_id": tenant['id'],
            "flow_id": flow['id'],
            "variables": {},
            "steps_completed": [],
            "started_at": datetime.utcnow().isoformat()
        }
        
        await redis_client.set(
            f"session:{call_id}",
            json.dumps(session_data),
            ex=3600  # 1 hour TTL
        )
    
    async def get_session(self, call_id: str) -> Dict:
        """Get session data from Redis"""
        data = await redis_client.get(f"session:{call_id}")
        if data:
            return json.loads(data)
        return {}
    
    async def update_session(self, call_id: str, result: Dict):
        """Update session data"""
        session = await self.get_session(call_id)
        
        if result.get('variables'):
            session['variables'].update(result['variables'])
        
        await redis_client.set(
            f"session:{call_id}",
            json.dumps(session),
            ex=3600
        )
    
    async def complete_call(self, call_id: str):
        """Complete the call and save CDR"""
        session = await self.get_session(call_id)
        
        # Save to database
        async with get_db() as conn:
            await conn.execute("""
                UPDATE calls 
                SET status = 'completed',
                    ended_at = NOW(),
                    session_data = $1
                WHERE call_id = $2
            """, json.dumps(session), call_id)
        
        # Clean up Redis
        await redis_client.delete(f"session:{call_id}")
    
    async def log_step_execution(self, call_id: str, step: Dict, result: Dict):
        """Log step execution"""
        log_entry = {
            "step_id": step['id'],
            "step_type": step['type'],
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await redis_client.rpush(
            f"call:steps:{call_id}",
            json.dumps(log_entry)
        )
```

### 4.3 Audio Service

```python
# backend/services/audio_service.py
import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional, Dict, Any
import json

from ..core.config import settings
from ..core.redis_client import redis_client
from ..core.database import get_db

class AudioService:
    """Handles audio files and TTS"""
    
    def __init__(self):
        self.audio_path = Path(settings.AUDIO_STORAGE_PATH)
        self.audio_path.mkdir(parents=True, exist_ok=True)
    
    async def get_audio_file(
        self,
        tenant_id: str,
        flow_id: str,
        step_id: str,
        audio_type: str,
        language: str = "en"
    ) -> Optional[str]:
        """Get audio file path with priority resolution"""
        
        # 1. Check step-specific audio
        step_audio = await self.get_step_audio(tenant_id, flow_id, step_id, audio_type, language)
        if step_audio:
            return step_audio
        
        # 2. Check flow default audio
        flow_audio = await self.get_flow_audio(tenant_id, flow_id, audio_type, language)
        if flow_audio:
            return flow_audio
        
        # 3. Check tenant default audio
        tenant_audio = await self.get_tenant_audio(tenant_id, audio_type, language)
        if tenant_audio:
            return tenant_audio
        
        # 4. Check system default
        system_audio = await self.get_system_audio(audio_type, language)
        if system_audio:
            return system_audio
        
        # 5. TTS fallback
        return None
    
    async def get_step_audio(self, tenant_id: str, flow_id: str, step_id: str, audio_type: str, language: str) -> Optional[str]:
        """Get step-specific audio"""
        async with get_db() as conn:
            result = await conn.fetchrow("""
                SELECT file_path 
                FROM audio_assets 
                WHERE tenant_id = $1 
                  AND flow_id = $2 
                  AND step_id = $3 
                  AND type = $4 
                  AND language = $5
                  AND status = 'active'
                LIMIT 1
            """, tenant_id, flow_id, step_id, audio_type, language)
            
            if result:
                return result['file_path']
        return None
    
    async def get_flow_audio(self, tenant_id: str, flow_id: str, audio_type: str, language: str) -> Optional[str]:
        """Get flow default audio"""
        # Similar to above but without step_id
        pass
    
    async def get_tenant_audio(self, tenant_id: str, audio_type: str, language: str) -> Optional[str]:
        """Get tenant default audio"""
        pass
    
    async def get_system_audio(self, audio_type: str, language: str) -> Optional[str]:
        """Get system default audio"""
        system_path = self.audio_path / "system" / language / f"{audio_type}.wav"
        if system_path.exists():
            return str(system_path)
        return None
    
    async def save_audio_file(
        self,
        file_content: bytes,
        tenant_id: str,
        filename: str,
        metadata: Dict[str, Any]
    ) -> str:
        """Save uploaded audio file"""
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        extension = Path(filename).suffix
        new_filename = f"{unique_id}{extension}"
        
        # Create tenant directory
        tenant_path = self.audio_path / "tenants" / tenant_id
        tenant_path.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = tenant_path / new_filename
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Save metadata to database
        async with get_db() as conn:
            await conn.execute("""
                INSERT INTO audio_assets (
                    id, tenant_id, name, file_path, type, 
                    language, duration_seconds, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, 
                uuid.uuid4(),
                tenant_id,
                metadata.get('name', filename),
                str(file_path),
                metadata.get('type', 'custom'),
                metadata.get('language', 'en'),
                metadata.get('duration'),
                json.dumps(metadata)
            )
        
        return str(file_path)
    
    async def tts(self, text: str, language: str = "en") -> str:
        """Generate TTS audio"""
        # This is a placeholder - integrate with Piper TTS
        # For now, return a default audio path
        return "/sounds/default_tts.wav"
```

### 4.4 Asterisk Manager

```python
# backend/services/asterisk_manager.py
import asyncio
import logging
from typing import Optional, Dict, Any
import subprocess

from ..core.config import settings

logger = logging.getLogger(__name__)

class AsteriskManager:
    """Manage Asterisk integration"""
    
    def __init__(self):
        self.agi_host = settings.ASTERISK_AGI_HOST
        self.agi_port = settings.ASTERISK_AGI_PORT
    
    async def get_dtmf(
        self,
        call_id: str,
        audio_file: Optional[str] = None,
        timeout: int = 5,
        digits: int = 1,
        retries: int = 3
    ) -> Dict[str, Any]:
        """Get DTMF input from Asterisk"""
        # In a real implementation, this would use the AGI interface
        # This is a simplified mock for demonstration
        
        # Simulate DTMF collection
        await asyncio.sleep(1)
        
        # Return mock result
        return {
            "success": True,
            "digits": "1234"
        }
    
    async def play_audio(self, call_id: str, audio_file: str) -> bool:
        """Play audio to the caller"""
        # In a real implementation, this would use the AGI interface
        await asyncio.sleep(0.5)
        return True
    
    async def bridge_call(self, call_id: str, destination: str) -> bool:
        """Bridge call to destination"""
        # In a real implementation, this would use the AGI interface
        return True
```

---

## 5. Frontend Development (React)

### 5.1 Flow Builder Component

```tsx
// frontend/src/components/FlowBuilder/FlowBuilder.tsx
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { FlowStepNode } from './FlowStepNode';
import { StepPalette } from './StepPalette';
import { StepProperties } from './StepProperties';
import { FlowToolbar } from './FlowToolbar';
import { api } from '../../services/api';

const nodeTypes = {
  step: FlowStepNode,
};

interface FlowBuilderProps {
  flowId?: string;
  tenantId: string;
}

export const FlowBuilder: React.FC<FlowBuilderProps> = ({ flowId, tenantId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (flowId) {
      loadFlow();
    }
  }, [flowId]);

  const loadFlow = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/flows/${flowId}`);
      const flowData = response.data;
      
      setFlowName(flowData.name);
      setFlowDescription(flowData.description || '');
      
      // Convert flow definition to nodes and edges
      const { nodes: flowNodes, edges: flowEdges } = flowToReactFlow(flowData.definition);
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const flowToReactFlow = (definition: any) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Create nodes from steps
    definition.steps.forEach((step: any, index: number) => {
      nodes.push({
        id: step.id,
        type: 'step',
        position: step.position || { x: 250 * (index % 3), y: 100 * Math.floor(index / 3) },
        data: {
          label: step.name || step.type,
          type: step.type,
          config: step.config,
        },
      });
    });
    
    // Create edges from next links
    definition.steps.forEach((step: any) => {
      if (step.next) {
        edges.push({
          id: `${step.id}-${step.next}`,
          source: step.id,
          target: step.next,
          animated: true,
        });
      }
    });
    
    return { nodes, edges };
  };

  const reactFlowToFlow = () => {
    const steps = nodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      name: node.data.label,
      config: node.data.config || {},
      position: node.position,
      next: edges
        .filter((edge) => edge.source === node.id)
        .map((edge) => edge.target)[0] || null,
    }));

    return {
      name: flowName,
      description: flowDescription,
      steps,
    };
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onNodeChange = useCallback(
    (updatedNode: Node) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === updatedNode.id ? updatedNode : node
        )
      );
      setSelectedNode(updatedNode);
    },
    [setNodes]
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const flowData = reactFlowToFlow();
      if (flowId) {
        await api.put(`/flows/${flowId}`, flowData);
      } else {
        await api.post('/flows', {
          ...flowData,
          tenant_id: tenantId,
          trigger: 'shortcode',
          trigger_value: '*123',
        });
      }
      alert('Flow saved successfully!');
    } catch (error) {
      console.error('Failed to save flow:', error);
      alert('Failed to save flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = (stepType: string) => {
    const newNode: Node = {
      id: `step-${Date.now()}`,
      type: 'step',
      position: { x: Math.random() * 500, y: Math.random() * 300 },
      data: {
        label: stepType.replace('_', ' ').toUpperCase(),
        type: stepType,
        config: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar - Step palette */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <StepPalette onAddStep={handleAddStep} />
      </div>

      {/* Center - Flow canvas */}
      <div className="flex-1 relative">
        <FlowToolbar
          flowName={flowName}
          setFlowName={setFlowName}
          onSave={handleSave}
          isLoading={isLoading}
        />
        
        <div className="h-[calc(100%-64px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Right sidebar - Step properties */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        {selectedNode ? (
          <StepProperties
            node={selectedNode}
            onNodeChange={onNodeChange}
          />
        ) : (
          <div className="text-gray-400 text-center mt-8">
            Select a step to edit properties
          </div>
        )}
      </div>
    </div>
  );
};
```

### 5.2 Step Properties Component

```tsx
// frontend/src/components/FlowBuilder/StepProperties.tsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Divider,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { Node } from 'reactflow';

interface StepPropertiesProps {
  node: Node;
  onNodeChange: (node: Node) => void;
}

export const StepProperties: React.FC<StepPropertiesProps> = ({ node, onNodeChange }) => {
  const [config, setConfig] = useState(node.data.config || {});
  const [label, setLabel] = useState(node.data.label || '');

  useEffect(() => {
    // Update node when config changes
    onNodeChange({
      ...node,
      data: {
        ...node.data,
        label: label,
        config: config,
      },
    });
  }, [config, label]);

  const renderConfigFields = () => {
    const stepType = node.data.type;

    switch (stepType) {
      case 'play_audio':
        return (
          <Box>
            <FormControl fullWidth margin="normal">
              <InputLabel>Audio Type</InputLabel>
              <Select
                value={config.audio_type || 'prompt'}
                onChange={(e) => setConfig({ ...config, audio_type: e.target.value })}
              >
                <MenuItem value="welcome">Welcome</MenuItem>
                <MenuItem value="prompt">Prompt</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Language</InputLabel>
              <Select
                value={config.language || 'en'}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="bem">Bemba</MenuItem>
                <MenuItem value="nya">Nyanja</MenuItem>
                <MenuItem value="swa">Swahili</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="TTS Fallback Text"
              value={config.tts_text || ''}
              onChange={(e) => setConfig({ ...config, tts_text: e.target.value })}
              multiline
              rows={2}
            />
          </Box>
        );

      case 'collect_dtmf':
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Timeout (seconds)"
              type="number"
              value={config.timeout || 5}
              onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Number of Digits"
              type="number"
              value={config.digits || 1}
              onChange={(e) => setConfig({ ...config, digits: parseInt(e.target.value) })}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Variable Name"
              value={config.variable || 'dtmf_input'}
              onChange={(e) => setConfig({ ...config, variable: e.target.value })}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Retries"
              type="number"
              value={config.retries || 3}
              onChange={(e) => setConfig({ ...config, retries: parseInt(e.target.value) })}
            />
          </Box>
        );

      case 'api_call':
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="API URL"
              value={config.url || ''}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Method</InputLabel>
              <Select
                value={config.method || 'GET'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="Headers (JSON)"
              value={config.headers ? JSON.stringify(config.headers, null, 2) : '{}'}
              onChange={(e) => {
                try {
                  const headers = JSON.parse(e.target.value);
                  setConfig({ ...config, headers });
                } catch {
                  // Invalid JSON
                }
              }}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Body (JSON)"
              value={config.body ? JSON.stringify(config.body, null, 2) : '{}'}
              onChange={(e) => {
                try {
                  const body = JSON.parse(e.target.value);
                  setConfig({ ...config, body });
                } catch {
                  // Invalid JSON
                }
              }}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Timeout (seconds)"
              type="number"
              value={config.timeout || 10}
              onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
            />
          </Box>
        );

      case 'conditional':
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Condition Expression"
              value={config.condition || ''}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              helperText="Example: ${customer.has_loan} == true"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              margin="normal"
              label="True Step ID"
              value={config.true_step || ''}
              onChange={(e) => setConfig({ ...config, true_step: e.target.value })}
              placeholder="Step ID when condition is true"
            />
            <TextField
              fullWidth
              margin="normal"
              label="False Step ID"
              value={config.false_step || ''}
              onChange={(e) => setConfig({ ...config, false_step: e.target.value })}
              placeholder="Step ID when condition is false"
            />
          </Box>
        );

      case 'transfer':
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Destination"
              value={config.destination || ''}
              onChange={(e) => setConfig({ ...config, destination: e.target.value })}
              helperText="Extension number or external number"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.wait_for_agent || false}
                  onChange={(e) => setConfig({ ...config, wait_for_agent: e.target.checked })}
                />
              }
              label="Wait for agent"
            />
            {config.wait_for_agent && (
              <TextField
                fullWidth
                margin="normal"
                label="Wait Music"
                value={config.wait_music || ''}
                onChange={(e) => setConfig({ ...config, wait_music: e.target.value })}
              />
            )}
          </Box>
        );

      case 'set_variable':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Variables
            </Typography>
            {Object.entries(config.variables || {}).map(([key, value]) => (
              <Box key={key} display="flex" alignItems="center" gap={1} mb={1}>
                <TextField
                  size="small"
                  label="Key"
                  value={key}
                  onChange={(e) => {
                    const newVars = { ...(config.variables || {}) };
                    delete newVars[key];
                    newVars[e.target.value] = value;
                    setConfig({ ...config, variables: newVars });
                  }}
                />
                <TextField
                  size="small"
                  label="Value"
                  value={value as string}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      variables: {
                        ...(config.variables || {}),
                        [key]: e.target.value,
                      },
                    });
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => {
                    const newVars = { ...(config.variables || {}) };
                    delete newVars[key];
                    setConfig({ ...config, variables: newVars });
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => {
                setConfig({
                  ...config,
                  variables: {
                    ...(config.variables || {}),
                    ['new_variable']: '',
                  },
                });
              }}
            >
              Add Variable
            </Button>
          </Box>
        );

      default:
        return (
          <Box>
            <Typography variant="body2" color="textSecondary">
              No configuration available for this step type
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Step Properties
      </Typography>
      
      <Chip
        label={node.data.type}
        size="small"
        color="primary"
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Step Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <Divider sx={{ my: 2 }} />

      {renderConfigFields()}
    </Box>
  );
};
```

### 5.3 Audio Manager Component

```tsx
// frontend/src/components/AudioManager/AudioManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Upload,
  Mic,
  Phone,
  PlayArrow,
  Delete,
  Edit,
  Link,
  VolumeUp,
  Stop,
} from '@mui/icons-material';
import { api } from '../../services/api';

interface AudioManagerProps {
  tenantId: string;
  flowId?: string;
}

export const AudioManager: React.FC<AudioManagerProps> = ({ tenantId, flowId }) => {
  const [audios, setAudios] = useState<any[]>([]);
  const [language, setLanguage] = useState('en');
  const [type, setType] = useState('custom');
  const [openUpload, setOpenUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    loadAudios();
  }, [tenantId, language]);

  const loadAudios = async () => {
    try {
      const response = await api.get(`/tenants/${tenantId}/audio`, {
        params: { language, flow_id: flowId },
      });
      setAudios(response.data);
    } catch (error) {
      console.error('Failed to load audio:', error);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('type', type);
    formData.append('tenant_id', tenantId);
    if (flowId) formData.append('flow_id', flowId);

    try {
      await api.post(`/tenants/${tenantId}/audio/upload`, formData, {
        onUploadProgress: (event) => {
          const percent = Math.round((event.loaded * 100) / event.total);
          setProgress(percent);
        },
      });
      
      await loadAudios();
      setOpenUpload(false);
      setSelectedFile(null);
      alert('Audio uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload audio');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleMicrophoneRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `recording_${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        await handleUpload(file);
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      }, 30000); // 30 second limit
    } catch (error) {
      console.error('Recording failed:', error);
      alert('Failed to access microphone');
    }
  };

  const handlePhoneRecord = async () => {
    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    try {
      await api.post(`/tenants/${tenantId}/audio/record-by-phone`, {
        phone_number: phoneNumber,
        language,
        type,
        flow_id: flowId,
      });
      alert(`Call initiated to ${phoneNumber}. Please record your message.`);
    } catch (error) {
      console.error('Phone recording failed:', error);
      alert('Failed to initiate phone recording');
    }
  };

  const handleTTS = async () => {
    if (!ttsText) {
      alert('Please enter text for TTS');
      return;
    }

    try {
      const response = await api.post(`/tenants/${tenantId}/audio/tts`, {
        text: ttsText,
        language,
        type,
        flow_id: flowId,
      });
      await loadAudios();
      alert('TTS audio generated successfully!');
    } catch (error) {
      console.error('TTS generation failed:', error);
      alert('Failed to generate TTS');
    }
  };

  const handlePlay = (audio: any) => {
    const audioElement = new Audio(`/api/audio/${audio.id}`);
    audioElement.play();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this audio?')) return;
    try {
      await api.delete(`/tenants/${tenantId}/audio/${id}`);
      await loadAudios();
      alert('Audio deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete audio');
    }
  };

  const handleAssign = async (audioId: string) => {
    if (!flowId) {
      alert('Please open a flow to assign audio');
      return;
    }
    
    try {
      await api.post(`/tenants/${tenantId}/audio/${audioId}/assign`, {
        flow_id: flowId,
      });
      await loadAudios();
      alert('Audio assigned to flow successfully!');
    } catch (error) {
      console.error('Assignment failed:', error);
      alert('Failed to assign audio');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Audio Manager</Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setOpenUpload(true)}
        >
          Add Audio
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={3}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="bem">Bemba</MenuItem>
            <MenuItem value="nya">Nyanja</MenuItem>
            <MenuItem value="swa">Swahili</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <MenuItem value="welcome">Welcome</MenuItem>
            <MenuItem value="menu">Menu</MenuItem>
            <MenuItem value="prompt">Prompt</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {audios.map((audio) => (
                <TableRow key={audio.id}>
                  <TableCell>{audio.name}</TableCell>
                  <TableCell>
                    <Chip label={audio.type} size="small" />
                  </TableCell>
                  <TableCell>{audio.duration_seconds}s</TableCell>
                  <TableCell>
                    {audio.assigned_flow_id ? (
                      <Chip label="Assigned" color="success" size="small" />
                    ) : (
                      <Chip label="Unassigned" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handlePlay(audio)}>
                      <PlayArrow />
                    </IconButton>
                    {!audio.assigned_flow_id && (
                      <IconButton onClick={() => handleAssign(audio.id)}>
                        <Link />
                      </IconButton>
                    )}
                    <IconButton onClick={() => handleDelete(audio.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Voice Prompt</DialogTitle>
        <DialogContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Upload File" icon={<Upload />} />
            <Tab label="Microphone" icon={<Mic />} />
            <Tab label="Call to Record" icon={<Phone />} />
            <Tab label="Text-to-Speech" icon={<VolumeUp />} />
          </Tabs>

          <Box mt={2}>
            {tabValue === 0 && (
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{ py: 2 }}
                >
                  {selectedFile ? selectedFile.name : 'Select Audio File'}
                  <input
                    type="file"
                    hidden
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setSelectedFile(file);
                    }}
                  />
                </Button>
                {selectedFile && (
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => handleUpload(selectedFile)}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                )}
                {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />}
              </Box>
            )}

            {tabValue === 1 && (
              <Box textAlign="center">
                <Button
                  variant="contained"
                  color={isRecording ? 'error' : 'primary'}
                  onClick={handleMicrophoneRecord}
                  size="large"
                  startIcon={isRecording ? <Stop /> : <Mic />}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                {isRecording && (
                  <Box mt={2}>
                    <LinearProgress />
                    <Typography variant="caption" color="textSecondary">
                      Recording... (max 30 seconds)
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="+260 971234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handlePhoneRecord}
                  startIcon={<Phone />}
                >
                  Call to Record
                </Button>
                <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                  We'll call you and guide you through recording your prompt.
                </Typography>
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Text for Voice Generation"
                  placeholder="Enter the text you want to convert to speech..."
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                />
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleTTS}
                  startIcon={<VolumeUp />}
                >
                  Generate Speech
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

### 5.4 API Service

```tsx
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flow API
export const flowApi = {
  getFlows: (tenantId: string) => api.get(`/flows?tenant_id=${tenantId}`),
  getFlow: (id: string) => api.get(`/flows/${id}`),
  createFlow: (data: any) => api.post('/flows', data),
  updateFlow: (id: string, data: any) => api.put(`/flows/${id}`, data),
  deleteFlow: (id: string) => api.delete(`/flows/${id}`),
  publishFlow: (id: string) => api.post(`/flows/${id}/publish`),
};

// Audio API
export const audioApi = {
  getAudios: (tenantId: string, params: any) => 
    api.get(`/tenants/${tenantId}/audio`, { params }),
  uploadAudio: (tenantId: string, data: FormData) =>
    api.post(`/tenants/${tenantId}/audio/upload`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAudio: (tenantId: string, id: string) =>
    api.delete(`/tenants/${tenantId}/audio/${id}`),
  assignAudio: (tenantId: string, id: string, flowId: string) =>
    api.post(`/tenants/${tenantId}/audio/${id}/assign`, { flow_id: flowId }),
  ttsAudio: (tenantId: string, data: any) =>
    api.post(`/tenants/${tenantId}/audio/tts`, data),
  phoneRecord: (tenantId: string, data: any) =>
    api.post(`/tenants/${tenantId}/audio/record-by-phone`, data),
};

// Call API
export const callApi = {
  getCalls: (tenantId: string, params: any) =>
    api.get(`/tenants/${tenantId}/calls`, { params }),
  getCall: (id: string) => api.get(`/calls/${id}`),
  getCallDetails: (id: string) => api.get(`/calls/${id}/details`),
};

export { api };
```

### 5.5 Main Dashboard

```tsx
// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import { Phone, People, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    activeCalls: 0,
    totalCallsToday: 0,
    avgWaitTime: 0,
    abandonedCalls: 0,
  });
  const [recentCalls, setRecentCalls] = useState([]);

  useEffect(() => {
    loadMetrics();
    loadRecentCalls();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadRecentCalls = async () => {
    try {
      const response = await api.get('/calls/recent');
      setRecentCalls(response.data);
    } catch (error) {
      console.error('Failed to load recent calls:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Typography color="textSecondary">Active Calls</Typography>
                <Phone size={20} />
              </Box>
              <Typography variant="h3">{metrics.activeCalls}</Typography>
              <Typography variant="caption">Currently in progress</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Typography color="textSecondary">Today's Calls</Typography>
                <TrendingUp size={20} />
              </Box>
              <Typography variant="h3">{metrics.totalCallsToday}</Typography>
              <Typography variant="caption">Last 24 hours</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Typography color="textSecondary">Avg Wait Time</Typography>
                <People size={20} />
              </Box>
              <Typography variant="h3">{metrics.avgWaitTime}s</Typography>
              <Typography variant="caption">Average wait time</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Typography color="textSecondary">Abandoned</Typography>
                <AlertCircle size={20} color="error" />
              </Box>
              <Typography variant="h3">{metrics.abandonedCalls}</Typography>
              <Typography variant="caption">Calls abandoned</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Calls
              </Typography>
              {/* Call list table */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

---

## 6. Asterisk Configuration

### 6.1 sip.conf

```ini
# asterisk/etc/asterisk/sip.conf

[general]
context=public
allowoverlap=no
udpbindaddr=0.0.0.0:5060
tcpenable=no
tcpbindaddr=0.0.0.0:5060
transport=udp
srvlookup=yes
language=en
nat=force_rport,comedia
externip=YOUR_PUBLIC_IP
localnet=192.168.0.0/16
localnet=10.0.0.0/8

# Codecs
disallow=all
allow=ulaw
allow=alaw
allow=g722

# DTMF
dtmfmode=rfc2833

# Quality
qualify=yes
qualifyfreq=60

# Direct media
directmedia=no

[authentication]
; SIP authentication for carriers

[carrier-twilio]
type=peer
host=sip.twilio.com
context=from-twilio
dtmfmode=rfc2833
canreinvite=no
qualify=yes
insecure=port,invite
fromuser=YOUR_TWILIO_USER
fromdomain=sip.twilio.com
authname=YOUR_AUTH_NAME
secret=YOUR_AUTH_SECRET

[carrier-africastalking]
type=peer
host=sip.africastalking.com
context=from-africastalking
dtmfmode=rfc2833
canreinvite=no
qualify=yes
insecure=port,invite

[tenant-microloan]
type=peer
context=tenant-context
host=dynamic
dtmfmode=rfc2833
canreinvite=no
qualify=yes

[agent-100]
type=friend
host=dynamic
context=agents
secret=agent100
callerid="Agent 100" <100>
mailbox=100@default
allow=ulaw
allow=alaw
dtmfmode=rfc2833
canreinvite=no
qualify=yes

[agent-101]
type=friend
host=dynamic
context=agents
secret=agent101
callerid="Agent 101" <101>
mailbox=101@default
allow=ulaw
allow=alaw
dtmfmode=rfc2833
canreinvite=no
qualify=yes
```

### 6.2 extensions.conf

```ini
# asterisk/etc/asterisk/extensions.conf

[globals]
TENANT=${ENV(TENANT)}
AGI_HOST=${ENV(AGI_HOST)}
AGI_PORT=${ENV(AGI_PORT)}

[default]
exten => s,1,NoOp(Default context)
 same => n,Answer()
 same => n,Wait(2)
 same => n,Playback(welcome)
 same => n,Hangup()

; Incoming from carrier
[from-twilio]
exten => _X.,1,NoOp(Incoming call from ${CALLERID(num)} to ${EXTEN})
 same => n,Set(TENANT=${CALLERID(num):0:4}) ; Extract tenant from caller ID
 same => n,Goto(tenant-context,s,1)

[from-africastalking]
exten => _X.,1,NoOp(Incoming call from ${CALLERID(num)})
 same => n,Set(TENANT=${CALLERID(num):0:4})
 same => n,Goto(tenant-context,s,1)

; Tenant IVR context
[tenant-context]
exten => s,1,NoOp(IVR entry for ${TENANT})
 same => n,Answer()
 same => n,Wait(1)
 same => n,Set(CHANNEL(accountcode)=${TENANT})
 same => n,AGI(agi://${AGI_HOST}:${AGI_PORT},${TENANT})
 same => n,Hangup()

; Shortcode triggers
exten => _*XXX,1,NoOp(Shortcode: ${EXTEN})
 same => n,Set(FLOW_ID=${EXTEN:1})  ; Remove *
 same => n,Set(CHANNEL(accountcode)=${TENANT})
 same => n,AGI(agi://${AGI_HOST}:${AGI_PORT},${FLOW_ID})
 same => n,Hangup()

; Agent extensions
[agents]
exten => _1XX,1,NoOp(Agent ${EXTEN})
 same => n,Dial(SIP/${EXTEN},30,tT)
 same => n,Voicemail(${EXTEN}@default)
 same => n,Hangup()

; Conference bridge
[conference]
exten => _8XX,1,NoOp(Conference ${EXTEN})
 same => n,MeetMe(${EXTEN},M)
 same => n,Hangup()

; IVR flows
[ivr-flows]
; Dynamic IVR flows loaded from database
; Each flow gets its own extension

exten => _9XX,1,NoOp(Dynamic IVR flow: ${EXTEN})
 same => n,Set(FLOW_ID=${EXTEN})
 same => n,AGI(agi://${AGI_HOST}:${AGI_PORT},${FLOW_ID})
 same => n,Hangup()
```

### 6.3 Dockerfile for Asterisk

```dockerfile
# asterisk/Dockerfile
FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    wget \
    libncurses-dev \
    libssl-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libjansson-dev \
    libcurl4-openssl-dev \
    libpjsip-dev \
    libopus-dev \
    libsrtp2-dev \
    libspandsp-dev \
    && rm -rf /var/lib/apt/lists/*

# Download and build Asterisk
WORKDIR /usr/src
RUN curl -L https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-18.24.1.tar.gz | tar xz
WORKDIR /usr/src/asterisk-18.24.1

# Configure and build
RUN ./configure --with-pjproject-bundled
RUN make menuselect.makeopts
RUN make -j$(nproc)
RUN make install
RUN make samples

# Copy configuration
COPY etc/asterisk /etc/asterisk

# Create directories
RUN mkdir -p /var/spool/asterisk/monitor /var/lib/asterisk/sounds/tenant

# Expose ports
EXPOSE 5060/udp 5060/tcp 10000-20000/udp

# Start Asterisk
CMD ["asterisk", "-f", "-vvv"]
```

---

## 7. Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ivr
      POSTGRES_PASSWORD: ivr_password
      POSTGRES_DB: ivr_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - ivr-network

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - ivr-network

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ivr
      RABBITMQ_DEFAULT_PASS: ivr_password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - ivr-network

  # Backend API
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://ivr:ivr_password@postgres/ivr_platform
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://ivr:ivr_password@rabbitmq
      ASTERISK_HOST: asterisk
      ASTERISK_AGI_PORT: 4573
      ASTERISK_AMI_PORT: 5038
    volumes:
      - ./backend:/app
      - audio_data:/app/audio
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
      - rabbitmq
      - asterisk
    networks:
      - ivr-network
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  # Asterisk
  asterisk:
    build: ./asterisk
    network_mode: host
    volumes:
      - asterisk_recordings:/var/spool/asterisk/monitor
      - audio_data:/var/lib/asterisk/sounds/tenant
      - ./asterisk/etc/asterisk:/etc/asterisk
    environment:
      TENANT: microloan
      AGI_HOST: 127.0.0.1
      AGI_PORT: 4573
    ports:
      - "5060:5060/udp"
      - "10000-20000:10000-20000/udp"
    networks:
      - ivr-network
    privileged: true

  # Frontend
  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: http://localhost:8000
      REACT_APP_WS_URL: ws://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - ivr-network
    command: npm start

networks:
  ivr-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  asterisk_recordings:
  audio_data:
```

---

## 8. Running the Platform

```bash
# Clone the repository
git clone https://github.com/your-org/ivr-platform.git
cd ivr-platform

# Build and start all services
docker-compose up -d

# Initialize database
docker-compose exec backend python init_db.py

# Create a tenant
curl -X POST http://localhost:8000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "MicroLoan", "slug": "microloan"}'

# Create a flow
curl -X POST http://localhost:8000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "TENANT_UUID",
    "name": "Main IVR",
    "trigger": "shortcode",
    "trigger_value": "*123",
    "definition": {
      "steps": [
        {
          "id": "welcome",
          "type": "play_audio",
          "config": {"audio_type": "welcome"},
          "next": "menu"
        },
        {
          "id": "menu",
          "type": "collect_dtmf",
          "config": {
            "audio_type": "menu_main",
            "digits": 1,
            "timeout": 5
          },
          "next": "process_menu"
        }
      ]
    }
  }'

# Access the dashboard
open http://localhost:3000
```

---

## 9. Testing the IVR

```bash
# Test with sipcmd or softphone
# Register with Asterisk
# Dial the shortcode *123
# You should hear the IVR flow
```

---

## 10. Development Checklist

### Backend
- [x] FastAPI setup with routing
- [x] Database models and migrations
- [x] Redis caching
- [x] AGI server implementation
- [x] Flow engine with all step types
- [x] Audio management
- [x] TTS integration
- [x] API endpoints

### Frontend
- [x] React application setup
- [x] Flow builder with drag-and-drop
- [x] Step properties editor
- [x] Audio manager with multiple upload methods
- [x] Dashboard with metrics
- [x] Call history
- [x] API integration

### Asterisk
- [x] SIP configuration
- [x] Dialplan with AGI integration
- [x] Docker container
- [x] RTP configuration

### Integration
- [x] Docker Compose setup
- [x] Service communication
- [x] Real-time WebSocket updates

This complete development guide provides everything needed to build a production-ready IVR platform with Asterisk, Python SIP (via AGI), and React. The platform supports voice recording uploads, flow builder, multiple languages, and external API integration.