from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models import (
    TareaEspecialTipo, TareaEspecialAsignacion, ColaboradorTareaTipo,
    Colaborador, Sector
)


class TaskRotationEngine:
    """
    Automatic rotation engine for special tasks.
    Supports both simple round-robin and multi-sector rotation.
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
        Routes to _generar_simple or _generar_multi_sector based on configuration.

        Returns dict with:
        - asignaciones_creadas: count
        - asignaciones_saltadas: count (deprecated, always 0)
        - advertencias: list of warning messages
        """
        asignaciones_creadas = 0
        advertencias = []

        query = db.query(TareaEspecialTipo)
        if tipo_ids:
            query = query.filter(TareaEspecialTipo.id.in_(tipo_ids))
        tipos = query.all()

        for tipo in tipos:
            if tipo.configuracion_rotacion:
                # New route: multi-sector
                creadas, advs = TaskRotationEngine._generar_multi_sector(
                    db, tipo, fecha_inicio, fecha_fin
                )
            else:
                # Existing route: simple round-robin
                creadas, advs = TaskRotationEngine._generar_simple(
                    db, tipo, fecha_inicio, fecha_fin
                )

            asignaciones_creadas += creadas
            advertencias.extend(advs)

        return {
            "asignaciones_creadas": asignaciones_creadas,
            "asignaciones_saltadas": 0,
            "advertencias": advertencias,
        }

    @staticmethod
    def _generar_simple(
        db: Session,
        tipo: TareaEspecialTipo,
        fecha_inicio: date,
        fecha_fin: date
    ) -> Tuple[int, List[str]]:
        """
        Generate assignments in simple mode (round-robin without sectors).
        This is the existing logic, refactored to use timedelta.
        """
        asignaciones_creadas = 0
        advertencias = []

        current = fecha_inicio
        while current <= fecha_fin:
            weekday = current.weekday()  # 0=Monday, 6=Sunday
            if weekday not in tipo.dia_semana_aplicable:
                current += timedelta(days=1)
                continue

            # Check frequency (biweekly)
            if tipo.frecuencia == 'quincenal':
                if not TaskRotationEngine._is_active_week(current, tipo.fecha_inicio_ciclo):
                    current += timedelta(days=1)
                    continue

            # Check if assignment already exists
            existing = db.query(TareaEspecialAsignacion).filter(
                TareaEspecialAsignacion.fecha == current,
                TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
            ).first()
            if existing:
                current += timedelta(days=1)
                continue

            # Get pool of collaborators for this task type
            pool = db.query(ColaboradorTareaTipo).filter(
                ColaboradorTareaTipo.tarea_tipo_id == tipo.id
            ).order_by(ColaboradorTareaTipo.colaborador_id).all()

            if not pool:
                advertencias.append(
                    f"Tarea '{tipo.nombre}' no tiene colaboradores en el pool"
                )
                current += timedelta(days=1)
                continue

            # Find last assignment to rotate
            last_assignment = db.query(TareaEspecialAsignacion).filter(
                TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
            ).order_by(TareaEspecialAsignacion.fecha.desc()).first()

            # Determine next collaborator in round-robin
            if last_assignment:
                last_idx = next(
                    (i for i, c in enumerate(pool)
                     if c.colaborador_id == last_assignment.colaborador_id),
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

            current += timedelta(days=1)

        db.commit()
        return asignaciones_creadas, advertencias

    @staticmethod
    def _generar_multi_sector(
        db: Session,
        tipo: TareaEspecialTipo,
        fecha_inicio: date,
        fecha_fin: date
    ) -> Tuple[int, List[str]]:
        """
        Generate assignments respecting multi-sector configuration.

        Logic:
        1. For each day in range [fecha_inicio, fecha_fin]:
           - Skip if weekday not in dia_semana_aplicable
           - Skip if biweekly and not active week
           - Get sector distribution for today (from pattern or personal config)
           - For each sector+quantity:
             * Get pool of active collaborators from sector
             * Find next in round-robin rotation (per sector)
             * Create assignment (prevent duplicates)
           - Flush after each day to make subsequent queries see changes

        2. Handling inactive users:
           - Exclude colaboradores with estado_atencion != 'activo'
           - Generate warning if pool insufficient

        3. Per-sector rotation:
           - Maintain rotation index WITHIN each sector
           - Query last assignment of sector for this task
           - Advance to next non-assigned in this cycle if quantity > 1
        """
        asignaciones_creadas = 0
        advertencias = []

        config = tipo.configuracion_rotacion
        dias_aplicables_sorted = sorted(tipo.dia_semana_aplicable)

        current = fecha_inicio
        while current <= fecha_fin:
            weekday = current.weekday()

            # Skip if date doesn't match weekday
            if weekday not in tipo.dia_semana_aplicable:
                current += timedelta(days=1)
                continue

            # Skip if biweekly and not active week
            if tipo.frecuencia == 'quincenal':
                if not TaskRotationEngine._is_active_week(current, tipo.fecha_inicio_ciclo):
                    current += timedelta(days=1)
                    continue

            # Determine which sectors apply today
            if config['modo'] == 'patron_fijo':
                # patron_semanal is indexed by position in sorted dia_semana_aplicable
                patron_idx = dias_aplicables_sorted.index(weekday)
                sector_nombre = config['patron_semanal'][patron_idx]
                sector_counts = {sector_nombre: 1}
            else:  # personalizado
                # distribucion_por_dia is indexed by str(weekday)
                sector_counts = config['distribucion_por_dia'].get(str(weekday), {})

            # Track assigned collaborators for this day to avoid duplicates
            asignados_hoy = []

            # Process each sector
            for sector_nombre, cantidad_necesaria in sector_counts.items():
                if cantidad_necesaria == 0:
                    continue

                # Get pool of active collaborators from this sector for this task
                pool = db.query(ColaboradorTareaTipo).join(
                    Colaborador,
                    ColaboradorTareaTipo.colaborador_id == Colaborador.id
                ).join(
                    Sector,
                    Colaborador.sector_id == Sector.id
                ).filter(
                    ColaboradorTareaTipo.tarea_tipo_id == tipo.id,
                    Colaborador.estado_atencion == 'activo',
                    Sector.nombre == sector_nombre
                ).order_by(ColaboradorTareaTipo.colaborador_id).all()

                if not pool:
                    advertencias.append(
                        f"Tarea '{tipo.nombre}' sector '{sector_nombre}': "
                        f"sin colaboradores disponibles el {current.strftime('%d/%m/%Y')}"
                    )
                    continue

                if len(pool) < cantidad_necesaria:
                    advertencias.append(
                        f"Tarea '{tipo.nombre}' sector '{sector_nombre}': "
                        f"pool insuficiente ({cantidad_necesaria} necesarios, "
                        f"{len(pool)} disponibles) el {current.strftime('%d/%m/%Y')}"
                    )

                # Assign cantidad_necesaria collaborators from this sector
                for i in range(cantidad_necesaria):
                    # Find last assignment of this sector for this task
                    last_asignacion = db.query(TareaEspecialAsignacion).join(
                        Colaborador,
                        TareaEspecialAsignacion.colaborador_id == Colaborador.id
                    ).join(
                        Sector,
                        Colaborador.sector_id == Sector.id
                    ).filter(
                        TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                        Sector.nombre == sector_nombre
                    ).order_by(TareaEspecialAsignacion.fecha.desc()).first()

                    # Calculate next index
                    if last_asignacion:
                        last_idx = next(
                            (j for j, c in enumerate(pool)
                             if c.colaborador_id == last_asignacion.colaborador_id),
                            -1
                        )
                        # Advance to next non-assigned in this cycle
                        for _ in range(len(pool)):
                            last_idx = (last_idx + 1) % len(pool)
                            if pool[last_idx].colaborador_id not in asignados_hoy:
                                break
                        next_idx = last_idx
                    else:
                        # First time: find first non-assigned
                        next_idx = next(
                            (j for j, c in enumerate(pool)
                             if c.colaborador_id not in asignados_hoy),
                            0
                        )

                    colaborador_id = pool[next_idx].colaborador_id

                    # Avoid duplicates
                    existing = db.query(TareaEspecialAsignacion).filter(
                        TareaEspecialAsignacion.fecha == current,
                        TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                        TareaEspecialAsignacion.colaborador_id == colaborador_id
                    ).first()

                    if not existing:
                        asignacion = TareaEspecialAsignacion(
                            fecha=current,
                            tarea_especial_tipo_id=tipo.id,
                            colaborador_id=colaborador_id
                        )
                        db.add(asignacion)
                        db.flush()  # Critical: flush so next queries see this assignment
                        asignaciones_creadas += 1

                    asignados_hoy.append(colaborador_id)

            current += timedelta(days=1)

        db.commit()
        return asignaciones_creadas, advertencias

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
