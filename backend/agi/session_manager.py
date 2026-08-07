import json
import uuid
from pydantic import BaseModel, Field
from core.redis_client import get_redis

class CallSession(BaseModel):
    call_id: str
    tenant_id: str | None = None
    flow_id: str | None = None
    variables: dict = Field(default_factory=dict)
    steps_completed: list[str] = Field(default_factory=list)

class SessionManager:
    async def get_session(self, call_id: str) -> CallSession:
        redis = await get_redis()
        data = await redis.get(f"session:{call_id}")
        if data:
            return CallSession.model_validate_json(data)
        return CallSession(call_id=call_id)
        
    async def save_session(self, session: CallSession):
        redis = await get_redis()
        await redis.setex(
            f"session:{session.call_id}",
            3600,
            session.model_dump_json()
        )
