"""Shared helpers to persist uploaded files under the public uploads directory."""
from datetime import datetime
from pathlib import Path
from typing import Optional
import shutil

from fastapi import UploadFile

from app.core.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()


def ensure_upload_dir(*parts: str) -> Path:
    """Return (creating it if needed) a directory inside the uploads root."""
    directory = UPLOAD_DIR.joinpath(*parts)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def build_upload_filename(prefix: str, original_filename: Optional[str]) -> str:
    """Build a timestamped filename keeping the original extension."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = Path(original_filename).suffix if original_filename else ""
    return f"{prefix}_{timestamp}{extension}"


def save_upload(file: UploadFile, directory: Path, prefix: str) -> str:
    """Persist an uploaded file into `directory` and return its public URL path."""
    directory.mkdir(parents=True, exist_ok=True)
    file_path = directory / build_upload_filename(prefix, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    relative_path = file_path.relative_to(UPLOAD_DIR)
    return f"/uploads/{relative_path.as_posix()}"
