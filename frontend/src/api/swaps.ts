import client from './client'

export interface SwapResponse {
  id: number
  asignacion_origen_id: number
  asignacion_receptor_id: number | null
  colaborador_solicitante_id: number
  colaborador_receptor_id: number
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado'
  motivo_rechazo: string | null
  created_at: string
  fecha: string | null
  franja_origen_hora: string | null
  franja_receptor_hora: string | null
  nombre_solicitante: string | null
  nombre_receptor: string | null
}

export const swapsApi = {
  create: (asignacion_origen_id: number, asignacion_receptor_id: number) =>
    client.post<SwapResponse>('/swaps', { asignacion_origen_id, asignacion_receptor_id }),
  list: () =>
    client.get<SwapResponse[]>('/swaps'),
  aceptar: (id: number) =>
    client.post<SwapResponse>(`/swaps/${id}/aceptar`),
  rechazar: (id: number, motivo?: string) =>
    client.post<SwapResponse>(`/swaps/${id}/rechazar`, { motivo }),
  cancelar: (id: number) =>
    client.post<SwapResponse>(`/swaps/${id}/cancelar`),
}
