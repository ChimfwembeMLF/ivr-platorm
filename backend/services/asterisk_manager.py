import logging

logger = logging.getLogger(__name__)


class AsteriskManager:
    """
    Helper class for interacting with Asterisk Manager Interface (AMI).
    To be expanded when call origination or advanced AMI features are needed.
    """

    def __init__(self, host, port, username, secret):
        self.host = host
        self.port = port
        self.username = username
        self.secret = secret

    async def connect(self):
        logger.info(f"Connecting to AMI at {self.host}:{self.port}")

    async def originate(self, endpoint: str, extension: str, context: str):
        logger.info(f"Originating call to {endpoint} targeting {context},{extension},1")
