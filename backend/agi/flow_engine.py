import logging

from agi.session_manager import SessionManager
from core.database import AsyncSessionLocal
from services.audio_service import AudioService

logger = logging.getLogger(__name__)


class FlowEngine:
    def __init__(self, agi_channel, session_manager: SessionManager):
        self.agi = agi_channel
        self.session_manager = session_manager

    async def execute(self):
        call_id = self.agi.env.get("agi_channel", "unknown")
        logger.info(f"Executing flow for call: {call_id}")

        # Answer the call
        await self.agi.answer()

        # Load state
        session = await self.session_manager.get_session(call_id)
        tenant_id = session.tenant_id

        if tenant_id:
            async with AsyncSessionLocal() as db:
                audio_path = await AudioService.resolve_audio(
                    db, tenant_id, "welcome", language="en"
                )
                logger.info(f"Resolved audio: {audio_path}")
                # Play audio via AGI
                await self.agi.stream_file(audio_path.replace(".wav", ""))

        session.variables["answered"] = True
        await self.session_manager.save_session(session)

        # Future: Execute dynamic flow logic
        logger.info(f"Call {call_id} successfully answered by IVR Flow Engine.")

        # End call
        await self.agi.hangup()
        logger.info(f"Call {call_id} hung up.")
