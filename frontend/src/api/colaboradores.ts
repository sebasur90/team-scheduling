import client from './client'
import { Colaborador } from './auth'

export interface ColaboradorCreate {
  nombre: string
  email: string
  sector_id: number
  estado_atencion?: 'activo' | 'desafectado'
  rol?: 'admin' | 'usuario' | 'viewer'
  tarea_tipo_ids?: number[]
}

export const colaboradoresApi = {
  list: () =>
    client.get<Colaborador[]>('/colaboradores'),

  get: (id: number) =>
    client.get<Colaborador>(`/colaboradores/${id}`),

  create: (data: ColaboradorCreate) =>
    client.post<Colaborador>('/colaboradores', data),

  update: (id: number, data: Partial<Colaborador>) =>
    client.patch<Colaborador>(`/colaboradores/${id}`, data),

  updatePreference: (franjaId: number | null) =>
    client.patch<Colaborador>('/colaboradores/me/preferencia', {
      franja_horaria_id: franjaId,
    }),
}
