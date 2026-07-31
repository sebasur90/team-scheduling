import client from './client'

// Ausencias
export interface AusenciaDetalle {
  id: number
  colaborador_id: number
  nombre_colaborador: string
  sector_id: number
  fecha: string
  motivo: string
  created_at: string
}

export interface RankingAusencia {
  colaborador_id: number
  nombre: string
  sector_id: number
  cantidad_ausencias: number
  porcentaje_semana: number
}

export interface ResumenAusencias {
  ranking: RankingAusencia[]
  detalle: AusenciaDetalle[]
  total_registros: number
  periodo: { fecha_inicio: string; fecha_fin: string }
}

// Franjas
export interface DistribucionFranjaItem {
  fecha: string
  franja_id: number
  franja_nombre: string
  hora_inicio: string
  hora_fin: string
  asignados: number
  ausentes: number
  capacidad: number
  disponibles_backlog: number
}

export interface CumplimientoPreferencia {
  colaborador_id: number
  nombre: string
  sector_id: number
  franja_preferida_id: number | null
  franja_preferida_nombre: string | null
  total_asignaciones: number
  asignaciones_en_preferencia: number
  porcentaje_cumplimiento: number
}

export interface CoberturaPorFranja {
  franja_id: number
  franja_nombre: string
  hora_inicio: string
  hora_fin: string
  orden: number
  ocupacion_promedio: number
  capacidad_promedio: number
  porcentaje_cobertura: number
}

export interface ResumenFranjas {
  distribucion: DistribucionFranjaItem[]
  cumplimiento_preferencias: CumplimientoPreferencia[]
  cobertura_real: CoberturaPorFranja[]
  periodo: { fecha_inicio: string; fecha_fin: string }
}

// Swaps
export interface SwapDetalle {
  id: number
  solicitante_id: number
  solicitante_nombre: string
  receptor_id: number
  receptor_nombre: string
  fecha: string
  franja_origen: string
  franja_receptor: string
  estado: string
  motivo_rechazo: string | null
  created_at: string
  dias_antiguedad: number
}

export interface RankingSwapColaborador {
  colaborador_id: number
  nombre: string
  sector_id: number
  swaps_pendientes: number
  swaps_aceptados: number
  swaps_rechazados: number
  total: number
}

export interface EstadisticasSwaps {
  total_pendientes: number
  total_aceptados: number
  total_rechazados: number
  total_general: number
}

export interface ResumenSwaps {
  ranking: RankingSwapColaborador[]
  detalle: SwapDetalle[]
  estadisticas: EstadisticasSwaps
  periodo: { fecha_inicio: string; fecha_fin: string }
}

export const adminReportesApi = {
  getAusencias: (fechaInicio: string, fechaFin: string, sectorId?: number) => {
    const params = new URLSearchParams({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    if (sectorId) params.append('sector_id', sectorId.toString())
    return client.get<ResumenAusencias>(`/admin/reportes/ausencias?${params.toString()}`)
  },

  getFranjas: (fechaInicio: string, fechaFin: string, sectorId?: number) => {
    const params = new URLSearchParams({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    if (sectorId) params.append('sector_id', sectorId.toString())
    return client.get<ResumenFranjas>(`/admin/reportes/franjas?${params.toString()}`)
  },

  getSwaps: (fechaInicio: string, fechaFin: string, sectorId?: number) => {
    const params = new URLSearchParams({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    if (sectorId) params.append('sector_id', sectorId.toString())
    return client.get<ResumenSwaps>(`/admin/reportes/swaps?${params.toString()}`)
  },

  exportCsv: (seccion: 'ausencias' | 'franjas' | 'swaps', fechaInicio: string, fechaFin: string, sectorId?: number) => {
    const params = new URLSearchParams({
      seccion,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    if (sectorId) params.append('sector_id', sectorId.toString())
    return client.get(`/admin/reportes/export/csv?${params.toString()}`, {
      responseType: 'blob',
    })
  },

  exportPdf: (seccion: 'ausencias' | 'franjas' | 'swaps', fechaInicio: string, fechaFin: string, sectorId?: number) => {
    const params = new URLSearchParams({
      seccion,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    if (sectorId) params.append('sector_id', sectorId.toString())
    return client.get(`/admin/reportes/export/pdf?${params.toString()}`, {
      responseType: 'blob',
    })
  },
}
