import client from './client'

export interface FranjaHoraria {
  id: number
  hora_inicio: string
  hora_fin: string
  orden: number
}

export interface FranjaCreate {
  hora_inicio: string
  hora_fin: string
  orden: number
}

export const franjasApi = {
  list: () =>
    client.get<FranjaHoraria[]>('/franjas'),
  create: (data: FranjaCreate) =>
    client.post<FranjaHoraria>('/franjas', data),
  update: (id: number, data: Partial<FranjaCreate>) =>
    client.patch<FranjaHoraria>(`/franjas/${id}`, data),
  delete: (id: number) =>
    client.delete(`/franjas/${id}`),
}
