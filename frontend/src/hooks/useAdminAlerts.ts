import { useEffect, useState, useRef } from 'react'
import { adminResumenApi, AdminResumenResponse } from '../api/admin_resumen'

export function useAdminAlerts(enabled: boolean = true) {
  const [alerts, setAlerts] = useState<AdminResumenResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const fetchAlerts = async () => {
      try {
        const res = await adminResumenApi.getResumen()
        setAlerts(res.data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching admin alerts:', err)
        setError(err.message || 'Error fetching alerts')
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately
    fetchAlerts()

    // Polling cada 60 segundos
    intervalRef.current = setInterval(fetchAlerts, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled])

  return { alerts, loading, error }
}
