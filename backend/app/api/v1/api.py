"""
Main API router that aggregates all v1 endpoints for Arko360.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import arko

api_router = APIRouter()

# Arko 360 Endpoints
api_router.include_router(arko.router, prefix="/arko", tags=["arko360"])
