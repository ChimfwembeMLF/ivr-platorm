import os
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.models import AudioAsset

router = APIRouter(prefix="/audio", tags=["audio"])
UPLOAD_DIR = os.getenv("AUDIO_UPLOAD_DIR", "storage/audio")


@router.get("/")
async def list_audio(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AudioAsset).filter(AudioAsset.tenant_id == uuid.UUID(tenant_id))
    )
    return result.scalars().all()


@router.post("/upload")
async def upload_audio(
    tenant_id: str = Form(...),
    language: str = Form(...),
    type: str = Form(...),
    flow_id: str = Form(None),
    step_id: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    asset = AudioAsset(
        tenant_id=uuid.UUID(tenant_id),
        flow_id=uuid.UUID(flow_id) if flow_id else None,
        step_id=step_id,
        type=type,
        language=language,
        file_path=file_path,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset
