"""
File upload endpoints for doctor logos and photos.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Annotated
import os
import shutil
from pathlib import Path
from datetime import datetime

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
LOGO_DIR = UPLOAD_DIR / "logos"
PHOTO_DIR = UPLOAD_DIR / "photos"
GALLERY_DIR = UPLOAD_DIR / "gallery"
TESTIMONIAL_DIR = UPLOAD_DIR / "testimonials"
BLOG_DIR = UPLOAD_DIR / "blog"
SERVICES_DIR = UPLOAD_DIR / "services"
SIGNATURE_DIR = UPLOAD_DIR / "signatures"
VIDEO_DIR = UPLOAD_DIR / "videos"
CAMPAIGN_DIR = UPLOAD_DIR / "campaigns"
LOGO_DIR.mkdir(exist_ok=True)
PHOTO_DIR.mkdir(exist_ok=True)
GALLERY_DIR.mkdir(exist_ok=True)
TESTIMONIAL_DIR.mkdir(exist_ok=True)
BLOG_DIR.mkdir(exist_ok=True)
SERVICES_DIR.mkdir(exist_ok=True)
SIGNATURE_DIR.mkdir(exist_ok=True)
VIDEO_DIR.mkdir(exist_ok=True)
CAMPAIGN_DIR.mkdir(exist_ok=True)


ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mov", "video/quicktime"]


def validate_image(file: UploadFile) -> bool:
    """Validate that the uploaded file is an image."""
    return file.content_type in ALLOWED_IMAGE_TYPES


def save_uploaded_file(file: UploadFile, directory: Path, doctor_id: int, file_type: str) -> str:
    """
    Save uploaded file and return the relative URL.
    
    Args:
        file: Uploaded file
        directory: Directory to save the file (e.g., UPLOAD_DIR / "testimonials")
        doctor_id: ID of the doctor
        file_type: Type of file (logo, photo, or testimonial)
        
    Returns:
        Relative URL path to the saved file (e.g., "/uploads/testimonials/filename.jpg")
    """
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = Path(file.filename).suffix
    filename = f"{doctor_id}_{file_type}_{timestamp}{file_extension}"
    file_path = directory / filename
    
    # Ensure directory exists
    directory.mkdir(parents=True, exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Verify file was saved
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save file"
        )
    
    # Get the relative path from UPLOAD_DIR
    # file_path is absolute, UPLOAD_DIR is absolute, so relative_to should work
    try:
        relative_path = file_path.relative_to(UPLOAD_DIR)
        url_path = f"/uploads/{relative_path.as_posix()}"
        # Debug log
        pass
        return url_path
    except ValueError:
        # Fallback: construct path manually based on directory name
        dir_name = directory.name  # "testimonials", "logos", "photos", etc.
        url_path = f"/uploads/{dir_name}/{filename}"
        pass
        return url_path


@router.post("/logo", status_code=status.HTTP_200_OK)
async def upload_logo(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload doctor logo.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    logo_url = save_uploaded_file(file, LOGO_DIR, current_user.id, "logo")
    
    # Update doctor record
    current_user.logo_url = logo_url
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Logo uploaded successfully",
        "logo_url": logo_url
    }


@router.post("/photo", status_code=status.HTTP_200_OK)
async def upload_photo(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload doctor profile photo.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    photo_url = save_uploaded_file(file, PHOTO_DIR, current_user.id, "photo")
    
    # Update doctor record
    current_user.photo_url = photo_url
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Photo uploaded successfully",
        "photo_url": photo_url
    }


@router.post("/video", status_code=status.HTTP_200_OK)
async def upload_video(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload marketing video for online consultations.
    """
    # Validate video type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only MP4, WebM, and MOV videos are allowed."
        )
    
    # Check file size (50MB for videos)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
    if file_size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is 50MB"
        )
    
    # Save file
    video_url = save_uploaded_file(file, VIDEO_DIR, current_user.id, "video")
    
    return {
        "message": "Video uploaded successfully",
        "video_url": video_url
    }


@router.post("/social-audio", status_code=status.HTTP_201_CREATED)
async def upload_social_audio(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an audio file for social media content.
    Saves the file and creates a record in the database.
    """
    ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/x-m4a", "audio/x-mpeg", "audio/x-mp3"]
    ALLOWED_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".mpeg"]
    
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    is_allowed_mime = file.content_type in ALLOWED_AUDIO_TYPES
    is_allowed_ext = file_ext in ALLOWED_EXTENSIONS
    
    if not (is_allowed_mime or is_allowed_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type ({file.content_type}). Only MP3, WAV, OGG, and M4A audios are allowed."
        )
    
    # Check file size (10MB for audio)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    MAX_AUDIO_SIZE = 10 * 1024 * 1024
    if file_size > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB"
        )
    
    # Save file
    # Ensure a directory for social audios exists
    SOCIAL_AUDIO_DIR = UPLOAD_DIR / "social_audios"
    SOCIAL_AUDIO_DIR.mkdir(exist_ok=True)
    
    audio_url = save_uploaded_file(file, SOCIAL_AUDIO_DIR, current_user.id, "social_audio")
    
    # Create record in database
    from app.blog import crud, schemas
    audio_data = schemas.SocialAudioCreate(
        name=file.filename,
        url=audio_url
    )
    db_audio = crud.create_social_audio(db=db, audio=audio_data, doctor_id=current_user.id)
    
    return {
        "message": "Audio uploaded successfully",
        "audio": db_audio
    }


@router.post("/location-photo", status_code=status.HTTP_200_OK)
async def upload_location_photo(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload location photo.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    # We reuse PHOTO_DIR or create a new one. Let's use PHOTO_DIR for now but without updating the user profile.
    # Or better, create a LOCATION_DIR.
    # For simplicity and to match existing patterns, let's just save it to PHOTO_DIR but NOT update the user.
    # Actually, let's use a specific prefix or just rely on the filename.
    
    photo_url = save_uploaded_file(file, PHOTO_DIR, current_user.id, "location")
    
    # DO NOT update doctor record
    
    return {
        "message": "Location photo uploaded successfully",
        "photo_url": photo_url
    }


@router.post("/testimonial-photo", status_code=status.HTTP_200_OK)
async def upload_testimonial_photo(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload testimonial patient photo.
    Returns the URL to be used when updating a testimonial.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    photo_url = save_uploaded_file(file, TESTIMONIAL_DIR, current_user.id, "testimonial")
    
    return {
        "message": "Testimonial photo uploaded successfully",
        "photo_url": photo_url
    }


@router.post("/blog-cover", status_code=status.HTTP_200_OK)
async def upload_blog_cover(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload blog post cover image.
    Returns the URL to be used when creating/updating a blog post.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    cover_url = save_uploaded_file(file, BLOG_DIR, current_user.id, "blog_cover")
    
    return {
        "message": "Blog cover image uploaded successfully",
        "cover_url": cover_url,
        "image_url": cover_url
    }


@router.post("/service-image", status_code=status.HTTP_200_OK)
async def upload_service_image(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload service image.
    Returns the URL to be used when creating/updating a service.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    image_url = save_uploaded_file(file, SERVICES_DIR, current_user.id, "service")
    
    return {
        "message": "Service image uploaded successfully",
        "image_url": image_url
    }


@router.post("/recommendation-image", status_code=status.HTTP_200_OK)
async def upload_recommendation_image(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload recommendation product image.
    Returns the URL to be used when creating/updating a recommendation.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file to services directory (reuse for recommendations)
    image_url = save_uploaded_file(file, SERVICES_DIR, current_user.id, "recommendation")
    
    return {
        "message": "Recommendation image uploaded successfully",
        "image_url": image_url
    }



@router.post("/certification-logo", status_code=status.HTTP_200_OK)
async def upload_certification_logo(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload certification logo.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    logo_url = save_uploaded_file(file, LOGO_DIR, current_user.id, "cert")
    
    return {
        "message": "Certification logo uploaded successfully",
        "logo_url": logo_url,
        "image_url": logo_url
    }


@router.post("/signature", status_code=status.HTTP_200_OK)
async def upload_signature(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload doctor signature.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    signature_url = save_uploaded_file(file, SIGNATURE_DIR, current_user.id, "signature")
    
    return {
        "message": "Signature uploaded successfully",
        "signature_url": signature_url
    }


@router.post("/campaign-image", status_code=status.HTTP_200_OK)
async def upload_campaign_image(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an image for a diffusion campaign.
    Returns the URL to be used in the campaign HTML content.
    """
    if not validate_image(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Save file
    image_url = save_uploaded_file(file, CAMPAIGN_DIR, current_user.id, "campaign")
    
    return {
        "message": "Campaign image uploaded successfully",
        "image_url": image_url
    }


