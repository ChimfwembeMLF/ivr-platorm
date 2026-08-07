from unittest.mock import AsyncMock, MagicMock

import pytest

from agi.flow_engine import FlowEngine
from agi.session_manager import CallSession, SessionManager


@pytest.mark.asyncio
async def test_flow_engine_execute(monkeypatch):
    mock_agi = AsyncMock()
    mock_agi.env = {"agi_channel": "test-123"}

    mock_session_manager = MagicMock(spec=SessionManager)
    session = CallSession(call_id="test-123")
    mock_session_manager.get_session = AsyncMock(return_value=session)
    mock_session_manager.save_session = AsyncMock()

    # Mock database session and audio service to prevent real DB hits
    mock_audio_service = AsyncMock()
    mock_audio_service.resolve_audio.return_value = "tt-weasels"
    monkeypatch.setattr("services.audio_service.AudioService", mock_audio_service)

    engine = FlowEngine(mock_agi, mock_session_manager)

    await engine.execute()

    mock_agi.answer.assert_awaited_once()
    mock_session_manager.get_session.assert_awaited_once_with("test-123")
    assert session.variables.get("answered") is True
    mock_session_manager.save_session.assert_awaited_once_with(session)
    mock_agi.hangup.assert_awaited_once()
