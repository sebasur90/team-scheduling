import client from './client'
import { FranjaHoraria } from './franjas'
import { Colaborador } from './auth'

export interface AsignacionResponse {
  id: number
  turno_almuerzo_id: number
  colaborador_id: number
  estado: string
  tarea_especial_asignacion_id: number | null
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

export interface GenerarSemanaResponse {
  status: string
  semana: string
  turnos_generados: TurnoAlmuerzoResponse[]
  conflictos: Array<{ fecha: string; conflicto: string }>
  dias_salteados: Array<{ fecha: string; motivo: string }>
  dias_con_advertencia: Array<{ fecha: string; advertencias: string[] }>
  dias_con_error: Array<{ fecha: string; error: string }>
  mensaje: string
}

export interface ConfirmarSemanaResponse {
  status: string
  semana: string
  turnos_confirmados: TurnoAlmuerzoResponse[]
  mensaje: string
}

export const turnosApi = {
  list: (fecha: string) =>
    client.get<TurnoListResponse>(`/turnos?fecha=${fecha}`),
  generateWeek: (semana: string) =>
    client.post<GenerarSemanaResponse>(`/admin/turnos/generar-semana?semana=${semana}`),
  generateDay: (fecha: string) =>
    client.post<GenerarSemanaResponse>(`/admin/turnos/generate-day`, { fecha }),
  confirmWeek: (semana: string) =>
    client.post<ConfirmarSemanaResponse>(`/admin/turnos/confirmar-semana?semana=${semana}`),
  updateAsignacion: (asignacionId: number, colaboradorId: number) =>
    client.patch(`/admin/turnos/asignaciones/${asignacionId}?colaborador_id=${colaboradorId}`),
  createAsignacion: (turnoId: number, colaboradorId: number) =>
    client.post<AsignacionResponse>(`/admin/turnos/${turnoId}/asignaciones`, { colaborador_id: colaboradorId }),
  deleteAsignacion: (asignacionId: number) =>
    client.delete(`/admin/turnos/asignaciones/${asignacionId}`),
  deleteTurno: (turnoId: number) =>
    client.delete(`/admin/turnos/${turnoId}`),
}
