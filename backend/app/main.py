from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import DEBUG, APP_ENV
from app.database import engine
from app.models.base import Base
from app.api import auth, franjas, sectores, colaboradores, notificaciones, incidencias, admin_incidencias, preferencias, turnos, admin_turnos, dias_no_laborables, ausencias, configuracion, tareas_especiales, swap
from app.services.task_scheduler import APSchedulerService
import logging

logger = logging.getLogger(__name__)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Gestión de Turnos de Almuerzo",
    description="API para organizar turnos de almuerzo y tareas externas",
    version="0.1.0",
    debug=DEBUG,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(franjas.router, prefix="/api")
app.include_router(sectores.router, prefix="/api")
app.include_router(colaboradores.router, prefix="/api")
app.include_router(notificaciones.router, prefix="/api")
app.include_router(incidencias.router, prefix="/api")
app.include_router(admin_incidencias.router, prefix="/api")
app.include_router(preferencias.router, prefix="/api")
app.include_router(turnos.router, prefix="/api")
app.include_router(admin_turnos.router, prefix="/api")
app.include_router(dias_no_laborables.router, prefix="/api")
app.include_router(ausencias.router, prefix="/api")
app.include_router(configuracion.router, prefix="/api")
app.include_router(tareas_especiales.router, prefix="/api")
app.include_router(swap.router, prefix="/api")

# Incluir router de desarrollo solo en local
if APP_ENV == "local":
    from app.api import dev
    app.include_router(dev.router)


@app.get("/")
def root():
    return {
        "message": "Gestión de Turnos de Almuerzo API",
        "version": "0.1.0",
        "docs_url": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Scheduler (solo en local)
_scheduler = None

@app.on_event("startup")
def startup_event():
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from scripts.init_admin import init_admin
    init_admin()
    logger.info("Admin user initialized")

    global _scheduler
    if APP_ENV == "local":
        _scheduler = APSchedulerService()
        _scheduler.start()
        logger.info("APScheduler iniciado en local")


@app.on_event("shutdown")
def shutdown_event():
    global _scheduler
    if _scheduler and _scheduler.scheduler.running:
        _scheduler.scheduler.shutdown()
        logger.info("APScheduler detenido")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
