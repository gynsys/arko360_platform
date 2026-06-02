from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Union
from app.db.base import get_db
from app.cycle_predictor.router \
    import get_current_actor
from app.db.models.doctor import Doctor
from app.db.models.cycle_user import CycleUser
from app.db.models.cycle_predictor import CycleLog, SymptomLog, PregnancyLog, CycleNotificationSettings
from app.db.models.push_subscription import PushSubscription

router = APIRouter()

@router.get("/download-my-data")
def download_my_data(
    current_actor: Union[Doctor, CycleUser] = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    """Export all data related to the current user (Doctor or CycleUser)."""
    
    export_data = {
        "user_info": {
            "email": current_actor.email,
            "type": "cycle_user" if isinstance(current_actor, CycleUser) else "doctor",
            "name": getattr(current_actor, 'nombre_completo', None) or getattr(current_actor, 'name', 'User')
        }
    }

    if isinstance(current_actor, CycleUser):
        # Mi Ciclo User Data
        uid = current_actor.id
        export_data["health_data"] = {
            "cycle_logs": [
                {"start": str(c.start_date), "end": str(c.end_date), "notes": c.notes}
                for c in db.query(CycleLog).filter(CycleLog.cycle_user_id == uid).all()
            ],
            "symptom_logs": [
                {"date": str(s.date), "symptoms": s.symptoms, "mood": s.mood, "pain": s.pain_level}
                for s in db.query(SymptomLog).filter(SymptomLog.cycle_user_id == uid).all()
            ],
            "pregnancy_logs": [
                {"started": str(p.last_period_date), "due": str(p.due_date), "active": p.is_active}
                for p in db.query(PregnancyLog).filter(PregnancyLog.cycle_user_id == uid).all()
            ],
            "settings": {
                "avg_cycle": current_actor.cycle_avg_length,
                "avg_period": current_actor.period_avg_length
            }
        }
    else:
        # Doctor Data (simplified for now)
        export_data["doctor_profile"] = {
            "specialty": getattr(current_actor, 'specialty', ''),
            "slug": current_actor.slug_url
        }
    
    return export_data

@router.delete("/delete-my-account")
def delete_my_account(
    current_actor: Union[Doctor, CycleUser] = Depends(get_current_actor),
    db: Session = Depends(get_db)
):
    """Permanently delete user account and all associated data."""
    try:
        if isinstance(current_actor, Doctor):
            # Guard against accidental deletion of doctors with tenants/patients
            # This is a high-risk action, maybe require support contact
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor accounts cannot be self-deleted for security. Please contact support."
            )

        uid = current_actor.id
        
        # 1. Delete associated health records (Mi Ciclo)
        db.query(CycleLog).filter(CycleLog.cycle_user_id == uid).delete()
        db.query(SymptomLog).filter(SymptomLog.cycle_user_id == uid).delete()
        db.query(PregnancyLog).filter(PregnancyLog.cycle_user_id == uid).delete()
        db.query(CycleNotificationSettings).filter(CycleNotificationSettings.cycle_user_id == uid).delete()
        db.query(PushSubscription).filter(PushSubscription.user_id == uid).delete()

        # 2. Delete the user record itself
        db.delete(current_actor)
        db.commit()
        
        return {"message": "Account and all data permanently deleted."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"Error deleting account for user {current_actor.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno al eliminar la cuenta.")
