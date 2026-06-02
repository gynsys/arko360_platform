import logging
from typing import List, Any, Union, Optional

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.cycle_predictor.router import get_current_actor
from app.api.v1.endpoints.cycle_users import get_current_cycle_user
from app.db.models.doctor import Doctor
from app.db.models.cycle_user import CycleUser
from app.schemas.notification import (
    NotificationRuleUpdate, 
    NotificationRuleResponse,
    PushSubscriptionSchema,
    VapidKeyResponse,
    NotificationLogResponse,
    PendingNotificationResponse
)
from app.services import notifications as service
from app.core.config import settings

router = APIRouter()

# --- Dependencies ---

from app.api.v1.endpoints.auth import get_current_user, get_current_admin_user

# --- Global Rule Management (Admin Only) ---

@router.get("/rules", response_model=List[NotificationRuleResponse])
def read_notification_rules(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """List all global notification rules (SuperAdmin only)."""
    return service.get_global_rules(db)

@router.get("/rules/{notification_type}", response_model=NotificationRuleResponse)
def read_notification_rule_by_type(
    notification_type: str,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """Get a specific global notification rule (SuperAdmin only)."""
    rule = service.get_rule_by_type(db, None, notification_type)
    if not rule:
        raise HTTPException(status_code=404, detail="Global notification type not found")
    return rule

@router.put("/rules/{notification_type}", response_model=NotificationRuleResponse)
def update_notification_rule(
    notification_type: str,
    rule_in: NotificationRuleUpdate,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
):
    """Update a global notification rule (SuperAdmin only)."""
    rule = service.get_rule_by_type(db, None, notification_type)
    if not rule:
        raise HTTPException(status_code=404, detail="Global notification type not found")
    
    return service.update_rule(db, rule, rule_in)

# --- Public Subscription Endpoints (Unified) ---

@router.get("/vapid-public-key", response_model=VapidKeyResponse)
def get_vapid_public_key(
    current_actor: Union[CycleUser, Doctor] = Depends(get_current_actor)
):
    """Get VAPID Public Key for Push Subscription (Supports any authenticated actor)."""
    key = getattr(settings, "VAPID_PUBLIC_KEY", None)
    if not key:
        raise HTTPException(status_code=500, detail="VAPID keys not configured on server")
    return {"public_key": key}

@router.post("/subscribe")
def subscribe_push(
    subscription: Any = Body(...),
    db: Session = Depends(get_db),
    current_actor: Union[CycleUser, Doctor] = Depends(get_current_actor)
):
    """Subscribe current actor (Doctor or CycleUser) to Push Notifications."""
    import logging
    _logger = logging.getLogger(__name__)
    _logger.info(f"[GynSysPush] Received subscription request: {subscription}")

    # Validate manually or convert to schema
    try:
        sub_in = PushSubscriptionSchema(**subscription) if isinstance(subscription, dict) else subscription
    except Exception as e:
        _logger.error(f"[GynSysPush] Validation error: {e}")
        raise HTTPException(status_code=422, detail="Error de validación en la suscripción push.")

    user_id = current_actor.id if isinstance(current_actor, CycleUser) else None
    doctor_id = current_actor.id if isinstance(current_actor, Doctor) else None
    
    service.create_or_update_subscription(
        db=db, 
        sub_in=sub_in, 
        user_id=user_id, 
        doctor_id=doctor_id
    )
    return {"message": "Subscribed successfully"}

@router.post("/unsubscribe")
def unsubscribe_push(
    endpoint: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_actor: Union[CycleUser, Doctor] = Depends(get_current_actor)
):
    """Unsubscribe specific device from Push Notifications."""
    service.delete_subscription_by_endpoint(db, endpoint)
    return {"message": "Unsubscribed successfully"}

from app.schemas.notification import NotificationTrackRequest

@router.post("/track")
def track_notification(
    track_in: NotificationTrackRequest,
    db: Session = Depends(get_db)
):
    """
    Public endpoint to track notification receipt and clicks.
    Does not require auth to facilitate background reporting from SW.
    """
    import json
    print(f"[TELEMETRY] Event: {track_in.event} | Metadata: {json.dumps(track_in.metadata or {})}", flush=True)
    log = service.track_notification_event(db, track_in)
    if not log:
        # Silently fail or return 404. SW shouldn't care much.
        return {"status": "not_found"}
    return {"status": "ok", "event": track_in.event}


# =============================================================================
# ENDPOINTS DE DIAGNÓSTICO (SuperAdmin Only)
# =============================================================================

@router.get("/health")
def get_system_health(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """
    Retorna métricas de salud del sistema de notificaciones.
    - pending_queue: notificaciones esperando envío
    - failed_total: notificaciones que agotaron reintentos
    - sent_last_24h: enviadas en las últimas 24h
    - circuit_breaker: estado del circuito push
    """
    return service.get_notification_system_health(db)


@router.get("/audit/logs", response_model=List[NotificationLogResponse])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """List notification logs with filters (SuperAdmin only)."""
    return service.get_audit_logs(db, skip=skip, limit=limit, search=search, status=status)


@router.get("/audit/queue", response_model=List[PendingNotificationResponse])
def read_pending_queue(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """List pending notifications with filters (SuperAdmin only)."""
    return service.get_pending_queue(db, skip=skip, limit=limit, search=search, status=status)


@router.get("/debug/user/{user_id}")
def get_user_notification_debug(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """
    Retorna la cola y el historial de notificaciones de un usuario específico.
    Útil para diagnosticar por qué una notificación no llegó.
    """
    from app.db.models.notification import PendingNotification, NotificationLog
    from app.db.models.cycle_user import CycleUser
    from sqlalchemy import desc

    user = db.query(CycleUser).filter(CycleUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Cycle user {user_id} not found")

    pending = db.query(PendingNotification).filter(
        PendingNotification.recipient_id == user_id
    ).order_by(desc(PendingNotification.created_at)).limit(20).all()

    logs = db.query(NotificationLog).filter(
        NotificationLog.recipient_id == user_id
    ).order_by(desc(NotificationLog.sent_at)).limit(20).all()

    return {
        "user_id": user_id,
        "user_name": user.nombre_completo,
        "user_email": user.email,
        "pending_notifications": [
            {
                "id": p.id,
                "rule_id": p.notification_rule_id,
                "status": p.status,
                "channel": p.channel,
                "scheduled_for": p.scheduled_for.isoformat() if p.scheduled_for else None,
                "retry_count": p.retry_count,
                "last_error": p.last_error,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in pending
        ],
        "notification_logs": [
            {
                "type": lg.notification_type,
                "status": lg.status,
                "channel_used": lg.channel_used,
                "sent_at": lg.sent_at.isoformat() if lg.sent_at else None,
                "title": lg.title_sent,
            }
            for lg in logs
        ]
    }


@router.post("/debug/user/{user_id}/retry")
def retry_failed_notifications(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """
    Resetea todas las notificaciones en estado 'failed' de un usuario a 'pending'
    para que sean reintentadas en el próximo ciclo de la cola (cada 1 minuto).
    Útil durante debugging para re-intentar sin esperar al día siguiente.
    """
    from app.db.models.notification import PendingNotification
    from app.services.notifications import normalize_to_caracas

    updated = db.query(PendingNotification).filter(
        PendingNotification.recipient_id == user_id,
        PendingNotification.status == "failed"
    ).update({
        "status": "pending",
        "retry_count": 0,
        "last_error": None,
        "scheduled_for": normalize_to_caracas(),
    }, synchronize_session=False)

    db.commit()

    return {
        "message": f"Reset {updated} failed notification(s) to pending for user {user_id}",
        "user_id": user_id,
        "notifications_reset": updated
    }


@router.post("/debug/user/{user_id}/evaluate")
def force_user_evaluation(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """
    Fuerza una re-evaluación inmediata del pipeline de notificaciones para el usuario.
    Llama a trigger_immediate_evaluation() que:
    1. Borra pending de hoy con status pending/retrying
    2. Ejecuta _process_single_user() de nuevo
    3. Intenta entregar si hay notificaciones listas
    """
    from app.db.models.cycle_user import CycleUser

    user = db.query(CycleUser).filter(CycleUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Cycle user {user_id} not found")

    try:
        service.trigger_immediate_evaluation(user_id, db)
        return {
            "message": f"Immediate evaluation triggered for user {user_id} ({user.email})",
            "user_id": user_id,
        }
    except Exception as e:
        logger.error(f"Evaluation error for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al evaluar notificaciones del usuario.")


# =============================================================================
# ENDPOINTS DE OPERACIONES (SuperAdmin Only)
# =============================================================================

@router.post("/reset-circuit")
def reset_notification_circuit(
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """Reinicia manualmente el circuit breaker de notificaciones push."""
    from app.services.notifications import push_circuit
    push_circuit.reset()
    return {"message": "Circuit breaker reset successfully"}


@router.post("/trigger-evaluation")
def trigger_system_evaluation(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """Fuerza la evaluación diaria del sistema de notificaciones para todos los usuarios."""
    service.run_daily_evaluation()
    return {"message": "Notification evaluation triggered"}


@router.post("/trigger-delivery")
def trigger_system_delivery(
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """Fuerza el procesamiento inmediato de la cola de notificaciones pendientes."""
    service.deliver_pending_notifications()
    return {"message": "Notification delivery triggered"}


@router.post("/cleanup-subscriptions")
def cleanup_stale_subscriptions(
    db: Session = Depends(get_db),
    current_admin: Doctor = Depends(get_current_admin_user)
) -> Any:
    """Limpia suscripciones inválidas (403/410) basadas en errores recientes."""
    deleted_count = service.cleanup_invalid_subscriptions(db)
    return {
        "message": f"Cleanup finished. Deleted {deleted_count} stale subscriptions.",
        "deleted_count": deleted_count
    }
