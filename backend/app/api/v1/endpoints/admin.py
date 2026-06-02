"""
Admin API endpoints for managing tenants, plans, modules, and LLM providers.
"""
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.crud.admin import (
    get_tenant, get_tenants, create_tenant, update_tenant, update_tenant_status, delete_tenant,
    get_plan, get_plans, create_plan, update_plan, delete_plan,
    get_module, get_modules, create_module, update_module, delete_module,
    get_enabled_tenant_modules, update_tenant_modules,
    get_tenant_by_email, get_tenant_by_slug, get_module_by_code
)
from app.schemas.admin import (
    Tenant, TenantCreate, TenantUpdate, TenantStatusUpdate, TenantWithModules,
    Plan, PlanCreate, PlanUpdate,
    Module, ModuleCreate, ModuleUpdate,
    TenantModuleUpdate
)

from app.api.v1.endpoints.auth import get_current_admin_user
from app.db.models.doctor import Doctor

router = APIRouter(prefix="/admin", tags=["admin"])


# Tenant endpoints
@router.get("/tenants", response_model=List[Tenant])
def read_tenants(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    plan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get all tenants with optional filtering.
    """
    tenants = get_tenants(db, skip=skip, limit=limit, status=status, plan_id=plan_id)
    return tenants


@router.post("/tenants", response_model=Tenant, status_code=status.HTTP_201_CREATED)
def create_new_tenant(
    tenant: TenantCreate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Create a new tenant.
    """
    # Check if tenant with this email or slug already exists
    db_tenant_email = get_tenant_by_email(db, email=tenant.email)
    if db_tenant_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    db_tenant_slug = get_tenant_by_slug(db, slug=tenant.slug)
    if db_tenant_slug:
        raise HTTPException(status_code=400, detail="Slug already taken")

    return create_tenant(db, tenant)


@router.get("/tenants/{tenant_id}", response_model=TenantWithModules)
def read_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get a specific tenant with their enabled modules.
    """
    db_tenant = get_tenant(db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get enabled modules for this tenant
    enabled_modules = get_enabled_tenant_modules(db, tenant_id)

    # Convert to response model
    tenant_data = TenantWithModules.model_validate(db_tenant)
    tenant_data.enabled_modules = enabled_modules

    return tenant_data


@router.put("/tenants/{tenant_id}", response_model=Tenant)
def update_existing_tenant(
    tenant_id: int,
    tenant_update: TenantUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Update a tenant.
    """
    db_tenant = update_tenant(db, tenant_id=tenant_id, tenant_update=tenant_update)
    if db_tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return db_tenant


@router.patch("/tenants/{tenant_id}/status", response_model=Tenant)
def update_tenant_status_endpoint(
    tenant_id: int,
    status_update: TenantStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Update tenant status (active, paused, suspended).
    
    When a tenant is activated, their email is automatically added to OAuth whitelist.
    """
    # Validate status
    valid_statuses = ["active", "paused", "suspended", "pending", "approved"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    # Check previous status to send email on transition
    db_tenant = get_tenant(db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    old_status = db_tenant.status

    db_tenant = update_tenant_status(db, tenant_id=tenant_id, status_update=status_update)
    
    # Auto-whitelist OAuth when tenant is activated or approved
    if status_update.status in ["active", "approved"] and db_tenant.email:
        from app.core.oauth_utils import add_email_to_whitelist
        try:
            add_email_to_whitelist(
                email=db_tenant.email,
                db=db,
                added_by_id=current_admin.id,
                notes=f"Auto-whitelisted when tenant status changed to '{status_update.status}'"
            )
            from app.core.logging import logger
            logger.info(f"✅ Auto-whitelisted {db_tenant.email} for OAuth")
        except Exception as e:
            from app.core.logging import logger
            logger.error(f"⚠️  Failed to auto-whitelist {db_tenant.email}", exc_info=True)
            # Don't fail the request, just log the error

    # Send approval email if transitioned to approved
    if old_status != "approved" and status_update.status == "approved" and db_tenant.email:
        from app.tasks.email_tasks import send_tenant_approval_email
        from app.core.logging import logger
        try:
            send_tenant_approval_email.delay(
                db_tenant.email,
                db_tenant.nombre_completo,
                db_tenant.slug_url
            )
            logger.info(f"✅ Queued approval email for {db_tenant.email}")
        except Exception as e:
            logger.error(f"⚠️  Failed to queue approval email for {db_tenant.email}", exc_info=True)
            
    return db_tenant


@router.delete("/tenants/{tenant_id}")
def delete_existing_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Delete a tenant.
    """
    success = delete_tenant(db, tenant_id=tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted successfully"}


@router.put("/tenants/{tenant_id}/modules", response_model=List[Module])
def update_tenant_modules_endpoint(
    tenant_id: int,
    module_updates: List[TenantModuleUpdate],
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Update which modules are enabled for a tenant.
    Expects a list of {module_id: int, is_enabled: bool}
    """
    # Verify tenant exists
    db_tenant = get_tenant(db, tenant_id=tenant_id)
    if db_tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Convert to the format expected by the CRUD function
    updates = [{"module_id": update.module_id, "is_enabled": update.is_enabled} for update in module_updates]

    update_tenant_modules(db, tenant_id=tenant_id, module_updates=updates)

    # Return updated enabled modules
    enabled_modules = get_enabled_tenant_modules(db, tenant_id)
    return enabled_modules


# Plan endpoints
@router.get("/plans", response_model=List[Plan])
def read_plans(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get all plans.
    """
    plans = get_plans(db, skip=skip, limit=limit, active_only=active_only)
    return plans


@router.post("/plans", response_model=Plan, status_code=status.HTTP_201_CREATED)
def create_new_plan(
    plan: PlanCreate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Create a new plan.
    """
    return create_plan(db, plan)


@router.get("/plans/{plan_id}", response_model=Plan)
def read_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get a specific plan.
    """
    db_plan = get_plan(db, plan_id=plan_id)
    if db_plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return db_plan


@router.put("/plans/{plan_id}", response_model=Plan)
def update_existing_plan(
    plan_id: int,
    plan_update: PlanUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Update a plan.
    """
    db_plan = update_plan(db, plan_id=plan_id, plan_update=plan_update)
    if db_plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return db_plan


@router.delete("/plans/{plan_id}")
def delete_existing_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Delete a plan.
    """
    success = delete_plan(db, plan_id=plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted successfully"}


# Module endpoints
@router.get("/modules", response_model=List[Module])
def read_modules(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False, # Set to False by default so Admin Panel sees ALL modules, even inactive ones (like Chat)
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get all system modules.
    
    NOTE: active_only defaults to False so that the Admin Panel can list modules 
    that are currently "inactive" in the database but exist (e.g., new features like Chat).
    This allows admins to see and manage them.
    """
    modules = get_modules(db, skip=skip, limit=limit, active_only=active_only)
    print(f"🔍 DEBUG BACKEND - Total modules from DB: {len(modules)}")
    print(f"🔍 DEBUG BACKEND - Module codes: {[m.code for m in modules]}")
    return modules


@router.post("/modules", response_model=Module, status_code=status.HTTP_201_CREATED)
def create_new_module(
    module: ModuleCreate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Create a new module.
    """
    # Check if module code already exists
    existing = get_module_by_code(db, code=module.code)
    if existing:
        raise HTTPException(status_code=400, detail="Module code already exists")

    return create_module(db, module)


@router.get("/modules/{module_id}", response_model=Module)
def read_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get a specific module.
    """
    db_module = get_module(db, module_id=module_id)
    if db_module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module


@router.put("/modules/{module_id}", response_model=Module)
def update_existing_module(
    module_id: int,
    module_update: ModuleUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Update a module.
    """
    db_module = update_module(db, module_id=module_id, module_update=module_update)
    if db_module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return db_module


@router.delete("/modules/{module_id}")
def delete_existing_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Delete a module.
    """
    success = delete_module(db, module_id=module_id)
    if not success:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"message": "Module deleted successfully"}


# ────────────────────────────────────────────────────────────────
# LLM Provider endpoints
# ────────────────────────────────────────────────────────────────

from app.crud.llm import (
    get_llm_providers, get_llm_provider,
    create_llm_provider, update_llm_provider, delete_llm_provider,
    build_response,
)
from app.schemas.llm import LLMProviderCreate, LLMProviderUpdate, LLMProviderResponse, LLMProviderTestResult
from app.services.llm_router import invalidate_llm_cache, test_provider


@router.get("/llm-providers", response_model=List[Dict[str, Any]])
def list_llm_providers(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user),
) -> List[Dict[str, Any]]:
    """
    List all configured LLM providers ordered by priority.
    API keys are returned masked (****XXXX).
    """
    providers = get_llm_providers(db)
    return [build_response(p) for p in providers]


@router.post("/llm-providers", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_new_llm_provider(
    data: LLMProviderCreate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """
    Create a new LLM provider. The api_key is encrypted before storage.
    Cache is invalidated immediately so the new provider is picked up on next call.
    """
    provider = create_llm_provider(db, data)
    invalidate_llm_cache()
    return build_response(provider)


@router.put("/llm-providers/{provider_id}", response_model=Dict[str, Any])
def update_existing_llm_provider(
    provider_id: int,
    data: LLMProviderUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user),
) -> Dict[str, Any]:
    """
    Update an LLM provider.
    If api_key is omitted or empty in the body, the existing encrypted key is preserved.
    Cache is invalidated immediately after update.
    """
    provider = update_llm_provider(db, provider_id, data)
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")
    invalidate_llm_cache()
    return build_response(provider)


@router.delete("/llm-providers/{provider_id}")
def delete_existing_llm_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user),
) -> Dict[str, str]:
    """
    Delete an LLM provider.
    Raises 400 if this is the only active provider (prevents leaving system with no AI).
    """
    provider = get_llm_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")

    # Guard: prevent deleting the last active provider
    active_count = sum(1 for p in get_llm_providers(db) if p.is_active and p.id != provider_id)
    if provider.is_active and active_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el único proveedor activo. Añade o activa otro proveedor antes.",
        )

    delete_llm_provider(db, provider_id)
    invalidate_llm_cache()
    return {"message": "LLM provider deleted successfully"}


@router.post("/llm-providers/{provider_id}/test", response_model=LLMProviderTestResult)
def test_llm_provider_connection(
    provider_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user),
) -> LLMProviderTestResult:
    """
    Make a real API call to verify the provider is working correctly.
    Returns latency in ms and a short response preview.
    """
    provider = get_llm_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")
    result = test_provider(provider)
    return LLMProviderTestResult(**result)