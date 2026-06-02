from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.online_consultation_settings import OnlineConsultationSettings
from app.db.models.doctor import Doctor
from app.schemas import online_consultation as schemas
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

@router.get("/settings/{doctor_slug}", response_model=schemas.OnlineConsultationSettings)
def get_public_settings(
    doctor_slug: str,
    db: Session = Depends(get_db)
):
    """
    Get online consultation settings for a doctor (public endpoint).
    Used by the chatbot to display pricing and configuration.
    """
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    settings = db.query(OnlineConsultationSettings).filter(
        OnlineConsultationSettings.doctor_id == doctor.id
    ).first()
    
    # If no settings exist, return defaults
    if not settings:
        return schemas.OnlineConsultationSettings(
            id=0,
            doctor_id=doctor.id,
            first_consultation_price=50.0,
            followup_price=40.0,
            currency="USD",
            payment_methods=["zelle", "paypal", "bank_transfer"],
            available_hours={"start": "09:00", "end": "17:00", "days": [1, 2, 3, 4, 5]},
            session_duration_minutes=45,
            is_active=True
        )
    
    return settings


@router.get("/settings", response_model=schemas.OnlineConsultationSettings)
def get_my_settings(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Get online consultation settings for the current doctor.
    """
    settings = db.query(OnlineConsultationSettings).filter(
        OnlineConsultationSettings.doctor_id == current_user.id
    ).first()
    
    # If no settings exist, create defaults
    if not settings:
        settings = OnlineConsultationSettings(
            doctor_id=current_user.id,
            first_consultation_price=50.0,
            followup_price=40.0,
            currency="USD",
            payment_methods=["zelle", "paypal", "bank_transfer"],
            available_hours={"start": "09:00", "end": "17:00", "days": [1, 2, 3, 4, 5]},
            session_duration_minutes=45,
            is_active=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.put("/settings", response_model=schemas.OnlineConsultationSettings)
def update_my_settings(
    settings_update: schemas.OnlineConsultationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user)
):
    """
    Update online consultation settings for the current doctor.
    """
    settings = db.query(OnlineConsultationSettings).filter(
        OnlineConsultationSettings.doctor_id == current_user.id
    ).first()
    
    # Create if doesn't exist
    if not settings:
        settings = OnlineConsultationSettings(doctor_id=current_user.id)
        db.add(settings)
    
    # Update fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/available-slots")
def get_available_slots(
    doctor_slug: str,
    start_date: str, # YYYY-MM-DD
    end_date: str,   # YYYY-MM-DD
    db: Session = Depends(get_db)
):
    """
    Get available time slots for online consultations.
    Calculates slots based on:
    1. Doctor's settings (working hours, days, duration)
    2. Existing appointments (excludes booked slots)
    """
    from datetime import datetime, timedelta, date, time
    from app.db.models.appointment import Appointment
    
    # 1. Get Doctor & Settings
    doctor = db.query(Doctor).filter(Doctor.slug_url == doctor_slug).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    settings = db.query(OnlineConsultationSettings).filter(
        OnlineConsultationSettings.doctor_id == doctor.id
    ).first()
    
    # Defaults if no settings
    if not settings:
        return []
        
    if not settings.is_active:
        return []

    # Parse inputs
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Limit range (max 30 days security)
    if (end_dt - start_dt).days > 30:
        end_dt = start_dt + timedelta(days=30)

    # 2. Get Config
    hours_config = settings.available_hours # {"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}
    work_days = hours_config.get("days", []) # 0=Sun, 6=Sat
    start_time_str = hours_config.get("start", "09:00")
    end_time_str = hours_config.get("end", "17:00")
    duration_min = settings.session_duration_minutes or 45
    
    try:
        req_start_time = datetime.strptime(start_time_str, "%H:%M").time()
        req_end_time = datetime.strptime(end_time_str, "%H:%M").time()
    except (ValueError, TypeError) as e:
        import logging
        logging.getLogger(__name__).warning(f"Invalid time format in online consultation settings: {e}")
        return []

    # 3. Get Existing Appointments (Confirmed/Pending/Scheduled)
    # Filter by date range and doctor
    existing_appts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date >= datetime.combine(start_dt, time.min),
        Appointment.appointment_date <= datetime.combine(end_dt, time.max),
        Appointment.status.in_(["pending", "confirmed", "scheduled", "paid"]) 
    ).all()
    
    booked_slots = set()
    for appt in existing_appts:
        booked_slots.add(appt.appointment_date) # datetime object

    # 4. Generate Slots
    available_slots = []
    
    curr_date = start_dt
    while curr_date <= end_dt:
        # Check if day is working day (python: 0=Mon, 6=Sun)
        # Config (0=Sun, 1=Mon...6=Sat) -> Convert Python weekday to generic
        # Python: Mon=0 -> Generic=1
        # Python: Sun=6 -> Generic=0
        py_weekday = curr_date.weekday() 
        generic_weekday = (py_weekday + 1) % 7 # Mon(0)->1, Sun(6)->7%7=0
        
        if generic_weekday in work_days:
            # Generate time slots for this day
            curr_time_dt = datetime.combine(curr_date, req_start_time)
            end_limit_dt = datetime.combine(curr_date, req_end_time)
            
            while curr_time_dt + timedelta(minutes=duration_min) <= end_limit_dt:
                # Check collision
                if curr_time_dt not in booked_slots:
                     # Check approximate collisions (if slot starts inside another appt duration)
                     # For simplicity, we assume strict slot matching or add buffer check here if needed
                     # Checking strict equality matches existing architecture
                     available_slots.append(curr_time_dt.isoformat())
                
                curr_time_dt += timedelta(minutes=duration_min)
                
        curr_date += timedelta(days=1)
        
    return available_slots
