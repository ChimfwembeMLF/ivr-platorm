import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.models import AudioAsset


class AudioService:
    @staticmethod
    async def resolve_audio(
        db: AsyncSession,
        tenant_id: str,
        audio_type: str,
        language: str = None,
        flow_id: str = None,
        step_id: str = None,
    ) -> str:
        # Fallback hierarchy: Step -> Flow -> Tenant
        query = select(AudioAsset).filter(
            AudioAsset.tenant_id == uuid.UUID(tenant_id), AudioAsset.type == audio_type
        )
        if language:
            query = query.filter(AudioAsset.language == language)

        assets = (await db.execute(query)).scalars().all()

        # 1. Step Specific
        if step_id and flow_id:
            for a in assets:
                if a.step_id == step_id and str(a.flow_id) == flow_id:
                    return a.file_path

        # 2. Flow Specific
        if flow_id:
            for a in assets:
                if str(a.flow_id) == flow_id and a.step_id is None:
                    return a.file_path

        # 3. Tenant Specific
        for a in assets:
            if a.flow_id is None and a.step_id is None:
                return a.file_path

        # 4. Fallback (system default)
        return "tt-weasels"
