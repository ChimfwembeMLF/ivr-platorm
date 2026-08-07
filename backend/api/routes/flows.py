from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.models import Flow
import uuid

router = APIRouter(prefix="/flows", tags=["flows"])

@router.get("/")
async def list_flows(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Flow).filter(Flow.tenant_id == uuid.UUID(tenant_id)))
    return result.scalars().all()

@router.post("/")
async def create_flow(tenant_id: str, name: str, db: AsyncSession = Depends(get_db)):
    flow = Flow(tenant_id=uuid.UUID(tenant_id), name=name)
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return flow
