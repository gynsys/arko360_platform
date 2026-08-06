import json
import logging

from pywebpush import webpush, WebPushException
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_web_push(subscription_info: dict, message_body: str, ttl: int = 86400):
    """
    Send a Web Push notification to a user.
    
    Args:
        subscription_info: Dictionary containing endpoint and keys (from CycleUser.push_subscription)
        message_body: String content (usually JSON) to send.
        ttl: Time to live in seconds.
        
    Returns:
        (bool, str): (Success, Error Message if any)
    """
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_CLAIM_EMAIL:
        return False, "VAPID configuration missing"

    try:
        webpush(
            subscription_info=subscription_info,
            data=message_body,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"
            },
            ttl=ttl
        )
        return True, None
    except WebPushException as ex:
        # Handle expired subscriptions (410 Gone) or other errors
        status_code = getattr(ex.response, "status_code", None)
        logger.warning("WebPush failed (status=%s): %s", status_code, ex, exc_info=True)
        if status_code == 410:
            return False, "Subscription expired"
        return False, f"WebPush Error: {ex}"
    except Exception as e:
        logger.error("Unexpected error sending web push: %s", e, exc_info=True)
        return False, str(e)
