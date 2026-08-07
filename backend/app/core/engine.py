from datetime import date
from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import (
    Colaborador, Ausencia, TareaEspecialAsignacion, TareaEspecialTipo, FranjaHoraria, TurnoAlmuerzo, Sector
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

            # Assignments forced by fija_almuerzo special tasks (bypass preferences/rotation)
            asignaciones_fijadas = self._build_fixed_assignments(context)

            # Phase 1: Resolve preferences
            asignaciones_phase1 = asignaciones_fijadas + self._phase_1_resolve_preferences(context)

            # Phase 2: Fill remaining people
            asignaciones_all = self._phase_2_fill_remaining(context, asignaciones_phase1)

            # Phase 3: Final validation
            cronograma, puntajes, advertencias = self._phase_3_validate_and_build(context, asignaciones_all)

            fijaciones_tarea = {
                cid: info["tarea_especial_asignacion_id"] for cid, info in context.fijados_por_tarea.items()
            }

            return AssignmentResult(
                success=True,
                cronograma=cronograma,
                asignaciones=asignaciones_all,
                puntajes_actualizados=puntajes,
                excluidos_por_tarea=list(context.usuarios_con_tarea_excluyente),
                advertencias=advertencias,
                fijaciones_tarea=fijaciones_tarea,
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
        # Load minimos_cobertura from sectors table
        sectores = self.db.query(Sector).all()
        minimos_cobertura = {s.id: s.minimo_cobertura for s in sectores}

        # Load ausencias
        ausencias = self.db.query(Ausencia).filter(Ausencia.fecha == self.fecha).all()
        ausentes_ids = {a.colaborador_id for a in ausencias}

        # Load all colaboradores
        colaboradores = self.db.query(Colaborador).all()
        colab_map = {c.id: c for c in colaboradores}

        # Find tareas excluyentes (inhabilita_almuerzo) and orientador for legacy compatibility
        usuarios_con_tarea_excluyente = set()
        tareas_excluyentes = (
            self.db.query(TareaEspecialAsignacion)
            .join(TareaEspecialTipo)
            .filter(
                TareaEspecialAsignacion.fecha == self.fecha,
                TareaEspecialTipo.inhabilita_almuerzo == True,
            ).all()
        )
        for tarea in tareas_excluyentes:
            usuarios_con_tarea_excluyente.add(tarea.colaborador_id)

        # Set orientador_id for legacy (take first from excluyentes or None)
        orientador_id = next(iter(usuarios_con_tarea_excluyente), None)

        # Find tareas that fija_almuerzo (force a specific franja, mutually exclusive with inhabilita_almuerzo)
        franjas_by_id = {f.id: f.orden - 1 for f in self.db.query(FranjaHoraria).all()}
        fijados_por_tarea = {}
        tareas_fijas = (
            self.db.query(TareaEspecialAsignacion, TareaEspecialTipo.franja_almuerzo_id)
            .join(TareaEspecialTipo)
            .filter(
                TareaEspecialAsignacion.fecha == self.fecha,
                TareaEspecialTipo.fija_almuerzo == True,
            ).all()
        )
        for tarea, franja_id in tareas_fijas:
            franja_orden = franjas_by_id.get(franja_id)
            if franja_orden is not None:
                fijados_por_tarea[tarea.colaborador_id] = {
                    "franja_orden": franja_orden,
                    "tarea_especial_asignacion_id": tarea.id,
                }

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
        sector_map = {s.id: s for s in sectores}
        for colab in colaboradores:
            if colab.id in ausentes_ids or colab.id in usuarios_con_tarea_excluyente:
                continue
            tarea_tipos_ids = [t.tarea_tipo_id for t in colab.tareas_habilitadas]
            sector = sector_map.get(colab.sector_id)
            pool.append(
                ColaboradorInfo(
                    id=colab.id,
                    nombre=colab.nombre,
                    sector_id=colab.sector_id,
                    sector_nombre=sector.nombre if sector else "unknown",
                    participa_almuerzo=sector.participa_almuerzo if sector else True,
                    estado_atencion=colab.estado_atencion,
                    puntaje_prioridad=colab.puntaje_prioridad,
                    tarea_tipos_ids=tarea_tipos_ids,
                )
            )

        # Load preferences from colaborador.franja_preferida_id (general preference, not per-date)
        preferencias = {}
        for colab in colaboradores:
            if (
                colab.id not in ausentes_ids
                and colab.id not in usuarios_con_tarea_excluyente
                and colab.id not in fijados_por_tarea
                and colab.franja_preferida_id is not None
            ):
                preferencias[colab.id] = colab.franja_preferida_id - 1  # Store as 0-indexed

        return ContextData(
            fecha=self.fecha,
            ausencias_colaborador_ids=ausentes_ids,
            orientador_id=orientador_id,
            usuarios_con_tarea_excluyente=usuarios_con_tarea_excluyente,
            tareas_restringidas=tareas_restringidas,
            fijados_por_tarea=fijados_por_tarea,
            pool_disponible=pool,
            preferencias=preferencias,
            minimos_cobertura=minimos_cobertura,
            sector_map=sector_map,
        )

    def _build_fixed_assignments(self, context: ContextData) -> List[AsignacionResult]:
        """
        Assignments forced by a fija_almuerzo special task. These bypass preference
        resolution and rotation entirely — the person is pinned to franja_almuerzo_id.
        """
        return [
            AsignacionResult(
                colaborador_id=colaborador_id,
                franja_orden=info["franja_orden"],
                estado_concesion="otorgado",
            )
            for colaborador_id, info in context.fijados_por_tarea.items()
        ]

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
        validator = CoberturaValidator(context.pool_disponible, context.minimos_cobertura)

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
                # Group by sector_id
                por_sector = {}
                for s in solicitantes_validos:
                    if s.sector_id not in por_sector:
                        por_sector[s.sector_id] = []
                    por_sector[s.sector_id].append(s)

                # For each sector, determine how many can be assigned
                for sector_id, candidatos in por_sector.items():
                    # Simulate: if we remove all of this sector, do we still have coverage?
                    simulated = asignados_por_franja[franja_idx] + [s.id for c in por_sector.values() if c != candidatos for s in c]
                    cobertura_status = validator.get_cobertura_status(simulated, excluidos)

                    # Check if this sector can accept more people
                    sector_minimo = context.minimos_cobertura.get(sector_id, 1)
                    sector_disponible = cobertura_status.get(sector_id, 0)
                    available_spots = 1 if sector_disponible < sector_minimo else 0

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
        # Load franja capacities
        franjas_info = self.db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
        franja_capacities = {f.orden - 1: f.capacidad_maxima for f in franjas_info}

        # Find who's still unassigned
        asignados_ids = {a.colaborador_id for a in asignaciones_phase1 if a.estado_concesion == "otorgado"}
        unassigned = [c for c in context.pool_disponible if c.id not in asignados_ids]

        # Count capacity per franja
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

            # Filter to only franjas with capacity
            capacity_map = franja_capacities
            available_with_capacity = [
                f for f in allowed_franjas
                if f not in asignados_por_franja or len(asignados_por_franja[f]) < capacity_map.get(f, 2)
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
    ) -> Tuple[Dict[int, List[int]], Dict[int, int], List[str]]:
        """
        Phase 3: Validate final assignment and build cronograma with warnings.
        Returns: (cronograma dict, puntajes actualizados dict, advertencias list)
        """
        validator = CoberturaValidator(context.pool_disponible, context.minimos_cobertura)
        advertencias = []

        # Build cronograma
        cronograma = {i: [] for i in range(self.num_franjas)}
        for a in asignaciones:
            if a.franja_orden >= 0:
                cronograma[a.franja_orden].append(a.colaborador_id)

        # Validate each franja
        excluidos = context.ausencias_colaborador_ids.copy()
        if context.orientador_id:
            excluidos.add(context.orientador_id)

        # Get franja info for readable output
        franjas_info = self.db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
        franja_map = {f.orden - 1: f for f in franjas_info}  # orden is 1-indexed

        for franja_idx in range(self.num_franjas):
            asignados = cronograma[franja_idx]
            if not validator.satisfies_minimum_coverage(asignados, excluidos):
                # Get coverage status for warning message
                cobertura_status = validator.get_cobertura_status(asignados, excluidos)
                franja_info = franja_map.get(franja_idx)
                if franja_info:
                    hora_str = f"{franja_info.hora_inicio.strftime('%H:%M')}-{franja_info.hora_fin.strftime('%H:%M')}"
                else:
                    hora_str = f"Franja {franja_idx + 1}"

                # Build warning message
                problemas = []
                for sector_id, minimo in context.minimos_cobertura.items():
                    actual = cobertura_status.get(sector_id, 0)
                    if actual < minimo:
                        sector = context.sector_map.get(sector_id)
                        sector_nombre = sector.nombre if sector else f"Sector {sector_id}"
                        problemas.append(f"{sector_nombre}: {actual}/{minimo}")

                advertencia = f"Franja {franja_idx + 1} ({hora_str}): cobertura mínima no alcanzada ({', '.join(problemas)})"
                advertencias.append(advertencia)

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

        return cronograma, puntajes, advertencias
