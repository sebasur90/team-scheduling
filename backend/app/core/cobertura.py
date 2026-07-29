from typing import List, Tuple, Dict, Set
from app.core.tipos import ColaboradorInfo


class CoberturaValidator:
    """Validates and tracks coverage requirements"""

    def __init__(self, colaboradores: List[ColaboradorInfo], minimos: Dict[str, int] = None):
        self.colaboradores = {c.id: c for c in colaboradores}
        # Default to current hardcoded behavior if not provided
        self.minimos = minimos or {"tipo_a": 1, "tipo_b": 1}

    def get_cobertura_status(
        self,
        asignados_en_franja: List[int],  # colaborador ids in this franja
        excluidos_o_ausentes: Set[int],  # who is NOT available in this franja
    ) -> Tuple[int, int]:
        """
        Returns: (tipo_a_activos, tipo_b_activos) among those NOT in this franja
        but ARE available/present that day
        """
        tipo_a_activos = 0
        tipo_b_activos = 0

        for colab_id, colab in self.colaboradores.items():
            # Skip if absent/excluded that day
            if colab_id in excluidos_o_ausentes:
                continue

            # Count only if NOT assigned to this franja
            if colab_id not in asignados_en_franja:
                # Only count activos
                if colab.estado_atencion == "activo":
                    if colab.sector == "tipo_a":
                        tipo_a_activos += 1
                    elif colab.sector == "tipo_b":
                        tipo_b_activos += 1

        return tipo_a_activos, tipo_b_activos

    def satisfies_minimum_coverage(
        self,
        asignados_en_franja: List[int],
        excluidos_o_ausentes: Set[int],
    ) -> bool:
        """Check if franja meets configured minimum coverage"""
        tipo_a, tipo_b = self.get_cobertura_status(asignados_en_franja, excluidos_o_ausentes)
        return tipo_a >= self.minimos["tipo_a"] and tipo_b >= self.minimos["tipo_b"]

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
