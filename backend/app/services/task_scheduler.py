from typing import Protocol
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import logging

logger = logging.getLogger(__name__)


class TaskScheduler(Protocol):
    """Interfaz para scheduler de tareas."""
    def schedule_notify_t5(self, turno_id: int, run_at: datetime) -> str:
        """Agenda notificación T-5min. Retorna task_id."""
        ...

    def schedule_timeout(self, notif_id: int, run_at: datetime) -> str:
        """Agenda timeout de 3min. Retorna task_id."""
        ...

    def schedule_admin_window_end(self, incidencia_id: int, run_at: datetime) -> str:
        """Agenda fin de ventana admin (1min). Retorna task_id."""
        ...

    def cancel(self, task_id: str) -> None:
        """Cancela una tarea por ID."""
        ...


class APSchedulerService:
    """Implementación local con APScheduler."""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self._job_store = {}

    def start(self):
        """Inicia el scheduler."""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("APScheduler iniciado")

    def schedule_notify_t5(self, turno_id: int, run_at: datetime) -> str:
        """Agenda notificación T-5min."""
        job_id = f"notify_t5_{turno_id}_{run_at.timestamp()}"
        job = self.scheduler.add_job(
            self._notify_t5_handler,
            "date",
            run_date=run_at,
            args=[turno_id],
            id=job_id,
            replace_existing=True,
        )
        logger.info(f"Agendada notificación T-5min para turno {turno_id} a {run_at}")
        return job_id

    def schedule_timeout(self, notif_id: int, run_at: datetime) -> str:
        """Agenda timeout de 3min."""
        job_id = f"timeout_{notif_id}_{run_at.timestamp()}"
        job = self.scheduler.add_job(
            self._timeout_handler,
            "date",
            run_date=run_at,
            args=[notif_id],
            id=job_id,
            replace_existing=True,
        )
        logger.info(f"Agendado timeout para notif {notif_id} a {run_at}")
        return job_id

    def schedule_admin_window_end(self, incidencia_id: int, run_at: datetime) -> str:
        """Agenda fin de ventana admin."""
        job_id = f"admin_window_end_{incidencia_id}_{run_at.timestamp()}"
        job = self.scheduler.add_job(
            self._admin_window_end_handler,
            "date",
            run_date=run_at,
            args=[incidencia_id],
            id=job_id,
            replace_existing=True,
        )
        logger.info(f"Agendado fin de ventana admin para incidencia {incidencia_id} a {run_at}")
        return job_id

    def cancel(self, task_id: str) -> None:
        """Cancela una tarea por ID."""
        try:
            self.scheduler.remove_job(task_id)
            logger.info(f"Cancelada tarea {task_id}")
        except Exception as e:
            logger.error(f"Error cancelando tarea {task_id}: {e}")

    @staticmethod
    def _notify_t5_handler(turno_id: int):
        """Handler para notificación T-5min. Será sobreescrito en app."""
        logger.info(f"[APScheduler] notify_t5 handler para turno {turno_id}")

    @staticmethod
    def _timeout_handler(notif_id: int):
        """Handler para timeout. Será sobreescrito en app."""
        logger.info(f"[APScheduler] timeout handler para notif {notif_id}")

    @staticmethod
    def _admin_window_end_handler(incidencia_id: int):
        """Handler para fin de ventana admin. Será sobreescrito en app."""
        logger.info(f"[APScheduler] admin_window_end handler para incidencia {incidencia_id}")
