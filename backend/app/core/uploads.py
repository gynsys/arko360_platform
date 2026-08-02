"""
Helpers for safely persisting user-uploaded files.

Uploaded files are served back as static content from /uploads, so the
extension and the size have to be constrained before anything touches disk.
"""
from pathlib import Path
from typing import Iterable
import uuid

from fastapi import HTTPException, UploadFile, status

# SVG is deliberately excluded: it can carry scripts and is served same-origin.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
MEDIA_EXTENSIONS = IMAGE_EXTENSIONS | AUDIO_EXTENSIONS | VIDEO_EXTENSIONS

MAX_UPLOAD_BYTES = 25 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


def validate_extension(filename: str, allowed_extensions: Iterable[str]) -> str:
    """Return the normalized extension of `filename` or reject the upload."""
    extension = Path(filename or "").suffix.lower()
    allowed = {ext.lower() for ext in allowed_extensions}
    if extension not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Permitidos: {', '.join(sorted(allowed))}",
        )
    return extension


def save_upload(
    file: UploadFile,
    destination_dir: Path,
    prefix: str,
    allowed_extensions: Iterable[str],
    max_bytes: int = MAX_UPLOAD_BYTES,
) -> Path:
    """
    Persist `file` under `destination_dir` with a generated, non user-controlled
    name. Raises HTTPException if the extension is not allowed or the file is
    larger than `max_bytes`; partial files are removed on failure.
    """
    extension = validate_extension(file.filename, allowed_extensions)
    destination_dir.mkdir(parents=True, exist_ok=True)
    file_path = destination_dir / f"{prefix}_{uuid.uuid4().hex}{extension}"

    written = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"El archivo excede el tamaño máximo de {max_bytes // (1024 * 1024)} MB.",
                    )
                buffer.write(chunk)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise

    return file_path
