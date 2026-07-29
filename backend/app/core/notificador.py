from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.models import Colaborador, AsignacionAlmuerzo, TurnoAlmuerzo, Ausencia, Notificacion, ConfiguracionNotificaciones
from app.core.cobertura import CoberturaValidator
from app.core.tipos import ColaboradorInfo


def _should_send_push(db: Session) -> bool:
    """Check if push notifications should be sent (not paused, within window)."""
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        return True

    if config.notificaciones_pausadas:
        if config.pausa_hasta is None:
            return False
        if config.pausa_hasta > datetime.now(timezone.utc):
            return False

    now = datetime.now().time()
    if now < config.hora_inicio_envio or now > config.hora_fin_envio:
        return False

    return True


def notificar_franja_liberada(db: Session, fecha: date, franja_horaria_id: int) -> None:
    """
    Notifica a candidatos elegibles que su franja preferida se liberó.

    Candidatos elegibles:
    - Tienen franja_preferida_id == franja_horaria_id
    - Tienen una AsignacionAlmuerzo en OTRA franja ese mismo día
    - No están ausentes ese día
    - Pueden salir de su franja actual sin romper cobertura mínima
    """
    # Load ausencias for the date
    ausencias = db.query(Ausencia).filter(Ausencia.fecha == fecha).all()
    ausentes_ids = {a.colaborador_id for a in ausencias}

    # Load all colaboradores and build a map
    colaboradores = db.query(Colaborador).all()
    colab_map = {c.id: c for c in colaboradores}

    # Find candidates: those with franja_preferida_id == franja_horaria_id
    candidatos_potenciales = db.query(Colaborador).filter(
        Colaborador.franja_preferida_id == franja_horaria_id
    ).all()

    candidatos_elegibles = []

    for candidato in candidatos_potenciales:
        # Skip if absent
        if candidato.id in ausentes_ids:
            continue

        # Find their current assignment for this date
        asignacion_actual = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
            TurnoAlmuerzo.fecha == fecha,
            AsignacionAlmuerzo.colaborador_id == candidato.id,
        ).first()

        # Skip if not assigned or already in the preferred franja
        if not asignacion_actual:
            continue

        franja_actual_id = asignacion_actual.turno_almuerzo.franja_horaria_id
        if franja_actual_id == franja_horaria_id:
            # Already in their preferred franja, no change to offer
            continue

        # Check if they can safely leave their current franja
        # Get all assignments in their current franja
        asignados_en_franja_actual = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
            TurnoAlmuerzo.fecha == fecha,
            TurnoAlmuerzo.franja_horaria_id == franja_actual_id,
        ).all()

        asignados_ids = [a.colaborador_id for a in asignados_en_franja_actual]

        # Build ColaboradorInfo list for the validator
        pool = []
        for colab in colaboradores:
            if colab.id not in ausentes_ids:
                pool.append(
                    ColaboradorInfo(
                        id=colab.id,
                        nombre=colab.nombre,
                        sector=colab.sector,
                        estado_atencion=colab.estado_atencion,
                        puntaje_prioridad=colab.puntaje_prioridad,
                    )
                )

        # Load minimum coverage configuration
        from app.models import ConfiguracionCobertura
        config = db.query(ConfiguracionCobertura).first()
        minimos = {
            "tipo_a": config.minimo_tipo_a if config else 1,
            "tipo_b": config.minimo_tipo_b if config else 1,
        }

        validator = CoberturaValidator(pool, minimos)

        # Check if removing them would break coverage
        if validator.can_remove_person_safely(candidato.id, asignados_ids, ausentes_ids):
            candidatos_elegibles.append(candidato)

    # Create notifications for all eligible candidates
    canal = "fcm" if _should_send_push(db) else "in_app"
    for candidato in candidatos_elegibles:
        notificacion = Notificacion(
            colaborador_id=candidato.id,
            tipo="franja_preferida_disponible",
            canal=canal,
            mensaje=f"Se liberó tu franja preferida el {fecha.strftime('%d/%m/%Y')}. ¿Querés cambiarte?",
            fecha=fecha,
            referencia_id=franja_horaria_id,
            referencia_tipo="franja_horaria",
            estado="pendiente",
        )
        db.add(notificacion)

    db.commit()
