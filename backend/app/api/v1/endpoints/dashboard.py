from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.base import get_db
from app.api.v1.endpoints.auth import get_current_user, get_tenant_id
from app.db.models.doctor import Doctor
from app.db.models.endometriosis_result import EndometriosisResult
from app.db.models.cycle_user import CycleUser
from app.db.models.appointment import Appointment
from app.blog.models import BlogPost as Post
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Doctor = Depends(get_current_user),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get aggregated stats for the Tenant Dashboard.
    """
    # 1. Test Count (Endometriosis Results)
    test_count = db.query(EndometriosisResult).filter(
        EndometriosisResult.doctor_id == tenant_id
    ).count()

    # 2. Cycle Users
    cycle_users_count = db.query(CycleUser).filter(
        CycleUser.doctor_id == tenant_id
    ).count()

    # 3. Visitor Count
    # Visitor count is currently tracked on the doctor model directly, we should get the tenant's visitor_count
    tenant = db.query(Doctor).filter(Doctor.id == tenant_id).first()
    visitor_count = tenant.visitor_count if tenant else 0

    # 4. Appointments this month (Existing metric, confirming logic)
    today = datetime.now()
    start_of_month = datetime(today.year, today.month, 1)
    if today.month == 12:
        end_of_month = datetime(today.year + 1, 1, 1)
    else:
        end_of_month = datetime(today.year, today.month + 1, 1)
        
    appointments_month = db.query(Appointment).filter(
        Appointment.doctor_id == tenant_id,
        Appointment.appointment_date >= start_of_month,
        Appointment.appointment_date < end_of_month,
        Appointment.status != 'cancelled'
    ).count()

    # 5. Blog Posts Count
    article_count = db.query(Post).filter(
        Post.doctor_id == tenant_id
    ).count()

    return {
        "test_count": test_count,
        "cycle_users_count": cycle_users_count,
        "visitor_count": visitor_count,
        "appointments_month_count": appointments_month,
        "article_count": article_count
    }
