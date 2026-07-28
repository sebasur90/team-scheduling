import client from './client'

export interface PreferenciaCreate {
  fecha: string
  franja_horaria_id_deseada: number
}

export interface PreferenciaResponse {
  id: number
  colaborador_id: number
  fecha: string
  franja_horaria_id_deseada: number
  estado_concesion: string
  created_at: string
}

export const preferenciasApi = {
  create: (data: PreferenciaCreate) =>
    client.post<PreferenciaResponse>('/preferencias', data),
  get: (fecha: string, colaboradorId: number) =>
    client.get<PreferenciaResponse | null>(
      `/preferencias?fecha=${fecha}&colaborador_id=${colaboradorId}`
    ),
}
