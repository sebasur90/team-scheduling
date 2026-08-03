from datetime import date, datetime
from typing import List, Optional, Set
from sqlalchemy.orm import Session
from app.models import (
    TareaEspecialTipo, TareaEspecialAsignacion, ColaboradorTareaTipo
)


class TaskRotationEngine:
    """
    Automatic rotation engine for special tasks.
    Generates TareaEspecialAsignacion records in a round-robin fashion.
    """

    @staticmethod
    def generar(
        db: Session,
        fecha_inicio: date,
        fecha_fin: date,
        tipo_ids: Optional[List[int]] = None
    ) -> dict:
        """
        Generate task assignments for a date range.

        Returns dict with:
        - asignaciones_creadas: count
        - asignaciones_saltadas: count
        - advertencias: list of warning messages
        """
        asignaciones_creadas = 0
        asignaciones_saltadas = 0
        advertencias = []

        # Load all active task types
        query = db.query(TareaEspecialTipo)
        if tipo_ids:
            query = query.filter(TareaEspecialTipo.id.in_(tipo_ids))
        tipos = query.all()

        # Iterate through date range
        current = fecha_inicio
        while current <= fecha_fin:
            for tipo in tipos:
                # Check if date matches weekday
                weekday = current.weekday()  # 0=Monday, 6=Sunday
                if weekday not in tipo.dia_semana_aplicable:
                    continue

                # Check if frequency is active (biweekly)
                if tipo.frecuencia == 'quincenal':
                    if not TaskRotationEngine._is_active_week(current, tipo.fecha_inicio_ciclo):
                        continue

                # Check if assignment already exists
                existing = db.query(TareaEspecialAsignacion).filter(
                    TareaEspecialAsignacion.fecha == current,
                    TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                ).first()
                if existing:
                    asignaciones_saltadas += 1
                    continue

                # Get pool of collaborators for this task type
                pool = db.query(ColaboradorTareaTipo).filter(
                    ColaboradorTareaTipo.tarea_tipo_id == tipo.id
                ).order_by(ColaboradorTareaTipo.colaborador_id).all()

                if not pool:
                    advertencias.append(f"Tarea '{tipo.nombre}' no tiene colaboradores en el pool")
                    continue

                # Find last assignment to rotate
                last_assignment = db.query(TareaEspecialAsignacion).filter(
                    TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                ).order_by(TareaEspecialAsignacion.fecha.desc()).first()

                # Determine next collaborator in round-robin
                if last_assignment:
                    last_idx = next(
                        (i for i, c in enumerate(pool) if c.colaborador_id == last_assignment.colaborador_id),
                        -1
                    )
                    next_idx = (last_idx + 1) % len(pool)
                else:
                    next_idx = 0

                next_colaborador_id = pool[next_idx].colaborador_id

                # Create assignment
                asignacion = TareaEspecialAsignacion(
                    fecha=current,
                    tarea_especial_tipo_id=tipo.id,
                    colaborador_id=next_colaborador_id,
                )
                db.add(asignacion)
                asignaciones_creadas += 1

            current = current.replace(day=current.day + 1) if current.day < 28 else (
                current.replace(month=current.month + 1, day=1) if current.month < 12
                else current.replace(year=current.year + 1, month=1, day=1)
            )

        db.commit()

        return {
            "asignaciones_creadas": asignaciones_creadas,
            "asignaciones_saltadas": asignaciones_saltadas,
            "advertencias": advertencias,
        }

    @staticmethod
    def _is_active_week(fecha: date, fecha_inicio_ciclo: Optional[date]) -> bool:
        """
        Check if fecha falls on an active week for biweekly tasks.
        Uses ISO week calculation: active = (iso_week(fecha) - iso_week(fecha_inicio)) % 2 == 0
        """
        if fecha_inicio_ciclo is None:
            # Fallback: use first Monday of the ISO year
            enero_1 = fecha.replace(month=1, day=1)
            # Find first Monday of the year
            days_to_monday = (7 - enero_1.weekday()) % 7
            fecha_inicio_ciclo = enero_1.replace(day=enero_1.day + days_to_monday)

        week_fecha = fecha.isocalendar()[1]
        week_inicio = fecha_inicio_ciclo.isocalendar()[1]
        offset = (week_fecha - week_inicio) % 52

        return offset % 2 == 0
