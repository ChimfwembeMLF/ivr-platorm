import asyncio
import logging
from agi.session_manager import SessionManager
from agi.flow_engine import FlowEngine

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class AsyncAGIChannel:
    def __init__(self, reader, writer):
        self.reader = reader
        self.writer = writer
        self.env = {}

    async def read_env(self):
        while True:
            line = await self.reader.readline()
            if not line:
                break
            line = line.decode('utf-8').strip()
            if not line:
                break
            if ':' in line:
                key, value = line.split(':', 1)
                self.env[key.strip()] = value.strip()

    async def send_command(self, command: str) -> str:
        logger.debug(f"AGI TX: {command}")
        self.writer.write(f"{command}\n".encode('utf-8'))
        await self.writer.drain()
        response = await self.reader.readline()
        response_str = response.decode('utf-8').strip()
        logger.debug(f"AGI RX: {response_str}")
        return response_str

    async def answer(self):
        return await self.send_command("ANSWER")

    async def hangup(self):
        return await self.send_command("HANGUP")

class AGIServer:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.session_manager = SessionManager()

    async def handle_client(self, reader, writer):
        channel = AsyncAGIChannel(reader, writer)
        await channel.read_env()
        
        engine = FlowEngine(channel, self.session_manager)
        try:
            await engine.execute()
        except Exception as e:
            logger.error(f"Error executing flow: {e}")
        finally:
            writer.close()
            await writer.wait_closed()

    async def start(self):
        server = await asyncio.start_server(self.handle_client, self.host, self.port)
        logger.info(f"FastAGI Server listening on {self.host}:{self.port}")
        async with server:
            await server.serve_forever()
