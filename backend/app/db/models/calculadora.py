from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.db.arko_base import ArkoBase

class LosaCalculationRun(ArkoBase):
    __tablename__ = "losa_calculation_runs"

    id = Column(Integer, primary_key=True, index=True)
    nombre_proyecto = Column(String(255), nullable=False)
    tipo_losa = Column(String(100), nullable=False) # maciza, colaborante, aligerada
    inputs = Column(JSONB, nullable=False)
    resultados = Column(JSONB, nullable=False)
    # user_id / tenant_id reservado para el futuro, por ahora es global
    created_at = Column(DateTime, default=datetime.utcnow)
