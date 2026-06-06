from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.db.arko_base import ArkoBase, arko_engine
from app.core.config import settings
import logging
logger = logging.getLogger(__name__)

# Configurar Base de Datos para Arko
logger.info("Initializing Arko360 database tables...")
try:
    ArkoBase.metadata.create_all(bind=arko_engine)
    logger.info("Arko360 database tables verified/created successfully.")
except Exception as e:
    logger.error(f"Error creating Arko360 database tables: {e}", exc_info=True)

app = FastAPI(
    title="Arko360 Admin API",
    description="API for Arko360 Administration",
    version="1.0.0",
    docs_url="/api/v1/arko/docs",
    openapi_url="/api/v1/arko/openapi.json",
)

# Set all CORS enabled origins
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix="/api/v1")

@app.get("/api/v1/arko/health")
def health_check():
    return {"status": "ok", "service": "arko_backend"}
