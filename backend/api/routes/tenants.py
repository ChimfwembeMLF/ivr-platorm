from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import Tenant

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/")
async def list_tenants(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant))
    return result.scalars().all()


@router.post("/")
async def create_tenant(name: str, db: AsyncSession = Depends(get_db)):
    tenant = Tenant(name=name)
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant
