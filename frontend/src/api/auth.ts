import client from './client'

export interface Colaborador {
  id: number
  nombre: string
  email: string
  sector_id: number
  estado_atencion: 'activo' | 'desafectado'
  rol: 'admin' | 'usuario' | 'viewer'
  puntaje_prioridad: number
  es_admin: boolean
  franja_preferida_id?: number | null
  tarea_tipo_ids: number[]
  created_at: string
  updated_at: string
}

export interface LoginResponse {
  token: string
  user: Colaborador
}

export const authApi = {
  login: (email: string) =>
    client.post<LoginResponse>('/auth/login', { email }),

  me: () =>
    client.get<Colaborador>('/auth/me'),
}
