import os
from dotenv import load_dotenv

# En Docker, las variables ya están inyectadas vía env_file
# En local, cargar desde .env
if not os.getenv("DOCKER_CONTAINER"):
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://almuerzos_user:almuerzos_password@localhost:5432/almuerzos_db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
APP_ENV = os.getenv("APP_ENV", "local")
FIRESTORE_EMULATOR_HOST = os.getenv("FIRESTORE_EMULATOR_HOST", "")
ADMIN_WINDOW_SECONDS = int(os.getenv("ADMIN_WINDOW_SECONDS", "60"))
TIMEOUT_SECONDS = int(os.getenv("TIMEOUT_SECONDS", "180"))
