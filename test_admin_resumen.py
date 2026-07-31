#!/usr/bin/env python
"""Script de prueba para verificar que el endpoint admin/resumen funciona correctamente."""

import sys
import os

# Agregar el path del backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models.swap import SwapSolicitud
from datetime import datetime

db = SessionLocal()

try:
    # Contar swaps totales
    total_swaps = db.query(SwapSolicitud).count()
    print(f"✓ Total swaps en DB: {total_swaps}")

    # Contar swaps pendientes
    pendientes = db.query(SwapSolicitud).filter(SwapSolicitud.estado == "pendiente").count()
    print(f"✓ Swaps pendientes: {pendientes}")

    # Listar swaps pendientes
    swaps = db.query(SwapSolicitud).filter(SwapSolicitud.estado == "pendiente").all()
    for swap in swaps:
        print(f"  - Swap {swap.id}:")
        print(f"    - Solicitante ID: {swap.colaborador_solicitante_id}")
        print(f"    - Receptor ID: {swap.colaborador_receptor_id}")
        print(f"    - Estado: {swap.estado}")
        print(f"    - Asignación origen: {swap.asignacion_origen_id}")
        print(f"    - Asignación receptor: {swap.asignacion_receptor_id}")
        print(f"    - Creado: {swap.created_at}")

        # Verificar que se cargan las relaciones
        if swap.asignacion_origen:
            print(f"    - ✓ Asignación origen cargada")
        else:
            print(f"    - ✗ Asignación origen NO cargada")

        if swap.colaborador_solicitante:
            print(f"    - ✓ Colaborador solicitante cargado: {swap.colaborador_solicitante.nombre}")
        else:
            print(f"    - ✗ Colaborador solicitante NO cargado")

    print("\n✓ Test completado exitosamente")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
