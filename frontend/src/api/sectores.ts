import client from './client'

export interface Sector {
  id: number
  nombre: string
  capacidad_maxima: number
  participa_almuerzo: boolean
  acceso_rol: 'gestion' | 'viewer'
  minimo_cobertura: number
  color: string
  created_at: string
  updated_at: string
}

export interface SectorCreate {
  nombre: string
  capacidad_maxima?: number
  participa_almuerzo?: boolean
  acceso_rol?: 'gestion' | 'viewer'
  minimo_cobertura?: number
  color?: string
}

export interface SectorUpdate {
  nombre?: string
  capacidad_maxima?: number
  participa_almuerzo?: boolean
  acceso_rol?: 'gestion' | 'viewer'
  minimo_cobertura?: number
  color?: string
}

export const sectoresApi = {
  list: () =>
    client.get<Sector[]>('/sectores'),
  create: (data: SectorCreate) =>
    client.post<Sector>('/sectores', data),
  update: (id: number, data: SectorUpdate) =>
    client.patch<Sector>(`/sectores/${id}`, data),
  delete: (id: number) =>
    client.delete(`/sectores/${id}`),
}
