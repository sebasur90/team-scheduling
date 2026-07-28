import client from './client'

export interface Colaborador {
  id: number
  nombre: string
  email: string
  sector: 'comercial' | 'operativo'
  estado_atencion: 'activo' | 'desafectado'
  rol: 'admin' | 'usuario'
  habilitado_orientador: boolean
  habilitado_gestion_externa: boolean
  puntaje_prioridad: number
  es_admin: boolean
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
