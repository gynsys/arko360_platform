"""
Push Notification Testing Endpoint
Allows admins to send test push notifications to verify the system works
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.db.base import get_db
from app.db.models.cycle_user import CycleUser
from app.db.models.doctor import Doctor
from app.api.v1.endpoints.auth import get_current_admin_user
from app.services.push_service import send_push_notification
from app.services.notifications.sender import safe_render_content
from app.services.notifications.context import calculate_smart_context
from app.db.models.push_subscription import PushSubscription
from app.db.models.notification import NotificationRule

router = APIRouter()


class PushTestRequest(BaseModel):
    user_email: str
    title: str
    body: str
    icon: Optional[str] = "/icon-192x192.png"
    badge: Optional[str] = "/badge-72x72.png"
    image: Optional[str] = None
    data: Optional[dict] = None


@router.get("/users-with-push")
async def get_users_with_push(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Get list of users (CycleUsers and Doctors) who have push notifications enabled
    """
    # Query all cycle users
    from app.db.models.push_subscription import PushSubscription
    
    users_data = db.query(CycleUser.id, CycleUser.email, CycleUser.nombre_completo).all()
    
    # Query all doctors
    doctors_data = db.query(Doctor.id, Doctor.email, Doctor.nombre_completo).all()
    
    # Get IDs of those with push (for sorting preference but not displayed as icons)
    patient_ids_with_push = set(r[0] for r in db.query(PushSubscription.user_id).filter(PushSubscription.user_id.isnot(None)).all())
    doctor_ids_with_push = set(r[0] for r in db.query(PushSubscription.doctor_id).filter(PushSubscription.doctor_id.isnot(None)).all())
    
    all_users = []
    for u in users_data:
        all_users.append({
            "id": f"u_{u.id}",
            "email": u.email,
            "name": u.nombre_completo or u.email.split('@')[0],
            "type": "patient",
            "has_push": u.id in patient_ids_with_push
        })
        
    for d in doctors_data:
        all_users.append({
            "id": f"d_{d.id}",
            "email": d.email,
            "name": f"{d.nombre_completo} (Inquilino)",
            "type": "doctor",
            "has_push": d.id in doctor_ids_with_push
        })
    
    # Simple alphabetical sort
    all_users.sort(key=lambda x: x["name"].lower())
    
    return {
        "success": True,
        "count": len(all_users),
        "users": all_users
    }


@router.get("/detailed-users-devices")
async def get_detailed_users_devices(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Audit endpoint: List all cycle users and doctors and their registered push devices.
    (SuperAdmin Only)
    """
    from sqlalchemy.orm import joinedload
    
    # 1. Get Cycle Users
    users = db.query(CycleUser).options(joinedload(CycleUser.patient_push_subscriptions)).all()
    
    # 2. Get Doctors
    doctors = db.query(Doctor).options(joinedload(Doctor.push_subscriptions)).all()
    
    result = []
    
    # Map Cycle Users
    for user in users:
        if not user.patient_push_subscriptions:
            continue
            
        devices = []
        for sub in user.patient_push_subscriptions:
            # Handle null endpoint (Capacitor devices use tokens)
            endpoint_display = "CAPACITOR_DEVICE"
            if sub.endpoint:
                endpoint_display = sub.endpoint[:60] + "..." if len(sub.endpoint) > 60 else sub.endpoint
            
            devices.append({
                "id": sub.id,
                "endpoint_short": endpoint_display,
                "token_short": sub.token[:20] + "..." if sub.token else None,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
                "updated_at": sub.updated_at.isoformat() if sub.updated_at else None
            })
        
        result.append({
            "id": f"u_{user.id}",
            "email": user.email,
            "name": user.nombre_completo or user.email,
            "type": "patient",
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "devices_count": len(devices),
            "devices": devices
        })
        
    # Map Doctors
    for doctor in doctors:
        if not doctor.push_subscriptions:
            continue
            
        devices = []
        for sub in doctor.push_subscriptions:
            # Handle null endpoint (Capacitor devices use tokens)
            endpoint_display = "CAPACITOR_DEVICE"
            if sub.endpoint:
                endpoint_display = sub.endpoint[:60] + "..." if len(sub.endpoint) > 60 else sub.endpoint

            devices.append({
                "id": sub.id,
                "endpoint_short": endpoint_display,
                "token_short": sub.token[:20] + "..." if sub.token else None,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
                "updated_at": sub.updated_at.isoformat() if sub.updated_at else None
            })
        
        result.append({
            "id": f"d_{doctor.id}",
            "email": doctor.email,
            "name": f"{doctor.nombre_completo} (Inquilino)",
            "type": "doctor",
            "created_at": doctor.created_at.isoformat() if doctor.created_at else None,
            "devices_count": len(devices),
            "devices": devices
        })
        
    return {
        "success": True,
        "count": len(result),
        "users": result
    }


@router.post("/test-push")
async def test_push_notification(
    request: PushTestRequest,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Send a test push notification to a specific user or doctor
    """
    # 1. Search in CycleUser
    actor = db.query(CycleUser).filter(CycleUser.email == request.user_email).first()
    
    # 2. If not found, search in Doctor
    if not actor:
        actor = db.query(Doctor).filter(Doctor.email == request.user_email).first()
    
    if not actor:
        raise HTTPException(status_code=404, detail=f"User or Doctor not found: {request.user_email}")
    
    # Check if they have push subscriptions
    subs = actor.patient_push_subscriptions if isinstance(actor, CycleUser) else actor.push_subscriptions
    if not subs:
        raise HTTPException(
            status_code=400, 
            detail=f"Entity {request.user_email} has not enabled push notifications"
        )
    
    try:
        # 3. Render templates with actor context
        # Gather basic context
        from app.db.models.cycle_predictor import PregnancyLog, CycleLog
        from app.cycle_predictor.logic import calculate_predictions
        
        predictions = None
        pregnancy = None
        
        if isinstance(actor, CycleUser):
            pregnancy = db.query(PregnancyLog).filter(PregnancyLog.cycle_user_id == actor.id, PregnancyLog.is_active == True).first()
            if not pregnancy:
                last_cycle = db.query(CycleLog).filter(CycleLog.cycle_user_id == actor.id).order_by(CycleLog.start_date.desc()).first()
                if last_cycle and actor.cycle_avg_length:
                    predictions = calculate_predictions(last_cycle.start_date, actor.cycle_avg_length, actor.period_avg_length)

        # Generate smart context
        context = calculate_smart_context(actor, db, predictions, pregnancy)
        # Ensure patient_name is always there for rendering
        context["patient_name"] = actor.nombre_completo or "Usuario"
        
        # Create a mock rule for safe_render_content
        from app.services.notifications.registry import _RuleData
        class MockRule:
            def __init__(self, title, body):
                self.notification_type = "test_manual"
                self.title_template = title
                self.message_template = body
                self.message_text_template = body
        
        mock_rule = MockRule(request.title, request.body)
        rendered = safe_render_content(mock_rule, context)
        
        final_title = rendered["title"] if rendered else request.title
        final_body = rendered["message_text"] if rendered else request.body

        # 4. Resolve Image: Only use explicitly provided image (no doctor photo fallback)
        final_image = request.image
        if final_image and not final_image.startswith(("http://", "https://")):
            from app.core.config import settings
            if not final_image.startswith("/"):
                final_image = f"/{final_image}"
            final_image = f"{settings.BACKEND_URL}{final_image}"

        # 5. Send push notification
        result = send_push_notification(
            user=actor, 
            title=final_title,
            body=final_body,
            icon=request.icon,
            badge=request.badge,
            data=request.data or {},
            image=final_image
        )
        
        return {
            "success": True,
            "message": f"Test notification sent to {request.user_email}",
            "actor_id": actor.id,
            "subscription_count": len(subs),
            "result": result
        }
    
    except Exception as e:
        import logging
        logging.error(f"Push test error for {request.user_email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send push notification: {str(e)}"
        )


@router.get("/diagnose")
async def diagnose_user_notification(
    email: str,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Unified diagnostic endpoint for both CycleUsers and Doctors.
    Returns cycle status, predictions, push subscriptions, and recent logs.
    """
    from app.db.models.cycle_predictor import CycleNotificationSettings, CycleLog
    from app.cycle_predictor.logic import calculate_predictions
    from app.db.models.notification import NotificationLog
    from datetime import date, datetime

    # 1. Base response
    report = {
        "email": email,
        "type": None,
        "account": None,
        "cycle": None,
        "subscriptions": [],
        "logs": []
    }

    # 2. Identify Actor
    user = db.query(CycleUser).filter(CycleUser.email == email).first()
    doctor = db.query(Doctor).filter(Doctor.email == email).first()

    if not user and not doctor:
        raise HTTPException(status_code=404, detail=f"No account found for {email}")

    actor = user or doctor
    report["type"] = "patient" if user else "doctor"
    report["account"] = {
        "id": actor.id,
        "name": actor.nombre_completo or email,
        "created_at": actor.created_at.isoformat() if hasattr(actor, 'created_at') and actor.created_at else None
    }

    # 3. Cycle Specific Data (if patient)
    if user:
        sett = db.query(CycleNotificationSettings).filter_by(cycle_user_id=user.id).first()
        last_log = db.query(CycleLog).filter_by(cycle_user_id=user.id).order_by(CycleLog.start_date.desc()).first()
        
        report["cycle"] = {
            "avg_cycle": user.cycle_avg_length,
            "avg_period": user.period_avg_length,
            "rhythm_enabled": sett.rhythm_method_enabled if sett else False,
            "last_period": last_log.start_date.isoformat() if last_log else None,
            "predictions": None
        }

        if last_log and user.cycle_avg_length:
            preds = calculate_predictions(
                last_log.start_date, 
                user.cycle_avg_length or 28, 
                user.period_avg_length or 5
            )
            # Convert dates to string for JSON
            report["cycle"]["predictions"] = {}
            for k, v in preds.items():
                if isinstance(v, (date, datetime)):
                    report["cycle"]["predictions"][k] = v.isoformat()
                else:
                    report["cycle"]["predictions"][k] = v

    # 4. Push Subscriptions
    subs_query = db.query(PushSubscription)
    if user:
        subs_query = subs_query.filter(PushSubscription.user_id == user.id)
    else:
        subs_query = subs_query.filter(PushSubscription.doctor_id == doctor.id)
    
    subs = subs_query.all()
    for s in subs:
        report["subscriptions"].append({
            "id": s.id,
            "type": "CAPACITOR" if s.token else "WEB_PUSH",
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "endpoint_short": s.endpoint[:50] + "..." if s.endpoint and len(s.endpoint) > 50 else (s.endpoint or "N/A")
        })

    # 5. Recent Logs
    # Note: recipient_id is used for patients in NotificationLog
    from sqlalchemy import or_
    logs_query = db.query(NotificationLog).order_by(NotificationLog.sent_at.desc())
    if user:
        logs_query = logs_query.filter(NotificationLog.recipient_id == user.id)
    else:
        logs_query = logs_query.filter(NotificationLog.doctor_id == doctor.id)
    
    logs = logs_query.limit(15).all()
    for l in logs:
        report["logs"].append({
            "id": l.id,
            "type": l.notification_type,
            "status": l.status,
            "channel": l.channel_used,
            "sent_at": l.sent_at.isoformat() if l.sent_at else None,
            "error": l.error_message
        })

    return report


@router.get("/test-all-types/{user_email}")
async def test_all_notification_types(
    user_email: str,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """
    Send test notifications for all supported types to verify the system
    
    **Admin only**
    
    This will send 5 different test notifications:
    1. Cycle Phase (Period reminder)
    2. Fertile Window
    3. Ovulation
    4. Contraceptive Reminder
    5. General Alert
    """
    # Find user
    user = db.query(CycleUser).filter(CycleUser.email == user_email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found: {user_email}")
    
    if not user.push_subscriptions:
        raise HTTPException(
            status_code=400,
            detail=f"User {user_email} has not enabled push notifications"
        )
    
    # 1. Fetch real templates from DB for 5 common types
    target_types = [
        "day_28_period_tomorrow", 
        "day_10_fertile_start", 
        "day_14_ovulation_peak", 
        "contraceptive_daily", 
        "system_welcome"
    ]
    db_rules = db.query(NotificationRule).filter(
        NotificationRule.notification_type.in_(target_types),
        NotificationRule.tenant_id == None
    ).all()

    # Map DB rules to test notification format
    test_notifications = []
    for rule in db_rules:
        # Use message_text_template (prioritized by push) or fallback to message_template
        body_template = rule.message_text_template or rule.message_template
        
        # Basic variable replacement for tests
        body = body_template.replace("{patient_name}", user.nombre_completo or "Usuario")
        body = body.replace("{appointment_time}", "10:00 AM")
        
        test_notifications.append({
            "title": rule.title_template,
            "body": body,
            "icon": "/icon-192x192.png",
            "data": {"type": rule.notification_type, "is_test": True}
        })
    
    # 2. Add a generic fallback if DB rules weren't found
    if not test_notifications:
        test_notifications = [
            {
                "title": "🔔 Notificación General",
                "body": f"Hola {user.nombre_completo or 'Usuario'}, el sistema de notificaciones funciona.",
                "icon": "/icon-192x192.png",
                "data": {"type": "system_test"}
            }
        ]
    
    results = []
    errors = []
    
    for idx, notification in enumerate(test_notifications, 1):
        try:
            result = send_push_notification(
                user=user,
                title=notification["title"],
                body=notification["body"],
                icon=notification["icon"],
                data=notification["data"]
            )
            results.append({
                "notification_number": idx,
                "title": notification["title"],
                "status": "sent",
                "result": result
            })
        except Exception as e:
            errors.append({
                "notification_number": idx,
                "title": notification["title"],
                "status": "failed",
                "error": str(e)
            })
    
    return {
        "success": len(errors) == 0,
        "message": f"Sent {len(results)}/{len(test_notifications)} test notifications",
        "user_email": user_email,
        "results": results,
        "errors": errors if errors else None
    }
