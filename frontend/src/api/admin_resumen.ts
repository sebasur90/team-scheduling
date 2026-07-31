import client from './client'

export interface SwapResumenItem {
  id: number
  solicitante: string
  receptor: string
  fecha: string | null
  franja_origen: string | null
  franja_receptor: string | null
  hace: string
}

export interface TurnoSinConfirmarItem {
  id: number
  colaborador: string
  fecha: string
  franja: string
}

export interface CoberturaRiesgoItem {
  fecha: string
  franja: string
  estado: string
  detalle: string
}

export interface ResumenSection {
  count: number
  items: any[]
}

export interface AdminResumenResponse {
  swaps_pendientes: ResumenSection
  turnos_sin_confirmar: ResumenSection
  cobertura_en_riesgo: ResumenSection
  colaboradores_activos: number
}

export const adminResumenApi = {
  getResumen: () =>
    client.get<AdminResumenResponse>('/admin/resumen'),
}
