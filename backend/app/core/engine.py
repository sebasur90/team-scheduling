from datetime import date
from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import (
    Colaborador, Ausencia, PreferenciaDiaria, TareaEspecialAsignacion, FranjaHoraria, TurnoAlmuerzo
)
from app.constants import FRANJAS_CONFIG
from app.core.tipos import (
    ContextData, ColaboradorInfo, AssignmentResult, AsignacionResult, ConflictoEmpate
)
from app.core.cobertura import CoberturaValidator
from app.core.prioridad import PrioridadResolver
from app.core.franja_history import find_least_recent_franja


class AssignmentEngine:
    """
    Core assignment algorithm for lunch shifts.
    Implements the 4-phase algorithm from spec §4.
    """

    def __init__(self, db: Session, fecha: date):
        self.db = db
        self.fecha = fecha
        self.num_franjas = len(FRANJAS_CONFIG)

    def run(self) -> AssignmentResult:
        """Main orchestration method. Returns AssignmentResult."""
        try:
            # Load all data
            context = self._phase_0_build_context()

            # Phase 1: Resolve preferences
            asignaciones_phase1 = self._phase_1_resolve_preferences(context)

            # Phase 2: Fill remaining people
            asignaciones_all = self._phase_2_fill_remaining(context, asignaciones_phase1)

            # Phase 3: Final validation
            cronograma, puntajes = self._phase_3_validate_and_build(context, asignaciones_all)

            return AssignmentResult(
                success=True,
                cronograma=cronograma,
                asignaciones=asignaciones_all,
                puntajes_actualizados=puntajes,
            )

        except Exception as e:
            return AssignmentResult(
                success=False,
                error=str(e),
            )

    def _phase_0_build_context(self) -> ContextData:
        """
        Phase 0: Build context for the day.
        Determine who's absent, excluded, etc.
        """
        # Load ausencias
        ausencias = self.db.query(Ausencia).filter(Ausencia.fecha == self.fecha).all()
        ausentes_ids = {a.colaborador_id for a in ausencias}

        # Load all colaboradores
        colaboradores = self.db.query(Colaborador).all()
        colab_map = {c.id: c for c in colaboradores}

        # Find orientador (if assigned)
        orientador_id = None
        tarea_orient = (
            self.db.query(TareaEspecialAsignacion)
            .join(TareaEspecialAsignacion.tipo)
            .filter(
                TareaEspecialAsignacion.fecha == self.fecha,
                TareaEspecialAsignacion.tipo.nombre == "orientador",
            )
            .first()
        )
        if tarea_orient:
            orientador_id = tarea_orient.colaborador_id

        # Find municipalidad/gandulfo restrictions
        tareas_restringidas = {}
        for tarea in (
            self.db.query(TareaEspecialAsignacion)
            .filter(TareaEspecialAsignacion.fecha == self.fecha)
            .all()
        ):
            if tarea.tipo.nombre in ["municipalidad", "gandulfo"]:
                # Restrict to franjas 3, 4, 5 (indices 2, 3, 4 in FRANJAS_CONFIG)
                tareas_restringidas[tarea.colaborador_id] = [2, 3, 4]

        # Build available pool
        pool = []
        for colab in colaboradores:
            if colab.id in ausentes_ids or colab.id == orientador_id:
                continue
            pool.append(
                ColaboradorInfo(
                    id=colab.id,
                    nombre=colab.nombre,
                    sector=colab.sector,
                    estado_atencion=colab.estado_atencion,
                    puntaje_prioridad=colab.puntaje_prioridad,
                )
            )

        # Load preferences for today
        preferencias = {}
        prefs = self.db.query(PreferenciaDiaria).filter(
            PreferenciaDiaria.fecha == self.fecha
        ).all()
        for pref in prefs:
            if pref.colaborador_id not in ausentes_ids and pref.colaborador_id != orientador_id:
                preferencias[pref.colaborador_id] = pref.franja_horaria_id_deseada - 1  # Store as index

        return ContextData(
            fecha=self.fecha,
            ausencias_colaborador_ids=ausentes_ids,
            orientador_id=orientador_id,
            tareas_restringidas=tareas_restringidas,
            pool_disponible=pool,
            preferencias=preferencias,
        )

    def _phase_1_resolve_preferences(self, context: ContextData) -> List[AsignacionResult]:
        """
        Phase 1: Resolve preference requests by franja.
        """
        asignaciones = []
        puntajes_actualizados = {}

        # Group preferences by franja
        prefs_por_franja = {}
        for colab_id, franja_idx in context.preferencias.items():
            if franja_idx not in prefs_por_franja:
                prefs_por_franja[franja_idx] = []
            prefs_por_franja[franja_idx].append(colab_id)

        # Validator for checking coverage
        validator = CoberturaValidator(context.pool_disponible)

        # Process each franja with preferences
        asignados_por_franja = {i: [] for i in range(self.num_franjas)}

        for franja_idx, solicitantes_ids in prefs_por_franja.items():
            # Check constraints
            if franja_idx >= self.num_franjas:
                continue

            # Check if franja has restricted franjas
            solicitantes = [c for c in context.pool_disponible if c.id in solicitantes_ids]

            # Filter out those with restrictions that exclude this franja
            solicitantes_validos = []
            for s in solicitantes:
                if s.id in context.tareas_restringidas:
                    if franja_idx in context.tareas_restringidas[s.id]:
                        solicitantes_validos.append(s)
                else:
                    solicitantes_validos.append(s)

            # Try to satisfy all valid preferences
            # Build excluded set: people absent or in orientador role
            excluidos = context.ausencias_colaborador_ids.copy()
            if context.orientador_id:
                excluidos.add(context.orientador_id)

            # Check if granting all would maintain coverage
            simulated_asignados = asignados_por_franja[franja_idx] + [s.id for s in solicitantes_validos]
            if validator.satisfies_minimum_coverage(simulated_asignados, excluidos):
                # Grant all
                for s in solicitantes_validos:
                    asignaciones.append(AsignacionResult(
                        colaborador_id=s.id,
                        franja_orden=franja_idx,
                        estado_concesion="otorgado",
                    ))
                    puntajes_actualizados[s.id] = 0  # Reset score
                    asignados_por_franja[franja_idx].append(s.id)
            else:
                # Coverage conflict: resolve by priority
                # Group by sector
                por_sector = {}
                for s in solicitantes_validos:
                    if s.sector not in por_sector:
                        por_sector[s.sector] = []
                    por_sector[s.sector].append(s)

                # For each sector, determine how many can be assigned
                for sector, candidatos in por_sector.items():
                    # Simulate: if we remove all of this sector, do we still have coverage?
                    simulated = asignados_por_franja[franja_idx] + [s.id for c in por_sector.values() if c != candidatos for s in c]
                    comercial_left, operativo_left = validator.get_cobertura_status(simulated, excluidos)

                    if sector == "comercial":
                        available_spots = 1 if comercial_left < 1 else 0
                    else:
                        available_spots = 1 if operativo_left < 1 else 0

                    # Select who gets a spot
                    if available_spots > 0:
                        selected, conflicts, deselected = PrioridadResolver.select_for_assignment(
                            candidatos, available_spots
                        )
                        for s in selected:
                            asignaciones.append(AsignacionResult(
                                colaborador_id=s.id,
                                franja_orden=franja_idx,
                                estado_concesion="otorgado",
                            ))
                            puntajes_actualizados[s.id] = 0
                            asignados_por_franja[franja_idx].append(s.id)

                        for c in conflicts:
                            c.franja_orden = franja_idx

                        for d_id in deselected:
                            asignaciones.append(AsignacionResult(
                                colaborador_id=d_id,
                                franja_orden=-1,  # Not assigned yet
                                estado_concesion="denegado",
                            ))
                            puntajes_actualizados[d_id] = (
                                next((c.puntaje_prioridad for c in context.pool_disponible if c.id == d_id), 0) + 1
                            )
                    else:
                        # No spots available
                        for s in candidatos:
                            asignaciones.append(AsignacionResult(
                                colaborador_id=s.id,
                                franja_orden=-1,
                                estado_concesion="denegado",
                            ))
                            puntajes_actualizados[s.id] = s.puntaje_prioridad + 1

        return asignaciones

    def _phase_2_fill_remaining(self, context: ContextData, asignaciones_phase1: List[AsignacionResult]) -> List[AsignacionResult]:
        """
        Phase 2: Fill remaining unassigned people into available franjas with slot rotation.
        Uses franja history to assign each person to the slot they haven't eaten in most recently.
        """
        # Find who's still unassigned
        asignados_ids = {a.colaborador_id for a in asignaciones_phase1 if a.estado_concesion == "otorgado"}
        unassigned = [c for c in context.pool_disponible if c.id not in asignados_ids]

        # Count capacity per franja (assume max 2 per slot)
        asignaciones = asignaciones_phase1.copy()
        asignados_por_franja = {}
        for a in asignaciones:
            if a.franja_orden >= 0:
                if a.franja_orden not in asignados_por_franja:
                    asignados_por_franja[a.franja_orden] = []
                asignados_por_franja[a.franja_orden].append(a.colaborador_id)

        # Fill remaining people using slot rotation
        for person in unassigned:
            # Build list of franjas allowed by restrictions
            allowed_franjas = []
            for franja_idx in range(self.num_franjas):
                if person.id in context.tareas_restringidas:
                    if franja_idx in context.tareas_restringidas[person.id]:
                        allowed_franjas.append(franja_idx)
                else:
                    allowed_franjas.append(franja_idx)

            if not allowed_franjas:
                continue  # Skip if no allowed franjas

            # Filter to only franjas with capacity (max 2 per slot)
            available_with_capacity = [
                f for f in allowed_franjas
                if f not in asignados_por_franja or len(asignados_por_franja[f]) < 2
            ]

            if available_with_capacity:
                # Use rotation logic to pick best franja
                try:
                    best_franja = find_least_recent_franja(
                        self.db, person.id, available_with_capacity, self.fecha
                    )
                except Exception:
                    # Fallback if franja_history fails
                    best_franja = available_with_capacity[0]

                asignaciones.append(AsignacionResult(
                    colaborador_id=person.id,
                    franja_orden=best_franja,
                    estado_concesion="otorgado",
                ))
                if best_franja not in asignados_por_franja:
                    asignados_por_franja[best_franja] = []
                asignados_por_franja[best_franja].append(person.id)
            else:
                # No capacity in preferred franjas, skip (will be unassigned)
                asignaciones.append(AsignacionResult(
                    colaborador_id=person.id,
                    franja_orden=-1,
                    estado_concesion="denegado",
                ))

        return asignaciones

    def _phase_3_validate_and_build(
        self,
        context: ContextData,
        asignaciones: List[AsignacionResult],
    ) -> Tuple[Dict[int, List[int]], Dict[int, int]]:
        """
        Phase 3: Validate final assignment.
        Returns: (cronograma dict, puntajes actualizados dict)
        """
        validator = CoberturaValidator(context.pool_disponible)

        # Build cronograma
        cronograma = {i: [] for i in range(self.num_franjas)}
        for a in asignaciones:
            if a.franja_orden >= 0:
                cronograma[a.franja_orden].append(a.colaborador_id)

        # Validate each franja
        excluidos = context.ausencias_colaborador_ids.copy()
        if context.orientador_id:
            excluidos.add(context.orientador_id)

        for franja_idx in range(self.num_franjas):
            asignados = cronograma[franja_idx]
            if not validator.satisfies_minimum_coverage(asignados, excluidos):
                raise Exception(
                    f"Validación final falló: Franja {franja_idx} no tiene cobertura mínima"
                )

        # Build puntajes actualizados (simplified for now)
        puntajes = {}
        for a in asignaciones:
            if a.colaborador_id not in puntajes:
                colab = next((c for c in context.pool_disponible if c.id == a.colaborador_id), None)
                if colab:
                    if a.estado_concesion == "otorgado":
                        puntajes[a.colaborador_id] = 0  # Reset
                    else:
                        puntajes[a.colaborador_id] = colab.puntaje_prioridad + 1

        return cronograma, puntajes
