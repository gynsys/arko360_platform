"""Unit tests for app.core.encryption and the encrypted SQLAlchemy column types."""
import importlib

import pytest
from cryptography.fernet import Fernet

from app.core import encryption
from app.core.security_fields import EncryptedString, EncryptedText, EncryptedType


@pytest.fixture
def cipher_module(monkeypatch):
    """Reload the encryption module with a valid, known Fernet key."""
    monkeypatch.setattr(encryption.settings, "ENCRYPTION_KEY", Fernet.generate_key().decode())
    module = importlib.reload(encryption)
    yield module
    importlib.reload(encryption)


def test_encrypt_then_decrypt_roundtrip(cipher_module):
    token = cipher_module.encrypt_text("api-key-123")

    assert token != "api-key-123"
    assert cipher_module.decrypt_text(token) == "api-key-123"


def test_encrypt_is_non_deterministic(cipher_module):
    assert cipher_module.encrypt_text("same") != cipher_module.encrypt_text("same")


@pytest.mark.parametrize("value", ["", None])
def test_empty_values_pass_through(cipher_module, value):
    assert cipher_module.encrypt_text(value) == value
    assert cipher_module.decrypt_text(value) == value


def test_decrypt_returns_plaintext_when_value_is_not_encrypted(cipher_module):
    assert cipher_module.decrypt_text("plain text") == "plain text"


def test_decrypt_returns_input_when_key_does_not_match(cipher_module):
    foreign_token = Fernet(Fernet.generate_key()).encrypt(b"secret").decode()

    assert cipher_module.decrypt_text(foreign_token) == foreign_token


def test_functions_are_noops_without_a_cipher_suite(monkeypatch):
    monkeypatch.setattr(encryption, "cipher_suite", None)

    assert encryption.encrypt_text("value") == "value"
    assert encryption.decrypt_text("value") == "value"


def test_encrypt_text_returns_input_on_cipher_error(monkeypatch, cipher_module):
    class Broken:
        def encrypt(self, _value):
            raise RuntimeError("boom")

    monkeypatch.setattr(cipher_module, "cipher_suite", Broken())

    assert cipher_module.encrypt_text("value") == "value"


def test_encrypted_type_bind_and_result_roundtrip():
    column = EncryptedType()
    stored = column.process_bind_param("confidential", dialect=None)

    assert stored != "confidential"
    assert column.process_result_value(stored, dialect=None) == "confidential"


def test_encrypted_type_handles_none_and_legacy_plaintext():
    column = EncryptedType()

    assert column.process_bind_param(None, dialect=None) is None
    assert column.process_result_value(None, dialect=None) is None
    assert column.process_result_value("legacy-plaintext", dialect=None) == "legacy-plaintext"


def test_encrypted_type_accepts_bytes_input():
    column = EncryptedType()
    stored = column.process_bind_param(b"raw-bytes", dialect=None)

    assert column.process_result_value(stored, dialect=None) == "raw-bytes"


@pytest.mark.parametrize("column_cls", [EncryptedString, EncryptedText])
def test_encrypted_column_subclasses_roundtrip(column_cls):
    column = column_cls()
    stored = column.process_bind_param("value", dialect=None)

    assert column.process_result_value(stored, dialect=None) == "value"
