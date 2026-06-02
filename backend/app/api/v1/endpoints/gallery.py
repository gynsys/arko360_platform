"""
Gallery endpoints for managing doctor's gallery images.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Annotated, List
from sqlalchemy import asc

from app.db.base import get_db
from app.db.models.doctor import Doctor
from app.db.models.gallery import GalleryImage
from app.schemas.gallery import (
    GalleryImageCreate,
    GalleryImageUpdate,
    GalleryImageInDB,
    GalleryImagePublic
)
from app.api.v1.endpoints.auth import get_current_user
from app.api.v1.endpoints.uploads import validate_image
from pathlib import Path
from app.core.config import settings

# Gallery directory
GALLERY_DIR = Path(settings.UPLOAD_DIR) / "gallery"
GALLERY_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()

router = APIRouter()


@router.get("/public/{doctor_slug}", response_model=List[GalleryImagePublic])
async def get_public_gallery(
    doctor_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get all active gallery images for a doctor (public endpoint).
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    gallery_images = db.query(GalleryImage).filter(
        GalleryImage.doctor_id == doctor.id,
        GalleryImage.is_active == True
    ).order_by(
        asc(GalleryImage.display_order),
        asc(GalleryImage.created_at)
    ).all()
    
    return gallery_images


@router.post("/upload", response_model=GalleryImageInDB, status_code=status.HTTP_201_CREATED)
async def upload_gallery_image(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    title: str = Form(None),
    description: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a new gallery image.
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
    
    # Save file to gallery directory
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = Path(file.filename).suffix
    filename = f"{current_user.id}_gallery_{timestamp}{file_extension}"
    file_path = GALLERY_DIR / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)
    
    image_url = f"/uploads/gallery/{filename}"
    
    # Get max display_order
    max_order = db.query(GalleryImage).filter(
        GalleryImage.doctor_id == current_user.id
    ).order_by(GalleryImage.display_order.desc()).first()
    
    next_order = (max_order.display_order + 1) if max_order else 0
    
    # Create gallery image record
    db_gallery_image = GalleryImage(
        doctor_id=current_user.id,
        image_url=image_url,
        title=title,
        description=description,
        display_order=next_order
    )
    db.add(db_gallery_image)
    db.commit()
    db.refresh(db_gallery_image)
    
    return db_gallery_image


@router.get("/", response_model=List[GalleryImageInDB])
async def get_my_gallery(
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Get all gallery images for current doctor (authenticated).
    """
    gallery_images = db.query(GalleryImage).filter(
        GalleryImage.doctor_id == current_user.id
    ).order_by(asc(GalleryImage.display_order)).all()
    
    return gallery_images


@router.put("/{gallery_id}", response_model=GalleryImageInDB)
async def update_gallery_image(
    gallery_id: int,
    gallery_update: GalleryImageUpdate,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Update a gallery image (only the doctor who owns it).
    """
    gallery_image = db.query(GalleryImage).filter(
        GalleryImage.id == gallery_id,
        GalleryImage.doctor_id == current_user.id
    ).first()
    
    if not gallery_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gallery image not found"
        )
    
    # Update fields
    update_data = gallery_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(gallery_image, field, value)
    
    db.commit()
    db.refresh(gallery_image)
    
    return gallery_image


@router.get("/{gallery_id}/debug", response_model=dict)
async def debug_gallery_image(
    gallery_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Debug endpoint to check gallery image crop data.
    """
    gallery_image = db.query(GalleryImage).filter(
        GalleryImage.id == gallery_id,
        GalleryImage.doctor_id == current_user.id
    ).first()
    
    if not gallery_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gallery image not found"
        )
    
    return {
        "id": gallery_image.id,
        "crop": gallery_image.crop,
        "title": gallery_image.title,
        "featured": gallery_image.featured
    }

@router.put("/{gallery_id}/image", response_model=GalleryImageInDB)
async def replace_gallery_image(
    gallery_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Replace the image of an existing gallery entry.
    """
    gallery_image = db.query(GalleryImage).filter(
        GalleryImage.id == gallery_id,
        GalleryImage.doctor_id == current_user.id
    ).first()
    
    if not gallery_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gallery image not found"
        )
    
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
    
    # Delete old image file if it exists
    if gallery_image.image_url:
        old_image_path = UPLOAD_DIR / gallery_image.image_url.lstrip('/uploads/')
        if old_image_path.exists():
            try:
                old_image_path.unlink()
            except Exception as e:
                pass
    
    # Save new file
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = Path(file.filename).suffix
    filename = f"{current_user.id}_gallery_{timestamp}{file_extension}"
    file_path = GALLERY_DIR / filename
    
    with open(file_path, "wb") as buffer:
        import shutil
        shutil.copyfileobj(file.file, buffer)
    
    # Update image_url
    gallery_image.image_url = f"/uploads/gallery/{filename}"
    
    db.commit()
    db.refresh(gallery_image)
    
    return gallery_image


@router.delete("/{gallery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    gallery_id: int,
    current_user: Annotated[Doctor, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Delete a gallery image (only the doctor who owns it).
    """
    gallery_image = db.query(GalleryImage).filter(
        GalleryImage.id == gallery_id,
        GalleryImage.doctor_id == current_user.id
    ).first()
    
    if not gallery_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gallery image not found"
        )
    
    db.delete(gallery_image)
    db.commit()
    
    return None

