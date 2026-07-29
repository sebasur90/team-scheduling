import client from './client'

export interface Ausencia {
  id: number
  colaborador_id: number
  fecha: string
  motivo: string
  created_at: string
}

export interface AusenciaCreateRango {
  colaborador_id: number
  fecha_inicio: string
  fecha_fin: string
}

export interface AusenciaDeleteBloque {
  colaborador_id: number
  fecha_inicio: string
  fecha_fin: string
}

export interface VacacionesBloque {
  colaborador_id: number
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  dias: string[]
}

export const ausenciasApi = {
  create: (data: AusenciaCreateRango) =>
    client.post<VacacionesBloque>('/ausencias', data),

  list: (colaboradorId?: number, mes?: string) =>
    client.get<Ausencia[]>('/ausencias', {
      params: {
        ...(colaboradorId && { colaborador_id: colaboradorId }),
        ...(mes && { mes }),
      },
    }),

  deleteBloque: (data: AusenciaDeleteBloque) =>
    client.delete('/ausencias/bloque', { data }),
}
