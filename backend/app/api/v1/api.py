"""
Main API router that aggregates all v1 endpoints for Arko360.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import arko
from app.api.v1.endpoints import arko_tenants

api_router = APIRouter()

# Arko 360 Endpoints
api_router.include_router(arko.router, prefix="/arko", tags=["arko360"])
api_router.include_router(arko_tenants.router, prefix="/arko/tenants", tags=["arko360_tenants"])
