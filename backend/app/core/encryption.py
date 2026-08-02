from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    key = settings.ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode('utf-8')
    cipher_suite = Fernet(key)
except Exception as e:
    logger.error(f"Error initializing encryption: {e}", exc_info=True)
    cipher_suite = None

def decrypt_text(text: str) -> str:
    """
    Decrypts text if it is encrypted. Returns the original text when it is not a
    valid ciphertext (legacy plaintext rows), logging the reason.
    """
    if not text:
        return text

    if not cipher_suite:
        raise RuntimeError(
            "Encryption is not initialized (invalid or missing ENCRYPTION_KEY); "
            "cannot decrypt stored values."
        )

    try:
        # Fernet tokens are url-safe base64 strings.
        # A non-token value is assumed to be legacy plaintext.
        decrypted_bytes = cipher_suite.decrypt(text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except InvalidToken:
        logger.warning("Value is not a valid Fernet token; assuming legacy plaintext.")
        return text

def encrypt_text(text: str) -> str:
    """
    Encrypts text. Raises RuntimeError instead of returning plaintext when
    encryption is unavailable or fails, so secrets are never stored in the clear.
    """
    if not text:
        return text

    if not cipher_suite:
        raise RuntimeError(
            "Encryption is not initialized (invalid or missing ENCRYPTION_KEY); "
            "refusing to store the value unencrypted."
        )

    try:
        encrypted_bytes = cipher_suite.encrypt(text.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption error: {e}", exc_info=True)
        raise RuntimeError("Failed to encrypt value.") from e
