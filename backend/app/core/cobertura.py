from typing import List, Tuple, Dict, Set
from app.core.tipos import ColaboradorInfo


class CoberturaValidator:
    """Validates and tracks coverage requirements"""

    def __init__(self, colaboradores: List[ColaboradorInfo]):
        self.colaboradores = {c.id: c for c in colaboradores}

    def get_cobertura_status(
        self,
        asignados_en_franja: List[int],  # colaborador ids in this franja
        excluidos_o_ausentes: Set[int],  # who is NOT available in this franja
    ) -> Tuple[int, int]:
        """
        Returns: (comercial_activos, operativo_activos) among those NOT in this franja
        but ARE available/present that day
        """
        comercial_activos = 0
        operativo_activos = 0

        for colab_id, colab in self.colaboradores.items():
            # Skip if absent/excluded that day
            if colab_id in excluidos_o_ausentes:
                continue

            # Count only if NOT assigned to this franja
            if colab_id not in asignados_en_franja:
                # Only count activos
                if colab.estado_atencion == "activo":
                    if colab.sector == "comercial":
                        comercial_activos += 1
                    elif colab.sector == "operativo":
                        operativo_activos += 1

        return comercial_activos, operativo_activos

    def satisfies_minimum_coverage(
        self,
        asignados_en_franja: List[int],
        excluidos_o_ausentes: Set[int],
    ) -> bool:
        """Check if franja maintains >=1 Comercial-activo and >=1 Operativo-activo"""
        comercial, operativo = self.get_cobertura_status(asignados_en_franja, excluidos_o_ausentes)
        return comercial >= 1 and operativo >= 1

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
