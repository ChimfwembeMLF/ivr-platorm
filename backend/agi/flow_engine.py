import logging
from agi.session_manager import SessionManager

logger = logging.getLogger(__name__)

class FlowEngine:
    def __init__(self, agi_channel, session_manager: SessionManager):
        self.agi = agi_channel
        self.session_manager = session_manager

    async def execute(self):
        call_id = self.agi.env.get('agi_channel', 'unknown')
        logger.info(f"Executing flow for call: {call_id}")
        
        # Answer the call
        await self.agi.answer()
        
        # Load state
        session = await self.session_manager.get_session(call_id)
        session.variables['answered'] = True
        await self.session_manager.save_session(session)
        
        # Future: Execute dynamic flow logic
        logger.info(f"Call {call_id} successfully answered by IVR Flow Engine.")
        
        # End call
        await self.agi.hangup()
        logger.info(f"Call {call_id} hung up.")
