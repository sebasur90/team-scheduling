from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional, Tuple
from enum import Enum


@dataclass
class ColaboradorInfo:
    """Lightweight colaborador data for algorithm"""
    id: int
    nombre: str
    sector: str  # 'comercial' or 'operativo'
    estado_atencion: str  # 'activo' or 'desafectado'
    puntaje_prioridad: int = 0


@dataclass
class AsignacionInfo:
    """Info about a single assignment"""
    colaborador_id: int
    franja_orden: int
    puntaje_prioridad: int


@dataclass
class ConflictoEmpate:
    """Conflict that needs admin resolution"""
    franja_orden: int
    colaborador_1_id: int
    colaborador_2_id: int
    puntaje_prioridad: int
    sector: str
    razon: str = "Dos colaboradores del mismo sector con igual puntaje compitiendo por la misma franja"


@dataclass
class ContextData:
    """Context for assignment algorithm on a given date"""
    fecha: date
    # Collaborative exclusions
    ausencias_colaborador_ids: set  # Who is absent that day
    orientador_id: Optional[int] = None  # Excluded from almuerzo
    # Special tasks with franja restrictions
    tareas_restringidas: Dict[int, List[int]] = field(default_factory=dict)  # colaborador_id -> allowed franjas
    # Available pool
    pool_disponible: List[ColaboradorInfo] = field(default_factory=list)
    # Preferences loaded
    preferencias: Dict[int, int] = field(default_factory=dict)  # colaborador_id -> franja_orden


@dataclass
class AsignacionResult:
    """Result of an assignment"""
    colaborador_id: int
    franja_orden: int
    estado_concesion: str  # 'otorgado', 'denegado'


@dataclass
class AssignmentResult:
    """Full assignment result"""
    success: bool
    error: Optional[str] = None
    cronograma: Dict[int, List[int]] = field(default_factory=dict)  # franja_orden -> [colaborador_ids]
    asignaciones: List[AsignacionResult] = field(default_factory=list)
    conflictos_pendientes: List[ConflictoEmpate] = field(default_factory=list)
    puntajes_actualizados: Dict[int, int] = field(default_factory=dict)  # colaborador_id -> new score
