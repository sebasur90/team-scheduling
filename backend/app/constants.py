from datetime import time, timedelta
from typing import List, Tuple

# Fixed franjas: 5 franjas starting at 30-minute intervals
FRANJAS_CONFIG: List[Tuple[time, time, int]] = [
    (time(12, 0), time(12, 45), 1),    # Franja 1
    (time(12, 30), time(13, 15), 2),   # Franja 2
    (time(13, 0), time(13, 45), 3),    # Franja 3
    (time(13, 30), time(14, 15), 4),   # Franja 4
    (time(14, 0), time(14, 45), 5),    # Franja 5
]

# Special tasks configuration
SPECIAL_TASKS = {
    "orientador": {
        "nombre": "orientador",
        "dias_semana": [0, 1, 2, 3, 4],  # Monday-Friday
        "hora_inicio": time(10, 0),
        "hora_fin": time(15, 0),
        "cantidad": 1,
    },
    "municipalidad": {
        "nombre": "municipalidad",
        "dias_semana": [2],  # Wednesday
        "hora_inicio": time(11, 0),
        "hora_fin": time(13, 0),
        "cantidad": 1,
        "franjas_permitidas": [2, 3, 4],  # Franjas 3, 4, 5 (indices in FRANJAS_CONFIG)
    },
    "gandulfo": {
        "nombre": "gandulfo",
        "dias_semana": [3],  # Thursday
        "hora_inicio": time(10, 0),
        "hora_fin": time(13, 0),
        "cantidad": 1,
        "franjas_permitidas": [2, 3, 4],  # Franjas 3, 4, 5
    },
}
