import logging

from sqlalchemy.types import TypeDecorator, String, Text
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

logger = logging.getLogger(__name__)

class EncryptedType(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that encrypts data before saving to DB
    and decrypts it when loading.
    """
    impl = Text
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not settings.ENCRYPTION_KEY:
            raise RuntimeError(
                "ENCRYPTION_KEY is not configured; encrypted columns cannot be used. "
                "Generating an ephemeral key would make stored data unreadable after a restart."
            )
        self.key = settings.ENCRYPTION_KEY.encode()
        self.fernet = Fernet(self.key)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, str):
            value = value.encode()
        return self.fernet.encrypt(value).decode('utf-8')

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        try:
            return self.fernet.decrypt(value.encode()).decode('utf-8')
        except InvalidToken:
            # Data predates encryption (migration phase): return it as-is, but make
            # the situation visible instead of failing silently.
            logger.warning("Encrypted column holds a non-encrypted value; returning it verbatim.")
            return value

class EncryptedString(EncryptedType):
    impl = String

class EncryptedText(EncryptedType):
    impl = Text
