import client from './client'
import { FranjaHoraria } from './franjas'
import { Colaborador } from './auth'

export interface AsignacionResponse {
  id: number
  turno_almuerzo_id: number
  colaborador_id: number
  estado: string
  colaborador: Colaborador
  created_at: string
}

export interface TurnoAlmuerzoResponse {
  id: number
  fecha: string
  franja_horaria_id: number
  capacidad_maxima: number
  franja_horaria: FranjaHoraria
  asignaciones: AsignacionResponse[]
}

export interface TurnoListResponse {
  fecha: string
  franjas: TurnoAlmuerzoResponse[]
}

export const turnosApi = {
  list: (fecha: string) =>
    client.get<TurnoListResponse>(`/turnos?fecha=${fecha}`),
  updateAsignacion: (asignacionId: number, colaboradorId: number) =>
    client.patch(`/admin/turnos/asignaciones/${asignacionId}?colaborador_id=${colaboradorId}`),
  createAsignacion: (turnoId: number, colaboradorId: number) =>
    client.post<AsignacionResponse>(`/admin/turnos/${turnoId}/asignaciones`, { colaborador_id: colaboradorId }),
  deleteAsignacion: (asignacionId: number) =>
    client.delete(`/admin/turnos/asignaciones/${asignacionId}`),
  deleteTurno: (turnoId: number) =>
    client.delete(`/admin/turnos/${turnoId}`),
}
