from typing import Optional
from sqlalchemy.orm import Session
from app.models.turno import AsignacionAlmuerzo
from app.models.colaborador import Colaborador
from app.models.ausencia import Ausencia
from app.models.sector import Sector
from app.core.cobertura import CoberturaValidator
from app.core.tipos import ColaboradorInfo


def _build_validator(db: Session, fecha) -> tuple[CoberturaValidator, set]:
    """Construye CoberturaValidator y conjunto de ausentes para una fecha."""
    sectores = db.query(Sector).all()
    minimos = {s.id: s.minimo_cobertura for s in sectores}

    ausencias = db.query(Ausencia).filter(Ausencia.fecha == fecha).all()
    ausentes = {a.colaborador_id for a in ausencias}

    colaboradores = db.query(Colaborador).all()
    pool = []
    sector_map = {s.id: s for s in sectores}
    for c in colaboradores:
        sector = sector_map.get(c.sector_id)
        pool.append(ColaboradorInfo(
            id=c.id,
            nombre=c.nombre,
            sector_id=c.sector_id,
            sector_nombre=sector.nombre if sector else "unknown",
            participa_almuerzo=sector.participa_almuerzo if sector else True,
            estado_atencion=c.estado_atencion,
            puntaje_prioridad=c.puntaje_prioridad,
        ))

    return CoberturaValidator(pool, minimos), ausentes


def validate_swap_coverage(
    db: Session,
    asig_a: AsignacionAlmuerzo,
    asig_b: AsignacionAlmuerzo,
) -> tuple[bool, Optional[str]]:
    """
    Simula el intercambio entre asig_a y asig_b y verifica que ambas franjas
    mantengan la cobertura mínima.

    Devuelve (True, None) si es válido, o (False, mensaje) si rompe cobertura.
    """
    fecha = asig_a.turno_almuerzo.fecha
    validator, ausentes = _build_validator(db, fecha)

    # IDs de asignados en cada franja (todos los colaboradores de ese turno)
    def asignados_en_turno(turno_id: int) -> list[int]:
        return [
            a.colaborador_id
            for a in db.query(AsignacionAlmuerzo).filter(
                AsignacionAlmuerzo.turno_almuerzo_id == turno_id
            ).all()
        ]

    asignados_franja_a = asignados_en_turno(asig_a.turno_almuerzo_id)
    asignados_franja_b = asignados_en_turno(asig_b.turno_almuerzo_id)

    # Simular franja A: reemplazar A por B
    simulado_a = [c for c in asignados_franja_a if c != asig_a.colaborador_id] + [asig_b.colaborador_id]
    if not validator.satisfies_minimum_coverage(simulado_a, ausentes):
        hora = asig_a.turno_almuerzo.franja_horaria.hora_inicio.strftime("%H:%M")
        return False, f"El intercambio rompería la cobertura mínima en la franja de {hora}"

    # Simular franja B: reemplazar B por A
    simulado_b = [c for c in asignados_franja_b if c != asig_b.colaborador_id] + [asig_a.colaborador_id]
    if not validator.satisfies_minimum_coverage(simulado_b, ausentes):
        hora = asig_b.turno_almuerzo.franja_horaria.hora_inicio.strftime("%H:%M")
        return False, f"El intercambio rompería la cobertura mínima en la franja de {hora}"

    return True, None
