import client from './client'

export interface ConfiguracionCobertura {
  id: number
  minimo_tipo_a: number
  minimo_tipo_b: number
  created_at: string
  updated_at: string
}

export interface ConfiguracionCoberturaUpdate {
  minimo_tipo_a: number
  minimo_tipo_b: number
}

export interface ConfiguracionNotificaciones {
  id: number
  aviso_previo_minutos: number
  tiempo_respuesta_colab_min: number
  tiempo_aceptacion_admin_min: number
  notificaciones_pausadas: boolean
  pausa_hasta: string | null
  hora_inicio_envio: string
  hora_fin_envio: string
  intervalo_recordatorio_min: number
  created_at: string
  updated_at: string
}

export interface ConfiguracionNotificacionesUpdate {
  aviso_previo_minutos?: number
  tiempo_respuesta_colab_min?: number
  tiempo_aceptacion_admin_min?: number
  notificaciones_pausadas?: boolean
  pausa_hasta?: string | null
  hora_inicio_envio?: string
  hora_fin_envio?: string
  intervalo_recordatorio_min?: number
}

export const configuracionApi = {
  getCobertura: () =>
    client.get<ConfiguracionCobertura>('/configuracion/cobertura'),

  updateCobertura: (data: ConfiguracionCoberturaUpdate) =>
    client.put<ConfiguracionCobertura>('/configuracion/cobertura', data),

  getNotificaciones: () =>
    client.get<ConfiguracionNotificaciones>('/configuracion/notificaciones'),

  updateNotificaciones: (data: ConfiguracionNotificacionesUpdate) =>
    client.put<ConfiguracionNotificaciones>('/configuracion/notificaciones', data),
}
