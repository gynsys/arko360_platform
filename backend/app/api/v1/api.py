"""
Main API router that aggregates all v1 endpoints for Arko360.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import arko
from app.api.v1.endpoints import arko_tenants
from app.api.v1.endpoints import arko_landing_sites

api_router = APIRouter()

# Arko 360 Endpoints
api_router.include_router(arko.router, prefix="/arko", tags=["arko360"])
api_router.include_router(
    arko_tenants.router, prefix="/arko/tenants", tags=["arko_admin_tenants"]
)
api_router.include_router(
    arko_landing_sites.router, prefix="/arko/landing_sites", tags=["arko_admin_landing_sites"]
)
