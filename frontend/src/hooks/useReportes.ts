import { useEffect, useState } from 'react'
import {
  adminReportesApi,
  ResumenAusencias,
  ResumenFranjas,
  ResumenSwaps,
} from '../api/admin_reportes'

interface UseReportesParams {
  fechaInicio: string
  fechaFin: string
  sectorId?: number
}

export function useReportesAusencias(params: UseReportesParams) {
  const [data, setData] = useState<ResumenAusencias | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await adminReportesApi.getAusencias(params.fechaInicio, params.fechaFin, params.sectorId)
        setData(res.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching ausencias:', err)
        setError(err.message || 'Error cargando ausencias')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [params.fechaInicio, params.fechaFin, params.sectorId])

  return { data, loading, error }
}

export function useReportesFranjas(params: UseReportesParams) {
  const [data, setData] = useState<ResumenFranjas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await adminReportesApi.getFranjas(params.fechaInicio, params.fechaFin, params.sectorId)
        setData(res.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching franjas:', err)
        setError(err.message || 'Error cargando franjas')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [params.fechaInicio, params.fechaFin, params.sectorId])

  return { data, loading, error }
}

export function useReportesSwaps(params: UseReportesParams) {
  const [data, setData] = useState<ResumenSwaps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await adminReportesApi.getSwaps(params.fechaInicio, params.fechaFin, params.sectorId)
        setData(res.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching swaps:', err)
        setError(err.message || 'Error cargando swaps')
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [params.fechaInicio, params.fechaFin, params.sectorId])

  return { data, loading, error }
}
