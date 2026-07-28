import os
import logging
from firebase_admin import initialize_app, credentials, firestore

logger = logging.getLogger(__name__)

# Detectar si estamos usando emulador (chequear variable de entorno directamente)
firestore_emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST", "").strip()

if firestore_emulator_host:
    os.environ["FIRESTORE_EMULATOR_HOST"] = firestore_emulator_host

    # firebase-admin siempre intenta obtener credenciales reales aunque haya emulador.
    # Con FIRESTORE_EMULATOR_HOST activo, el emulador ignora el token, así que
    # alcanza con un credential mock que no llame a google.auth.default().
    import google.auth.credentials

    class _EmulatorCredentials(google.auth.credentials.Credentials):
        def refresh(self, _request):
            self.token = "mock-token"

    class _EmulatorFirebaseCredential(credentials.Base):
        def get_credential(self):
            cred = _EmulatorCredentials()
            cred.token = "mock-token"
            return cred

    initialize_app(_EmulatorFirebaseCredential(), options={"projectId": "almuerzos-dev"})
    logger.info(f"Usando Firebase Emulator en {firestore_emulator_host}")
else:
    # En producción, usar GOOGLE_APPLICATION_CREDENTIALS
    creds = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    initialize_app(creds, options={"projectId": os.getenv("GCP_PROJECT_ID")})
    logger.info("Usando Firebase real en GCP")

db = firestore.client()


def update_barometro(estado: str, franjas: list, incidencias_activas: int):
    """Actualiza el documento barometro en Firestore."""
    doc = {
        "estado": estado,
        "franjas": franjas,
        "incidencias_activas": incidencias_activas,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection("sucursal").document("default").collection("data").document("barometro").set(doc)


def write_notificacion_firestore(colaborador_id: int, notif_id: int, data: dict):
    """Escribe una notificación en Firestore para real-time sync."""
    notif_data = {
        **data,
        "id": notif_id,
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection("notificaciones").document(str(colaborador_id)).collection("items").document(str(notif_id)).set(notif_data)


def write_incidencia_firestore(incidencia_id: int, data: dict):
    """Escribe una incidencia en Firestore."""
    incidencia_data = {
        **data,
        "id": incidencia_id,
        "created_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection("incidencias").document(str(incidencia_id)).set(incidencia_data)


def update_incidencia_firestore(incidencia_id: int, updates: dict):
    """Actualiza una incidencia en Firestore."""
    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("incidencias").document(str(incidencia_id)).update(updates)
