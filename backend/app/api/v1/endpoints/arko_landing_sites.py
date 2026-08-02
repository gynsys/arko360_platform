from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.landing_site import LandingSite, LandingSiteStatus, LandingSitePost
from app.api.v1.endpoints.arko import get_current_arko_admin
from app.core.arko_auth import decode_token
from app.core.logging import logger
from app.core.site_config import get_template_config
from app.core.uploads import ensure_upload_dir, save_upload
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from app.core.security import verify_password, create_access_token

router = APIRouter()


# Schemas for Landing Site
class LandingSiteCreate(BaseModel):
    email: EmailStr
    password: str
    nombre_cliente: str
    telefono: str | None = None
    especialidad: str | None = None
    slug: str
    custom_domain: str | None = None
    template_name: str = "construccion"
    logo_url: str | None = None
    ramo: str | None = None

class LandingSiteUpdate(BaseModel):
    nombre_cliente: str | None = None
    telefono: str | None = None
    especialidad: str | None = None
    custom_domain: str | None = None
    status: LandingSiteStatus | None = None

class LandingSiteResponse(BaseModel):
    id: int
    email: str
    nombre_cliente: str
    telefono: str | None
    especialidad: str | None
    slug: str
    custom_domain: str | None
    template_name: str
    status: LandingSiteStatus

    class Config:
        from_attributes = True

@router.post("/auth/login")
def login_landing_site(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    for Landing Site clients.
    """
    user = db.query(LandingSite).filter(LandingSite.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if user.status != LandingSiteStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(
        data={"sub": user.email, "type": "landing_client", "slug": user.slug}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/", response_model=List[LandingSiteResponse])
def read_landing_sites(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Retrieve all landing sites (templates cloned).
    """
    sites = db.query(LandingSite).offset(skip).limit(limit).all()
    return sites

@router.post("/", response_model=LandingSiteResponse)
def create_landing_site(
    *,
    db: Session = Depends(get_db),
    site_in: LandingSiteCreate,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Clone a template and create a new Landing Site.
    """
    # Check if email exists
    if db.query(LandingSite).filter(LandingSite.email == site_in.email).first():
        logger.error(f"Email {site_in.email} already exists")
        raise HTTPException(
            status_code=400,
            detail="The site with this email already exists in the system.",
        )
    
    # Check if slug exists
    if db.query(LandingSite).filter(LandingSite.slug == site_in.slug).first():
        logger.error(f"Slug {site_in.slug} already exists")
        raise HTTPException(
            status_code=400,
            detail="The slug is already in use.",
        )

    # Note: password hashing should use pwd_context.hash
    # but for simplicity we rely on Arko's hash_password
    from app.core.security import hash_password
    
    # Customize a copy of the template with client-specific information
    customized_config = get_template_config(site_in.template_name)
    customized_config.setdefault("hero", {})
    customized_config.setdefault("global", {})
    
    customized_config["siteName"] = site_in.nombre_cliente
    
    if site_in.especialidad:
        customized_config["hero"]["titleAccent"] = site_in.especialidad
        
    if site_in.ramo:
        customized_config["hero"]["badge"] = site_in.ramo
        
    if site_in.logo_url:
        customized_config["logoUrl"] = site_in.logo_url
        customized_config["global"]["logo"] = site_in.logo_url
        
    if site_in.telefono:
        customized_config["global"]["phone"] = site_in.telefono
    customized_config["global"]["email"] = site_in.email
    
    db_site = LandingSite(
        email=site_in.email,
        password_hash=hash_password(site_in.password),
        nombre_cliente=site_in.nombre_cliente,
        telefono=site_in.telefono,
        especialidad=site_in.especialidad,
        slug=site_in.slug,
        custom_domain=site_in.custom_domain,
        template_name=site_in.template_name,
        site_config=customized_config,
        status=LandingSiteStatus.ACTIVE,
    )
    
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    
    return db_site

@router.delete("/{site_id}", response_model=dict)
def delete_landing_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_admin=Depends(get_current_arko_admin),
) -> Any:
    """
    Delete a landing site.
    """
    site = db.query(LandingSite).filter(LandingSite.id == site_id).first()
    if not site:
        logger.error(f"Landing site {site_id} not found")
        raise HTTPException(status_code=404, detail="Landing site not found")
        
    db.delete(site)
    db.commit()
    return {"message": "Landing site deleted successfully"}

@router.get("/config/{slug}", response_model=dict)
def get_landing_site_config(
    *,
    db: Session = Depends(get_db),
    slug: str,
) -> Any:
    """
    Get site configuration for a cloned landing site by slug.
    This endpoint is used by the frontend to load the correct configuration for each cloned site.
    """
    site = db.query(LandingSite).filter(LandingSite.slug == slug).first()
    if not site:
        logger.error(f"Landing site with slug {slug} not found")
        raise HTTPException(status_code=404, detail="Landing site not found")
    
    # Return the site_config if it exists, otherwise return default construction template
    if site.site_config:
        return site.site_config
    else:
        # Fallback to default construction template if site_config is not set
        return get_template_config(site.template_name)

# --- Dependencia Landing Client ---
oauth2_scheme_landing = OAuth2PasswordBearer(tokenUrl="/api/v1/arko/landing_sites/auth/login")

def get_current_landing_client(
    token: str = Depends(oauth2_scheme_landing),
    db: Session = Depends(get_db)
):
    payload = decode_token(token, expected_type="landing_client", required_claims=("slug",))
    email: str = payload["sub"]
    slug: str = payload["slug"]

    user = db.query(LandingSite).filter(LandingSite.email == email, LandingSite.slug == slug).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != LandingSiteStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user

# --- Endpoints Privados para Clientes de Sitios Clonados ---

@router.get("/me/config")
def get_my_config(current_user: LandingSite = Depends(get_current_landing_client)) -> Any:
    """Get the current landing site's configuration"""
    if current_user.site_config:
        # Include slug in the response
        config_with_slug = dict(current_user.site_config)
        config_with_slug["slug"] = current_user.slug
        return config_with_slug
    
    default_config = get_template_config(current_user.template_name)
    default_config["slug"] = current_user.slug
    return default_config

@router.put("/me/config")
def update_my_config(config_in: dict, db: Session = Depends(get_db), current_user: LandingSite = Depends(get_current_landing_client)) -> Any:
    """Update the current landing site's configuration"""
    current_user.site_config = config_in
    db.commit()
    db.refresh(current_user)
    
    config_with_slug = dict(current_user.site_config)
    config_with_slug["slug"] = current_user.slug
    return config_with_slug

# --- Blog Endpoints para Clientes de Sitios Clonados ---
from typing import Optional

class LandingSitePostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    status: str = "draft"

class LandingSitePostResponse(BaseModel):
    id: int
    landing_site_id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    status: str
    class Config:
        from_attributes = True

@router.get("/me/posts", response_model=List[LandingSitePostResponse])
def get_my_posts(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db),
    current_user: LandingSite = Depends(get_current_landing_client)
) -> Any:
    posts = db.query(LandingSitePost).filter(LandingSitePost.landing_site_id == current_user.id).order_by(LandingSitePost.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.post("/me/posts", response_model=LandingSitePostResponse)
def create_my_post(
    post_in: LandingSitePostCreate,
    db: Session = Depends(get_db),
    current_user: LandingSite = Depends(get_current_landing_client)
) -> Any:
    existing = db.query(LandingSitePost).filter(LandingSitePost.landing_site_id == current_user.id, LandingSitePost.slug == post_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    post = LandingSitePost(
        **post_in.dict(),
        landing_site_id=current_user.id,
        author=current_user.nombre_cliente
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.put("/me/posts/{post_id}", response_model=LandingSitePostResponse)
def update_my_post(
    post_id: int,
    post_in: LandingSitePostCreate,
    db: Session = Depends(get_db),
    current_user: LandingSite = Depends(get_current_landing_client)
) -> Any:
    post = db.query(LandingSitePost).filter(LandingSitePost.id == post_id, LandingSitePost.landing_site_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    for key, value in post_in.dict().items():
        setattr(post, key, value)
    
    db.commit()
    db.refresh(post)
    return post

@router.delete("/me/posts/{post_id}")
def delete_my_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: LandingSite = Depends(get_current_landing_client)
) -> Any:
    post = db.query(LandingSitePost).filter(LandingSitePost.id == post_id, LandingSitePost.landing_site_id == current_user.id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db.delete(post)
    db.commit()
    return {"ok": True}

from fastapi import File, UploadFile

LANDING_DIR = ensure_upload_dir("landings")

@router.post("/me/upload", status_code=status.HTTP_200_OK)
async def upload_my_image(
    file: UploadFile = File(...),
    current_user: LandingSite = Depends(get_current_landing_client)
) -> Any:
    try:
        # Guardar en una carpeta específica para cada landing site
        url_path = save_upload(
            file,
            LANDING_DIR / str(current_user.id),
            prefix=f"landing_{current_user.id}",
        )
        return {"message": "Image uploaded successfully", "image_url": url_path}
    except Exception as e:
        logger.error(f"Error uploading landing image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading image")
