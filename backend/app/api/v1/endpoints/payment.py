import logging
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)
from sqlalchemy.orm import Session
from app.db.base import Base, get_db
# from app.api import deps  <-- REMOVED
from app.services.paypal_service import paypal_service
from app.db.models.appointment import Appointment
from app.db.models.doctor import Doctor
from app.db.models.online_consultation_settings import OnlineConsultationSettings
from pydantic import BaseModel

router = APIRouter()

class PayPalOrderRequest(BaseModel):
    doctor_id: int
    patient_dni: str

@router.get("/config")
def get_paypal_config():
    return {"client_id": paypal_service.client_id, "currency": "USD"}

@router.post("/create-order")
def create_order(
    request: PayPalOrderRequest,
    db: Session = Depends(get_db)
):
    # 1. Get Doctor
    doctor = db.query(Doctor).filter(Doctor.id == request.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # 2. Get Settings
    settings = db.query(OnlineConsultationSettings).filter(OnlineConsultationSettings.doctor_id == request.doctor_id).first()
    if not settings:
        # Fallback defaults if no settings configured
        price = 50.00
        currency = "USD"
    else:
        # 3. Check for Recurrent Patient (Completed appointments)
        # We assume "completed" or "paid" status means they have seen the doctor before.
        # Adjust status check based on actual business logic (e.g. 'completed', 'confirmed'?)
        # User prompt said "recurrent", implying they have a history.
        prev_appointment = db.query(Appointment).filter(
            Appointment.doctor_id == request.doctor_id,
            Appointment.patient_dni == request.patient_dni,
            Appointment.status.in_(['completed', 'confirmed']) 
        ).first()

        if prev_appointment:
            price = settings.followup_price or 40.00
        else:
            price = settings.first_consultation_price or 50.00
        
        currency = settings.currency or "USD"

    # 4. Create PayPal Order
    try:
        order = paypal_service.create_order(amount=str(price), currency=currency)
        return order
    except Exception as e:
        logger.error(f"Error creating PayPal order: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al procesar el pago. Intente nuevamente.")

@router.post("/capture-order/{order_id}")
def capture_order(
    order_id: str
):
    try:
        capture = paypal_service.capture_order(order_id)
        return capture
    except Exception as e:
        logger.error(f"Error capturing PayPal order {order_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al capturar el pago. Intente nuevamente.")
