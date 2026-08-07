import client from './client'

export interface ConfiguracionRotacionMultiSector {
  modo: 'patron_fijo' | 'personalizado'
  patron_semanal: string[] | null
  distribucion_por_dia: Record<string, Record<string, number>> | null
  distribuciones_sector: Record<string, number>
}

export interface TareaEquipoCuota {
  id: number
  sector_id: number
  sector_nombre?: string
  personas_por_turno: number
  frecuencia: 'diaria' | 'semanal'
  veces_por_semana: number | null
  dia_tipo: 'fijo' | 'rotativo' | null
  dia_fijo: number | null
}

export interface TareaEquipoCuotaCreate {
  sector_id: number
  personas_por_turno: number
  frecuencia: 'diaria' | 'semanal'
  veces_por_semana?: number
  dia_tipo?: 'fijo' | 'rotativo'
  dia_fijo?: number
}

export interface TareaEspecialTipo {
  id: number
  nombre: string
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
  frecuencia: string
  inhabilita_almuerzo: boolean
  fecha_inicio_ciclo: string | null
  fija_almuerzo: boolean
  franja_almuerzo_id: number | null
  minimo_personas_dia: number
  maximo_personas_dia: number | null
  politica_minimo: 'alertar' | 'bloquear'
  configuracion_rotacion: ConfiguracionRotacionMultiSector | null
  cuotas_equipo: TareaEquipoCuota[]
  created_at: string
  updated_at: string
}

export interface TareaEspecialTipoCreate {
  nombre: string
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
  frecuencia?: string
  inhabilita_almuerzo?: boolean
  fecha_inicio_ciclo?: string | null
  fija_almuerzo?: boolean
  franja_almuerzo_id?: number | null
  minimo_personas_dia?: number
  maximo_personas_dia?: number | null
  politica_minimo?: 'alertar' | 'bloquear'
  configuracion_rotacion?: ConfiguracionRotacionMultiSector | null
  cuotas?: TareaEquipoCuotaCreate[]
}

export interface TareaEspecialTipoUpdate {
  nombre?: string
  dia_semana_aplicable?: number[]
  hora_inicio?: string
  hora_fin?: string
  frecuencia?: string
  inhabilita_almuerzo?: boolean
  fecha_inicio_ciclo?: string | null
  fija_almuerzo?: boolean
  franja_almuerzo_id?: number | null
  minimo_personas_dia?: number
  maximo_personas_dia?: number | null
  politica_minimo?: 'alertar' | 'bloquear'
  configuracion_rotacion?: ConfiguracionRotacionMultiSector | null
  cuotas?: TareaEquipoCuotaCreate[]
}

export interface TareaEspecialAsignacion {
  fecha: string
  tarea_especial_tipo_id: number
  colaborador_id: number
}

export interface TareaEspecialAsignacionDetalle {
  id: number
  fecha: string
  tarea_especial_tipo_id: number
  colaborador_id: number
  tipo_nombre: string
  colaborador_nombre: string
  inhabilita_almuerzo: boolean
  fija_almuerzo: boolean
  franja_almuerzo_id: number | null
}

export interface GenerarCronogramaRequest {
  fecha_inicio: string
  fecha_fin: string
  tipo_ids?: number[]
}

export interface GenerarCronogramaResponse {
  asignaciones_creadas: number
  asignaciones_saltadas: number
  advertencias: string[]
}

export interface MiTareaResponse {
  id: number
  fecha: string
  tipo_nombre: string
  hora_inicio: string
  hora_fin: string
  inhabilita_almuerzo: boolean
}

export interface SwapAsignacionRequest {
  colaborador_id: number
}

export const tareasEspecialesApi = {
  getTipos: () =>
    client.get<TareaEspecialTipo[]>('/tareas-especiales/tipos'),
  listTipos: () =>
    client.get<TareaEspecialTipo[]>('/tareas-especiales/tipos'),
  createTipo: (data: TareaEspecialTipoCreate) =>
    client.post<TareaEspecialTipo>('/tareas-especiales/tipos', data),
  updateTipo: (id: number, data: TareaEspecialTipoUpdate) =>
    client.put<TareaEspecialTipo>(`/tareas-especiales/tipos/${id}`, data),
  deleteTipo: (id: number) =>
    client.delete(`/tareas-especiales/tipos/${id}`),
  asignar: (data: TareaEspecialAsignacion) =>
    client.post('/tareas-especiales/asignaciones', data),
  desasignar: (tarea_id: number, fecha: string) =>
    client.delete(`/tareas-especiales/asignaciones/${tarea_id}/${fecha}`),
  generarCronograma: (data: GenerarCronogramaRequest) =>
    client.post<GenerarCronogramaResponse>('/tareas-especiales/generar-cronograma', data),
  getCronograma: (params: { fecha_inicio: string; fecha_fin: string }) =>
    client.get<TareaEspecialAsignacionDetalle[]>('/tareas-especiales/cronograma', { params }),
  swapAsignacion: (id: number, data: SwapAsignacionRequest) =>
    client.put<TareaEspecialAsignacionDetalle>(`/tareas-especiales/asignaciones/${id}`, data),
  getMisTareas: (dias?: number) =>
    client.get<MiTareaResponse[]>('/tareas-especiales/mis-tareas', { params: { dias: dias || 30 } }),
}
