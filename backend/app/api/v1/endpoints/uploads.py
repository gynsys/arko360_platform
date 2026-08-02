from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.blog.models import SocialAudio
from app.api.v1.endpoints.arko import get_current_arko_admin as get_current_user
from app.core.logging import logger
from app.core.uploads import ensure_upload_dir, save_upload

router = APIRouter()

AUDIO_DIR = ensure_upload_dir("audios")
MEDIA_DIR = ensure_upload_dir("media")

@router.post("/social-audio", status_code=status.HTTP_201_CREATED)
async def upload_social_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        url_path = save_upload(file, AUDIO_DIR, prefix="audio")

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
    except Exception as e:
        logger.error(f"Error uploading social audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading audio")

@router.post("/social-media", status_code=status.HTTP_201_CREATED)
async def upload_social_media(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    try:
        url_path = save_upload(file, MEDIA_DIR, prefix="media")

        return {
            "url": url_path,
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Error uploading social media: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading media")
