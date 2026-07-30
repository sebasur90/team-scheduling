import client from './client'

export interface TareaEspecialTipo {
  id: number
  nombre: string
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
  created_at: string
  updated_at: string
}

export interface TareaEspecialTipoCreate {
  nombre: string
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
}

export interface TareaEspecialTipoUpdate {
  nombre?: string
  dia_semana_aplicable?: number[]
  hora_inicio?: string
  hora_fin?: string
}

export interface TareaEspecialAsignacion {
  fecha: string
  tarea_especial_tipo_id: number
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
}
