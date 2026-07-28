import client from './client'
import { Colaborador } from './auth'

export interface ColaboradorCreate {
  nombre: string
  email: string
  sector: 'comercial' | 'operativo'
  estado_atencion?: 'activo' | 'desafectado'
  rol?: 'admin' | 'usuario'
  habilitado_orientador?: boolean
  habilitado_gestion_externa?: boolean
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
}
