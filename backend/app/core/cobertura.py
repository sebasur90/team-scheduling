from typing import List, Dict, Set
from app.core.tipos import ColaboradorInfo


class CoberturaValidator:
    """Validates and tracks coverage requirements"""

    def __init__(self, colaboradores: List[ColaboradorInfo], minimos: Dict[int, int] = None):
        self.colaboradores = {c.id: c for c in colaboradores}
        # Default to 1 minimum per sector if not provided
        self.minimos = minimos or {}

    def get_cobertura_status(
        self,
        asignados_en_franja: List[int],  # colaborador ids in this franja
        excluidos_o_ausentes: Set[int],  # who is NOT available in this franja
    ) -> Dict[int, int]:
        """
        Returns: Dict mapping sector_id -> count of active colaboradores NOT in this franja
        but ARE available/present that day
        """
        cobertura_por_sector = {}

        for colab_id, colab in self.colaboradores.items():
            # Skip if absent/excluded that day
            if colab_id in excluidos_o_ausentes:
                continue

            # Count only if NOT assigned to this franja
            if colab_id not in asignados_en_franja:
                # Only count activos
                if colab.estado_atencion == "activo":
                    sector_id = colab.sector_id
                    cobertura_por_sector[sector_id] = cobertura_por_sector.get(sector_id, 0) + 1

        return cobertura_por_sector

    def satisfies_minimum_coverage(
        self,
        asignados_en_franja: List[int],
        excluidos_o_ausentes: Set[int],
    ) -> bool:
        """Check if franja meets configured minimum coverage"""
        cobertura = self.get_cobertura_status(asignados_en_franja, excluidos_o_ausentes)
        # Check each sector's minimum
        for sector_id, minimo in self.minimos.items():
            if cobertura.get(sector_id, 0) < minimo:
                return False
        return True

    def can_remove_person_safely(
        self,
        colaborador_id: int,
        asignados_en_franja: List[int],
        excluidos_o_ausentes: Set[int],
    ) -> bool:
        """Check if removing a person would break coverage"""
        # Simulate removal
        remaining = [c for c in asignados_en_franja if c != colaborador_id]
        return self.satisfies_minimum_coverage(remaining, excluidos_o_ausentes)
