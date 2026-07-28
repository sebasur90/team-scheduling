from typing import Protocol
import logging

logger = logging.getLogger(__name__)


class NotifService(Protocol):
    """Interfaz para servicio de notificaciones push."""
    def send_push(self, fcm_token: str, title: str, body: str, data: dict = None) -> None:
        """Envía un push FCM."""
        ...


class DevNotifService:
    """Implementación dev que solo loguea. No envía push reales."""

    def send_push(self, fcm_token: str, title: str, body: str, data: dict = None) -> None:
        """Loguea el push en lugar de enviarlo."""
        logger.info(f"[DevNotifService] PUSH a {fcm_token[:20]}... | {title} | {body}")
        if data:
            logger.info(f"  Datos: {data}")


class FCMNotifService:
    """Implementación real con firebase-admin SDK (para GCP)."""

    def __init__(self, app):
        self.app = app

    def send_push(self, fcm_token: str, title: str, body: str, data: dict = None) -> None:
        """Envía un push FCM real."""
        try:
            from firebase_admin import messaging
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=fcm_token,
            )
            messaging.send(message, app=self.app)
            logger.info(f"Push enviado a {fcm_token[:20]}...")
        except Exception as e:
            logger.error(f"Error enviando push: {e}")
