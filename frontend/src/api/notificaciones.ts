import client from './client'

export interface FranjaDetalles {
  id: number
  hora_inicio: string
  hora_fin: string
  orden: number
}

export interface Notificacion {
  id: number
  colaborador_id?: number
  tipo: string
  mensaje: string
  leida: boolean
  referencia_id?: number
  referencia_tipo?: string
  canal?: string
  fecha?: string
  estado?: 'pendiente' | 'aceptada' | 'expirada'
  created_at: string
  franja_detalles?: FranjaDetalles
}

export const notificacionesApi = {
  list: () =>
    client.get<Notificacion[]>('/notificaciones'),

  aceptarCambioFranja: (notificationId: number) =>
    client.post<{ status: string; asignacion_anterior: number; asignacion_nueva: number }>(
      `/notificaciones/${notificationId}/aceptar-cambio-franja`
    ),

  responder: (notificationId: number, respuesta: 'si' | 'no') =>
    client.post(`/notificaciones/${notificationId}/responder`, { respuesta }),

  marcarLeida: (notificationId: number) =>
    client.patch(`/notificaciones/${notificationId}/leer`),
}
