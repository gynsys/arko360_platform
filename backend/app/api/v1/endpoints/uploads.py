from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path

from app.db.base import get_db
from app.blog.models import SocialAudio
from app.api.v1.endpoints.arko import get_current_arko_admin as get_current_user
from app.core.config import settings
from app.core.uploads import AUDIO_EXTENSIONS, MEDIA_EXTENSIONS, save_upload

router = APIRouter()

UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
AUDIO_DIR = UPLOAD_DIR / "audios"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR = UPLOAD_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/social-audio", status_code=status.HTTP_201_CREATED)
async def upload_social_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        file_path = save_upload(file, AUDIO_DIR, "audio", AUDIO_EXTENSIONS)

        # Get relative path for URL
        relative_path = file_path.relative_to(UPLOAD_DIR)
        url_path = f"/uploads/{relative_path.as_posix()}"
        
        # Guardar en base de datos
        db_audio = SocialAudio(
            name=file.filename,
            url=url_path,
            admin_id=current_user.id
        )
        db.add(db_audio)
        db.commit()
        db.refresh(db_audio)
        
        # Enviar esquema compatible con SocialAudioResponse (o solo el dict)
        return {
            "id": db_audio.id,
            "name": db_audio.name,
            "url": db_audio.url,
            "created_at": db_audio.created_at,
            "admin_id": db_audio.admin_id
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error uploading social audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading audio")

@router.post("/social-media", status_code=status.HTTP_201_CREATED)
async def upload_social_media(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    try:
        file_path = save_upload(file, MEDIA_DIR, "media", MEDIA_EXTENSIONS)

        # Get relative path for URL
        relative_path = file_path.relative_to(UPLOAD_DIR)
        url_path = f"/uploads/{relative_path.as_posix()}"
        
        return {
            "url": url_path,
            "filename": file_path.name
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error uploading social media: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading media")
