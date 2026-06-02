from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.db.models.recommendation import Recommendation, RecommendationCategory
from app.db.models.doctor import Doctor
from app.schemas import recommendation as schemas

router = APIRouter()

# --- PUBLIC ENDPOINTS ---

@router.get("/public/{slug}", response_model=List[schemas.Recommendation])
def read_recommendations_public(
    slug: str,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get active recommendations for a doctor by slug.
    Public endpoint.
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check if module is enabled
    # We could check tenant_module here, but frontend usually hides it if not enabled.
    # For security, we can just return empty or proceed.
    
    items = db.query(Recommendation).filter(
        Recommendation.tenant_id == doctor.id,
        Recommendation.is_active == True
    ).order_by(Recommendation.id.desc()).all()
    
    return items

# --- ADMIN ENDPOINTS (PROTECTED) ---

@router.get("/admin", response_model=List[schemas.Recommendation])
def read_my_recommendations(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    """
    Get all recommendations for current doctor (Admin).
    Includes inactive ones.
    """
    return db.query(Recommendation).filter(Recommendation.tenant_id == current_user.id).order_by(Recommendation.id.desc()).all()

@router.post("/", response_model=schemas.Recommendation)
def create_recommendation(
    item_in: schemas.RecommendationCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    """
    Create a new recommendation.
    """
    item = Recommendation(**item_in.dict(), tenant_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=schemas.Recommendation)
def update_recommendation(
    item_id: int,
    item_in: schemas.RecommendationUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    """
    Update a recommendation.
    """
    item = db.query(Recommendation).filter(Recommendation.id == item_id, Recommendation.tenant_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    update_data = item_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_recommendation(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    """
    Delete a recommendation.
    """
    item = db.query(Recommendation).filter(Recommendation.id == item_id, Recommendation.tenant_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    db.delete(item)
    db.commit()
    return {"status": "success"}

# --- CATEGORIES ENDPOINTS ---

@router.get("/categories", response_model=List[schemas.Category])
def read_categories(
    db: Session = Depends(get_db),
    # If this is called by public, we might need slug. 
    # But usually frontend loads categories for the filter based on the items or a separate call.
    # For now, let's assume this is ADMIN mainly, or we add public endpoint later if needed.
    # Actually, the public view needs categories too to show tabs.
    # Let's make this endpoint generic or create a separate public one?
    # For now, let's keep it protected (Admin) and assume public gets categories via a different way or we open it.
    # WAIT: Public frontend needs categories. 
    # Let's add a public endpoint for categories too.
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    """
    Get categories for current user (Admin).
    """
    return db.query(RecommendationCategory).filter(RecommendationCategory.tenant_id == current_user.id).all()

# Adding Public Category Endpoint just in case
@router.get("/categories/public/{slug}", response_model=List[schemas.Category])
def read_categories_public(
    slug: str,
    db: Session = Depends(get_db)
) -> Any:
    doctor = db.query(Doctor).filter(Doctor.slug_url == slug).first()
    if not doctor:
        return []
    return db.query(RecommendationCategory).filter(RecommendationCategory.tenant_id == doctor.id).all()


@router.post("/categories", response_model=schemas.Category)
def create_category(
    cat_in: schemas.CategoryCreate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    cat = RecommendationCategory(**cat_in.dict(), tenant_id=current_user.id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{cat_id}")
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
) -> Any:
    cat = db.query(RecommendationCategory).filter(RecommendationCategory.id == cat_id, RecommendationCategory.tenant_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Items cascade delete or set null?
    # Model has cascade="all, delete-orphan" on items side? No, items has back_populates.
    # RecommendationCategory.items has cascade="all, delete-orphan".
    # So deleting category deletes items. User warned in UI.
    
    db.delete(cat)
    db.commit()
    return {"status": "success"}
