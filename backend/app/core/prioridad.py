from typing import List, Tuple, Optional
from app.core.tipos import ColaboradorInfo, ConflictoEmpate


class PrioridadResolver:
    """Handles priority-based assignment and tie resolution"""

    @staticmethod
    def sort_by_priority_desc(colaboradores: List[ColaboradorInfo]) -> List[ColaboradorInfo]:
        """Sort by puntaje_prioridad descending"""
        return sorted(colaboradores, key=lambda c: c.puntaje_prioridad, reverse=True)

    @staticmethod
    def find_tie_at_boundary(
        sorted_colabs: List[ColaboradorInfo],
        num_to_assign: int,
    ) -> Optional[Tuple[int, List[int]]]:
        """
        Check if there's a tie at the boundary of assignment.
        Returns: (tied_priority, [colaborador_ids at boundary]) or None
        """
        if num_to_assign <= 0 or num_to_assign > len(sorted_colabs):
            return None

        boundary_priority = sorted_colabs[num_to_assign - 1].puntaje_prioridad

        # Find all at this priority level
        tied_ids = [
            c.id for c in sorted_colabs if c.puntaje_prioridad == boundary_priority
        ]

        # Only report if multiple people at boundary
        if len(tied_ids) > 1:
            return boundary_priority, tied_ids

        return None

    @staticmethod
    def select_for_assignment(
        candidatos: List[ColaboradorInfo],
        num_spots: int,
    ) -> Tuple[List[ColaboradorInfo], List[ConflictoEmpate], List[int]]:
        """
        Select colaboradores for assignment based on priority.

        Returns:
            - List of selected (up to num_spots)
            - List of conflicts (empates)
            - List of deselected ids (those who didn't get a spot)
        """
        if not candidatos:
            return [], [], []

        sorted_colabs = PrioridadResolver.sort_by_priority_desc(candidatos)

        # Check for ties at boundary
        conflicts = []
        tie_info = PrioridadResolver.find_tie_at_boundary(sorted_colabs, num_spots)

        if tie_info:
            boundary_priority, tied_ids = tie_info
            conflicts.append(
                ConflictoEmpate(
                    franja_orden=-1,  # Will be set by caller
                    colaborador_1_id=tied_ids[0],
                    colaborador_2_id=tied_ids[1] if len(tied_ids) > 1 else tied_ids[0],
                    puntaje_prioridad=boundary_priority,
                    sector=sorted_colabs[0].sector,
                )
            )

        # Assign up to num_spots (excluding ties at boundary if conflict exists)
        selected = sorted_colabs[:num_spots]
        deselected_ids = [c.id for c in sorted_colabs[num_spots:]]

        return selected, conflicts, deselected_ids
