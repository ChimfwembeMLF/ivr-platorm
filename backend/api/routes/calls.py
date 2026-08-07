from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.models import Call
import uuid

router = APIRouter(prefix="/calls", tags=["calls"])

@router.get("/")
async def list_calls(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Call).filter(Call.tenant_id == uuid.UUID(tenant_id)))
    return result.scalars().all()
