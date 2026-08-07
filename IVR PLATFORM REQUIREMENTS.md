# IVR Platform — Refined Requirements (MTN & Twilio Focus)

## 1. Executive Summary

A self-hosted, open-source, multi-tenant voice communications platform providing IVR flows, AI-powered customer interactions, and centralized administration. The platform is designed for production deployment with enterprise-grade reliability, scalability, and multi-tenancy.

**Core Capabilities:**
- Voice IVR with dynamic JSON-based flows
- AI-powered conversations (DeepSeek/Mistral)
- Multi-tenant isolation
- React-based admin dashboard with real-time monitoring
- External system integration (CRM, loan management)
- Fully self-hosted, no vendor lock-in
- **MTN Carrier Integration** (Primary)
- **Twilio Integration** (Secondary/Alternative)

---

## 2. Carrier Integration Specifications

### 2.1 MTN Integration

| Requirement | Specification |
|-------------|---------------|
| **Protocol** | SIP Trunk |
| **Authentication** | IP-based or credentials |
| **Codecs** | G.711 (ulaw/alaw), G.722 |
| **DTMF** | RFC 2833, SIP INFO |
| **Caller ID** | Pass-through or set by tenant |
| **Concurrent Channels** | Up to 100 per SIP trunk |
| **SIP Transport** | UDP/TCP/TLS |
| **Registration** | Static IP or FQDN |

#### MTN SIP Configuration
```ini
# sip.conf - MTN Carrier
[mtn-carrier]
type=peer
host=sip.mtn.co.za
context=from-mtn
dtmfmode=rfc2833
canreinvite=no
qualify=yes
insecure=port,invite
fromuser=USERNAME
fromdomain=sip.mtn.co.za
authname=USERNAME
secret=PASSWORD
transport=udp
disallow=all
allow=ulaw
allow=alaw
nat=force_rport,comedia
externip=YOUR_PUBLIC_IP
localnet=192.168.0.0/16
localnet=10.0.0.0/8

[mtn-tls]
type=peer
host=sip.mtn.co.za
context=from-mtn
dtmfmode=rfc2833
canreinvite=no
qualify=yes
insecure=port,invite
fromuser=USERNAME
fromdomain=sip.mtn.co.za
authname=USERNAME
secret=PASSWORD
transport=tls
tlsclientmethod=tlsv1_2
tlscertfile=/etc/asterisk/keys/mtn.crt
tlscafile=/etc/asterisk/keys/ca.crt
disallow=all
allow=ulaw
allow=alaw
```

### 2.2 Twilio Integration

| Requirement | Specification |
|-------------|---------------|
| **Protocol** | SIP Trunk |
| **Authentication** | Twilio Credentials |
| **Codecs** | G.711 (ulaw/alaw) |
| **DTMF** | RFC 2833 |
| **Number Management** | Twilio Phone Numbers |
| **Recording** | Twilio optional, platform native |
| **Concurrent Calls** | As per Twilio plan |

#### Twilio SIP Configuration
```ini
# sip.conf - Twilio Carrier
[twilio-carrier]
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
transport=udp
disallow=all
allow=ulaw
allow=alaw
nat=force_rport,comedia
externip=YOUR_PUBLIC_IP
localnet=192.168.0.0/16
localnet=10.0.0.0/8

[twilio-tls]
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
transport=tls
disallow=all
allow=ulaw
allow=alaw
```

### 2.3 Dialplan Configuration

```ini
# extensions.conf - Carrier Integration
[globals]
AGI_HOST=127.0.0.1
AGI_PORT=4573

[default]
exten => s,1,NoOp(Default context)
 same => n,Answer()
 same => n,Hangup()

; Incoming from MTN
[from-mtn]
exten => _X.,1,NoOp(Incoming call from MTN: ${CALLERID(num)} to ${EXTEN})
 same => n,Set(TENANT=${CALLERID(num):0:4}) ; Extract tenant from caller ID
 same => n,Goto(tenant-context,s,1)

; Incoming from Twilio
[from-twilio]
exten => _X.,1,NoOp(Incoming call from Twilio: ${CALLERID(num)} to ${EXTEN})
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

; Shortcode triggers (MTN shortcodes)
exten => _*XXX,1,NoOp(Shortcode: ${EXTEN})
 same => n,Set(FLOW_ID=${EXTEN:1})
 same => n,Set(CHANNEL(accountcode)=${TENANT})
 same => n,AGI(agi://${AGI_HOST}:${AGI_PORT},${FLOW_ID})
 same => n,Hangup()

; Outbound calls through MTN
[outbound-mtn]
exten => _X.,1,NoOp(Outbound call to ${EXTEN} via MTN)
 same => n,Dial(SIP/${EXTEN}@mtn-carrier,60,tT)
 same => n,Hangup()

; Outbound calls through Twilio
[outbound-twilio]
exten => _X.,1,NoOp(Outbound call to ${EXTEN} via Twilio)
 same => n,Dial(SIP/${EXTEN}@twilio-carrier,60,tT)
 same => n,Hangup()
```

### 2.4 Carrier Manager

```python
# backend/services/carrier_manager.py
from enum import Enum
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class CarrierType(str, Enum):
    MTN = "mtn"
    TWILIO = "twilio"
    CUSTOM = "custom"

class CarrierManager:
    """Manages carrier integrations"""
    
    def __init__(self):
        self.carriers = {
            CarrierType.MTN: {
                "name": "MTN",
                "sip_context": "mtn-carrier",
                "outbound_context": "outbound-mtn",
                "inbound_context": "from-mtn",
                "supported_codecs": ["ulaw", "alaw", "g722"],
                "concurrent_limit": 100,
                "requires_registration": False,
                "supports_tls": True,
                "supports_shortcode": True,
            },
            CarrierType.TWILIO: {
                "name": "Twilio",
                "sip_context": "twilio-carrier",
                "outbound_context": "outbound-twilio",
                "inbound_context": "from-twilio",
                "supported_codecs": ["ulaw", "alaw"],
                "concurrent_limit": 999,  # Depends on plan
                "requires_registration": True,
                "supports_tls": True,
                "supports_shortcode": False,
            }
        }
    
    async def make_outbound_call(
        self,
        tenant_id: str,
        carrier: CarrierType,
        destination: str,
        caller_id: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make an outbound call through the specified carrier
        """
        carrier_config = self.carriers.get(carrier)
        if not carrier_config:
            raise ValueError(f"Unknown carrier: {carrier}")
        
        # Check concurrent limits
        if not await self.check_concurrent_limit(tenant_id, carrier):
            return {
                "success": False,
                "error": "Concurrent call limit exceeded"
            }
        
        # Build call parameters
        params = {
            "destination": destination,
            "carrier": carrier_config,
            "timeout": 60,
            "caller_id": caller_id or self.get_default_caller_id(tenant_id)
        }
        
        # Route through appropriate carrier context
        response = await self.route_call(params)
        
        return response
    
    async def get_available_carriers(self, tenant_id: str) -> list:
        """
        Get available carriers for a tenant
        """
        tenant_config = await self.get_tenant_carrier_config(tenant_id)
        available = []
        
        for carrier in tenant_config.get("enabled_carriers", []):
            if carrier in self.carriers:
                config = self.carriers[carrier]
                available.append({
                    "type": carrier,
                    "name": config["name"],
                    "supports_tls": config["supports_tls"],
                    "is_active": await self.check_carrier_health(carrier)
                })
        
        return available
    
    async def get_carrier_stats(self, carrier: CarrierType) -> Dict[str, Any]:
        """
        Get carrier statistics and health
        """
        if carrier not in self.carriers:
            return {}
        
        return {
            "active_calls": await self.get_active_calls_by_carrier(carrier),
            "success_rate": await self.get_success_rate(carrier),
            "avg_latency_ms": await self.get_average_latency(carrier),
            "status": await self.check_carrier_health(carrier)
        }
    
    async def failover_carrier(
        self,
        primary_carrier: CarrierType,
        fallback_carrier: CarrierType,
        call_data: Dict
    ) -> Dict[str, Any]:
        """
        Failover to secondary carrier
        """
        logger.warning(f"Failing over from {primary_carrier} to {fallback_carrier}")
        
        # Log the failover event
        await self.log_failover_event(primary_carrier, fallback_carrier, call_data)
        
        # Attempt call through fallback carrier
        return await self.make_outbound_call(
            tenant_id=call_data.get("tenant_id"),
            carrier=fallback_carrier,
            destination=call_data.get("destination"),
            caller_id=call_data.get("caller_id"),
            context=call_data.get("context")
        )
```

### 2.5 Tenant Carrier Configuration

```sql
-- Add carrier configuration to tenants
ALTER TABLE tenants ADD COLUMN carrier_config JSONB DEFAULT '{}'::JSONB;

-- Example tenant carrier configuration
UPDATE tenants SET carrier_config = '
{
  "enabled_carriers": ["mtn", "twilio"],
  "primary_carrier": "mtn",
  "fallback_carrier": "twilio",
  "carrier_settings": {
    "mtn": {
      "username": "mtn_username",
      "password": "encrypted_password",
      "host": "sip.mtn.co.za",
      "concurrent_limit": 50
    },
    "twilio": {
      "account_sid": "ACxxxxxxxx",
      "auth_token": "encrypted_token",
      "concurrent_limit": 100
    }
  },
  "caller_id": "+260970000000",
  "default_carrier": "mtn",
  "carrier_routing": {
    "international": "twilio",
    "local": "mtn",
    "premium": "twilio"
  }
}
' WHERE slug = 'microloan';
```

---

## 3. System Architecture (Refined)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC INTERNET                                    │
│                                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                             │
│  │    MTN      │  │   Twilio    │  │   Clients   │                             │
│  │   Carrier   │  │   Carrier   │  │   (Phone)   │                             │
│  │   (SIP)     │  │   (SIP)     │  │             │                             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                             │
└─────────┼────────────────┼────────────────┼────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TRAEFIK / NGINX                                       │
│                         TLS Termination, Rate Limiting                          │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             APPLICATION LAYER                                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         ASTERISK PBX                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐          │   │
│  │  │  SIP/MTN    │  │   SIP/      │  │      Dialplan        │          │   │
│  │  │  Trunk      │  │   Twilio    │  │   - Inbound routing  │          │   │
│  │  │  :5060/UDP  │  │   :5060/UDP │  │   - Outbound routing │          │   │
│  │  └─────────────┘  └─────────────┘  │   - AGI integration  │          │   │
│  │                                     └──────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│  ┌───────────────────────────┴──────────────────────────────────────────┐      │
│  │                      FLOW ENGINE (Core)                               │      │
│  │  - IVR flow execution     - State management                          │      │
│  │  - Step processing        - Audio control                             │      │
│  │  - AI orchestration       - Multi-tenant isolation                    │      │
│  │  - External API integration (CRM, loan systems)                       │      │
│  └────────────────────────────────────────────────────────────────────┘      │
│                              │                                                  │
│  ┌───────────────────────────┴──────────────────────────────────────────┐      │
│  │                        MESSAGE QUEUE (RabbitMQ)                       │      │
│  │  - AI request distribution      - Async processing                   │      │
│  │  - Reliable message delivery    - Worker coordination                │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                              │                                                  │
│  ┌───────────────────────────┴──────────────────────────────────────────┐      │
│  │                        CACHE LAYER (Redis)                            │      │
│  │  - Session state         - Flow caching                              │      │
│  │  - Rate limiting         - Real-time Pub/Sub                         │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                              │                                                  │
│  ┌───────────────────────────┴──────────────────────────────────────────┐      │
│  │                      DATABASE (PostgreSQL)                            │      │
│  │  - Tenant data    - Flow definitions    - CDR                       │      │
│  │  - Contacts       - Audio metadata      - AI conversations          │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Enhanced Components

### 4.1 Audio Service (Updated)

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
    """Handles audio files with tenant-specific uploads"""
    
    def __init__(self):
        self.audio_path = Path(settings.AUDIO_STORAGE_PATH)
        self.audio_path.mkdir(parents=True, exist_ok=True)
        # Tenant-specific directories
        self.tenant_path = self.audio_path / "tenants"
        self.tenant_path.mkdir(exist_ok=True)
        
        # Language support
        self.supported_languages = ["en", "bem", "nya", "swa"]
    
    async def get_audio_file(
        self,
        tenant_id: str,
        flow_id: str,
        step_id: str,
        audio_type: str,
        language: str = "en"
    ) -> Optional[str]:
        """
        Get audio file with priority:
        1. Tenant-provided (step-specific)
        2. Tenant-provided (flow default)
        3. Tenant-provided (global)
        4. System default
        5. TTS fallback
        """
        
        # Check cache
        cache_key = f"audio:resolve:{tenant_id}:{flow_id}:{step_id}:{audio_type}:{language}"
        cached = await redis_client.get(cache_key)
        if cached:
            return cached.decode()
        
        # Priority resolution
        audio_file = None
        
        # 1. Step-specific
        audio_file = await self.get_step_audio(tenant_id, flow_id, step_id, audio_type, language)
        if audio_file:
            await self._cache_audio_path(cache_key, audio_file)
            return audio_file
        
        # 2. Flow default
        audio_file = await self.get_flow_audio(tenant_id, flow_id, audio_type, language)
        if audio_file:
            await self._cache_audio_path(cache_key, audio_file)
            return audio_file
        
        # 3. Tenant global
        audio_file = await self.get_tenant_audio(tenant_id, audio_type, language)
        if audio_file:
            await self._cache_audio_path(cache_key, audio_file)
            return audio_file
        
        # 4. System default
        audio_file = await self.get_system_audio(audio_type, language)
        if audio_file:
            await self._cache_audio_path(cache_key, audio_file)
            return audio_file
        
        # 5. TTS fallback
        return None
    
    async def get_step_audio(
        self, 
        tenant_id: str, 
        flow_id: str, 
        step_id: str, 
        audio_type: str, 
        language: str
    ) -> Optional[str]:
        """Get step-specific audio (tenant uploaded)"""
        async with get_db() as conn:
            result = await conn.fetchrow("""
                SELECT a.file_path 
                FROM audio_assets a
                INNER JOIN audio_flow_assignments afa ON a.id = afa.audio_asset_id
                WHERE a.tenant_id = $1 
                  AND afa.flow_id = $2 
                  AND afa.step_id = $3
                  AND a.type = $4 
                  AND a.language = $5
                  AND a.status = 'active'
                  AND afa.is_active = true
                ORDER BY afa.priority ASC
                LIMIT 1
            """, tenant_id, flow_id, step_id, audio_type, language)
            
            if result and result['file_path']:
                return result['file_path']
        return None
    
    async def get_flow_audio(
        self, 
        tenant_id: str, 
        flow_id: str, 
        audio_type: str, 
        language: str
    ) -> Optional[str]:
        """Get flow default audio"""
        async with get_db() as conn:
            result = await conn.fetchrow("""
                SELECT a.file_path 
                FROM audio_assets a
                INNER JOIN audio_flow_assignments afa ON a.id = afa.audio_asset_id
                WHERE a.tenant_id = $1 
                  AND afa.flow_id = $2 
                  AND afa.step_id IS NULL
                  AND a.type = $4 
                  AND a.language = $5
                  AND a.status = 'active'
                  AND afa.is_active = true
                ORDER BY afa.priority ASC
                LIMIT 1
            """, tenant_id, flow_id, audio_type, language)
            
            if result and result['file_path']:
                return result['file_path']
        return None
    
    async def upload_tenant_audio(
        self,
        tenant_id: str,
        file_content: bytes,
        filename: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Upload audio file for a tenant"""
        
        # Validate audio format
        validated = await self.validate_audio(file_content, filename)
        if not validated['valid']:
            raise ValueError(validated['error'])
        
        # Generate unique ID
        asset_id = str(uuid.uuid4())
        
        # Create tenant directory
        tenant_dir = self.tenant_path / tenant_id
        tenant_dir.mkdir(exist_ok=True)
        
        # Language subdirectory
        language = metadata.get('language', 'en')
        lang_dir = tenant_dir / language
        lang_dir.mkdir(exist_ok=True)
        
        # Save file
        file_extension = Path(filename).suffix
        new_filename = f"{asset_id}{file_extension}"
        file_path = lang_dir / new_filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Save metadata to database
        async with get_db() as conn:
            await conn.execute("""
                INSERT INTO audio_assets (
                    id, tenant_id, name, file_path, type, 
                    language, duration_seconds, file_size_bytes,
                    format, metadata, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """, 
                asset_id,
                tenant_id,
                metadata.get('name', filename),
                str(file_path),
                metadata.get('type', 'custom'),
                language,
                validated.get('duration_seconds', 0),
                len(file_content),
                validated.get('format', 'wav'),
                json.dumps(metadata),
                'active'
            )
        
        # Clear cache
        await self.clear_audio_cache(tenant_id)
        
        return {
            "id": asset_id,
            "file_path": str(file_path),
            "duration": validated.get('duration_seconds', 0),
            "size_bytes": len(file_content)
        }
    
    async def validate_audio(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Validate audio file"""
        # Check file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:
            return {"valid": False, "error": "File too large (max 10MB)"}
        
        # Check format
        import wave
        import io
        
        try:
            with wave.open(io.BytesIO(file_content), 'rb') as wav:
                params = wav.getparams()
                duration = params.nframes / params.framerate
                
                return {
                    "valid": True,
                    "duration_seconds": duration,
                    "format": "wav",
                    "channels": params.nchannels,
                    "sample_rate": params.framerate,
                    "bit_depth": params.sampwidth * 8
                }
        except:
            return {"valid": False, "error": "Invalid audio format (WAV required)"}
    
    async def _cache_audio_path(self, cache_key: str, file_path: str):
        """Cache audio file path"""
        await redis_client.setex(cache_key, 3600, file_path)
    
    async def clear_audio_cache(self, tenant_id: str):
        """Clear audio cache for a tenant"""
        pattern = f"audio:resolve:{tenant_id}:*"
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
```

### 4.2 Audio Flow Assignments Table

```sql
-- Audio flow assignments (enhanced)
CREATE TABLE audio_flow_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_asset_id UUID NOT NULL REFERENCES audio_assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    flow_id UUID REFERENCES flows(id),
    step_id VARCHAR(50),  -- Null for flow-level assignments
    
    -- Assignment configuration
    assignment_type VARCHAR(20) DEFAULT 'manual', -- manual, auto, conditional
    priority INTEGER DEFAULT 2,  -- 1=highest (step-level), 2=medium (flow), 3=lowest (tenant)
    
    -- Conditions for conditional assignments
    conditions JSONB DEFAULT '{}'::JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(audio_asset_id, flow_id, step_id)
);

-- Indexes
CREATE INDEX idx_audio_flow_assignments_tenant ON audio_flow_assignments(tenant_id);
CREATE INDEX idx_audio_flow_assignments_flow ON audio_flow_assignments(flow_id);
CREATE INDEX idx_audio_flow_assignments_audio ON audio_flow_assignments(audio_asset_id);
CREATE INDEX idx_audio_flow_assignments_step ON audio_flow_assignments(step_id) WHERE step_id IS NOT NULL;
```

---

## 5. Docker Compose (Updated)

```yaml
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
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - ivr-network
    deploy:
      resources:
        limits:
          memory: 2G

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - ivr-network
    deploy:
      resources:
        limits:
          memory: 2.5G

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
      MTN_SIP_HOST: sip.mtn.co.za
      TWILIO_SIP_HOST: sip.twilio.com
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
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 2G

  # Asterisk
  asterisk:
    build: ./asterisk
    network_mode: host
    volumes:
      - asterisk_recordings:/var/spool/asterisk/monitor
      - audio_data:/var/lib/asterisk/sounds/tenant
      - ./asterisk/etc/asterisk:/etc/asterisk
      - ./asterisk/keys:/etc/asterisk/keys  # TLS certificates
    environment:
      TENANT: microloan
      AGI_HOST: 127.0.0.1
      AGI_PORT: 4573
      MTN_USERNAME: ${MTN_USERNAME}
      MTN_PASSWORD: ${MTN_PASSWORD}
      TWILIO_USER: ${TWILIO_USER}
      TWILIO_SECRET: ${TWILIO_SECRET}
    ports:
      - "5060:5060/udp"
      - "5060:5060/tcp"
      - "5061:5061/tcp"  # TLS
      - "10000-20000:10000-20000/udp"
    networks:
      - ivr-network
    privileged: true
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # AI Worker
  ai-worker:
    build: ./ai-worker
    environment:
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://ivr:ivr_password@rabbitmq
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      MISTRAL_API_KEY: ${MISTRAL_API_KEY}
    depends_on:
      - redis
      - rabbitmq
    networks:
      - ivr-network
    deploy:
      replicas: 2

  # Frontend
  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: http://localhost:8000
      REACT_APP_WS_URL: ws://localhost:8000
      REACT_APP_CARRIERS: mtn,twilio
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

  # Traefik (Reverse Proxy)
  traefik:
    image: traefik:v2.11
    restart: always
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.address=:80"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@ivr-platform.com"
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - traefik_data:/letsencrypt
    networks:
      - ivr-network
    deploy:
      resources:
        limits:
          memory: 512M

networks:
  ivr-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  asterisk_recordings:
  audio_data:
  traefik_data:
```

---

## 6. Environment Variables

```env
# Database
DB_PASSWORD=secure_password

# Redis
REDIS_PASSWORD=

# RabbitMQ
RABBITMQ_PASSWORD=secure_password

# AI
DEEPSEEK_API_KEY=sk-...
MISTRAL_API_KEY=...

# MTN Carrier
MTN_USERNAME=mtn_username
MTN_PASSWORD=mtn_password
MTN_SIP_HOST=sip.mtn.co.za
MTN_IP_ADDRESS=192.168.1.100

# Twilio Carrier
TWILIO_USER=your_twilio_user
TWILIO_SECRET=your_twilio_secret
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx

# Default Tenant
DEFAULT_TENANT=microloan

# Dashboard
DASHBOARD_SECRET=secret_key
JWT_SECRET=jwt_secret_key

# Feature Flags
ENABLE_MTN=true
ENABLE_TWILIO=true
ENABLE_TTS=true
ENABLE_AI=true
```

---

## 7. React Dashboard - Carrier Integration UI

```tsx
// frontend/src/components/CarrierManager/CarrierManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Alert,
  LinearProgress,
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
} from '@mui/material';
import {
  Phone,
  Signal,
  CheckCircle,
  Cancel,
  Refresh,
  Settings,
  Speed,
} from '@mui/icons-material';

interface CarrierStatus {
  type: string;
  name: string;
  status: 'connected' | 'disconnected' | 'degraded';
  active_calls: number;
  concurrent_limit: number;
  success_rate: number;
  avg_latency_ms: number;
  is_primary: boolean;
}

const CarrierManager: React.FC = () => {
  const [carriers, setCarriers] = useState<CarrierStatus[]>([]);
  const [primaryCarrier, setPrimaryCarrier] = useState('mtn');
  const [isLoading, setIsLoading] = useState(false);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);

  useEffect(() => {
    loadCarrierStatus();
    const interval = setInterval(loadCarrierStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadCarrierStatus = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/carriers/status');
      setCarriers(response.data);
    } catch (error) {
      console.error('Failed to load carrier status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCarrier = async (carrierType: string) => {
    try {
      await api.post('/carriers/switch', { carrier: carrierType });
      setPrimaryCarrier(carrierType);
      await loadCarrierStatus();
    } catch (error) {
      console.error('Failed to switch carrier:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />;
      case 'disconnected':
        return <Cancel color="error" />;
      case 'degraded':
        return <Signal color="warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'degraded':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Carrier Management</Typography>
        <Button
          startIcon={<Refresh />}
          onClick={loadCarrierStatus}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {carriers.map((carrier) => (
          <Grid item xs={12} md={6} key={carrier.type}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="h6">{carrier.name}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(carrier.status)}
                      <Chip
                        label={carrier.status.toUpperCase()}
                        color={getStatusColor(carrier.status)}
                        size="small"
                      />
                      {carrier.is_primary && (
                        <Chip label="PRIMARY" color="primary" size="small" />
                      )}
                    </Box>
                  </Box>
                  <Button
                    variant={carrier.is_primary ? 'contained' : 'outlined'}
                    color={carrier.is_primary ? 'primary' : 'inherit'}
                    onClick={() => handleSwitchCarrier(carrier.type)}
                    disabled={carrier.is_primary}
                    size="small"
                  >
                    {carrier.is_primary ? 'Active' : 'Switch'}
                  </Button>
                </Box>

                <Box mt={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Active Calls
                      </Typography>
                      <Typography variant="h6">
                        {carrier.active_calls} / {carrier.concurrent_limit}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Success Rate
                      </Typography>
                      <Typography variant="h6">
                        {carrier.success_rate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Avg Latency
                      </Typography>
                      <Typography variant="h6">
                        {carrier.avg_latency_ms}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        TLS
                      </Typography>
                      <Typography variant="h6">
                        {carrier.supports_tls ? 'Enabled' : 'Disabled'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box mt={2}>
                  <LinearProgress
                    variant="determinate"
                    value={(carrier.active_calls / carrier.concurrent_limit) * 100}
                    color={carrier.active_calls / carrier.concurrent_limit > 0.8 ? 'warning' : 'primary'}
                  />
                </Box>

                <Box mt={2}>
                  <Button
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => {
                      setSelectedCarrier(carrier.type);
                      setOpenConfigDialog(true);
                    }}
                  >
                    Configure
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Carrier Configuration Dialog */}
      <Dialog
        open={openConfigDialog}
        onClose={() => setOpenConfigDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure {selectedCarrier?.toUpperCase()} Carrier
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SIP Host"
                value="sip.mtn.co.za"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Username"
                value="mtn_username"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value="••••••••"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable TLS"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Enable Failover"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Test connection to {selectedCarrier?.toUpperCase()} carrier.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfigDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenConfigDialog(false)}>
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

---

## 8. Carrier Routing Rules

```python
# backend/services/carrier_routing.py
from typing import Dict, Optional
from enum import Enum

class RoutingRuleType(str, Enum):
    DESTINATION = "destination"  # By destination number
    CALLER = "caller"  # By caller ID
    TENANT = "tenant"  # By tenant
    CAPACITY = "capacity"  # By available capacity

class CarrierRouter:
    """Intelligent carrier routing"""
    
    def __init__(self):
        self.rules = {
            "mtn": {
                "destinations": ["+260", "+27", "+25"],  # Southern Africa
                "preference": 1,
                "max_calls": 50,
                "cost_per_minute": 0.02,
                "quality_score": 98
            },
            "twilio": {
                "destinations": ["+1", "+44", "+61"],  # US, UK, Australia
                "preference": 2,
                "max_calls": 100,
                "cost_per_minute": 0.03,
                "quality_score": 97
            }
        }
    
    async def route_call(
        self,
        destination: str,
        caller_id: Optional[str] = None,
        tenant_id: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Route call to the best carrier based on rules
        """
        # 1. Check if tenant has specific carrier preference
        tenant_preference = await self.get_tenant_preference(tenant_id)
        if tenant_preference and self.is_carrier_available(tenant_preference):
            return self.get_carrier_info(tenant_preference)
        
        # 2. Route by destination
        for carrier, config in self.rules.items():
            if self.matches_destination(destination, config['destinations']):
                if self.is_carrier_available(carrier):
                    return self.get_carrier_info(carrier)
        
        # 3. Route by cost (cheapest available)
        available = self.get_available_carriers()
        if available:
            best = min(available, key=lambda c: self.rules[c]['cost_per_minute'])
            return self.get_carrier_info(best)
        
        # 4. Default to MTN
        return self.get_carrier_info("mtn")
    
    def matches_destination(self, destination: str, prefixes: list) -> bool:
        """Check if destination matches any prefix"""
        for prefix in prefixes:
            if destination.startswith(prefix):
                return True
        return False
    
    def is_carrier_available(self, carrier: str) -> bool:
        """Check if carrier is available for use"""
        config = self.rules.get(carrier)
        if not config:
            return False
        
        # Check if under max calls
        current_calls = self.get_active_calls(carrier)
        if current_calls >= config['max_calls']:
            return False
        
        # Check health
        if not self.is_carrier_healthy(carrier):
            return False
        
        return True
```

---

## 9. Production Readiness Checklist (Refined)

### 9.1 Carrier Integration
- [ ] MTN SIP trunk configured and tested
- [ ] Twilio SIP trunk configured and tested
- [ ] TLS enabled for both carriers
- [ ] Failover tested (MTN → Twilio)
- [ ] Concurrent call limits configured
- [ ] Caller ID configuration
- [ ] International routing rules
- [ ] Carrier health monitoring
- [ ] Billing integration setup

### 9.2 Performance
- [ ] Load test: 100 concurrent calls per carrier
- [ ] Carrier failover test (< 5s)
- [ ] Latency monitoring (< 200ms)
- [ ] Jitter buffer configuration
- [ ] Codec negotiation testing

### 9.3 Security
- [ ] TLS 1.2+ for SIP trunks
- [ ] IP whitelisting for carriers
- [ ] API key rotation
- [ ] Audit logging
- [ ] Rate limiting per carrier

### 9.4 Monitoring
- [ ] Carrier uptime monitoring
- [ ] Call quality metrics (MOS)
- [ ] Carrier cost tracking
- [ ] Alerting for carrier failures

---

## 10. Cost Estimate (Refined)

| Item | Monthly Cost |
|------|-------------|
| VPS (4 CPU, 8 GB RAM) | ~$40 |
| VPS (8 CPU, 16 GB RAM - for 100 concurrent) | ~$80 |
| MTN SIP Trunk (per channel) | ~$15/channel |
| Twilio SIP Trunk | ~$20/month + usage |
| DeepSeek API (~10K calls) | ~$5 |
| Phone numbers/Shortcodes | ~$20 |
| Domain | ~$1 |
| **Total** | **~$106 + carrier costs** |

---

## 11. Key Differences from Original

| Feature | Original | Refined |
|---------|----------|---------|
| **Carrier Focus** | Africa's Talking | MTN, Twilio |
| **SIP Trunk** | Generic | MTN-specific + Twilio |
| **TLS Support** | Optional | Required for both |
| **Failover** | Not specified | MTN → Twilio |
| **Routing** | Simple | Intelligent destination-based |
| **Shortcodes** | Generic | MTN shortcode support |
| **Monitoring** | Basic | Carrier health metrics |

This refined version removes Africa's Talking and focuses specifically on MTN and Twilio carrier integrations, with proper TLS support, failover mechanisms, and intelligent routing.