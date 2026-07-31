import React, { useState } from 'react'
import { swapsApi } from '../api/swaps'
import type { UserNotification } from '../hooks/useUserNotifications'
import './SwapPendingBanner.css'

interface Props {
  notificaciones: UserNotification[]
}

export const SwapPendingBanner: React.FC<Props> = ({ notificaciones }) => {
  const [isResponding, setIsResponding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtrar swaps solicitados pendientes
  const swapsPendientes = notificaciones.filter(
    (n) => n.tipo === 'swap_solicitado' && n.estado === 'pendiente'
  )

  if (!swapsPendientes || swapsPendientes.length === 0) {
    return null
  }

  const primerSwap = swapsPendientes[0]
  const swapsRestantes = swapsPendientes.length - 1

  const handleAceptar = async () => {
    setIsResponding(true)
    setError(null)
    try {
      // referencia_id contiene el swap_id
      const swapId = primerSwap.incidencia_id ? parseInt(primerSwap.incidencia_id) : primerSwap.id
      await swapsApi.aceptar(swapId)
      window.dispatchEvent(new CustomEvent('swap-updated'))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Error al aceptar el intercambio')
    } finally {
      setIsResponding(false)
    }
  }

  const handleRechazar = async () => {
    setIsResponding(true)
    setError(null)
    try {
      const swapId = primerSwap.incidencia_id ? parseInt(primerSwap.incidencia_id) : primerSwap.id
      await swapsApi.rechazar(swapId, 'Rechazado desde banner')
      window.dispatchEvent(new CustomEvent('swap-updated'))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Error al rechazar el intercambio')
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div className="swap-pending-banner">
      <div className="banner-content">
        <div className="banner-icon">↔️</div>
        <div className="banner-text">
          {primerSwap.mensaje || 'Tienes una solicitud de intercambio pendiente'}
          {swapsRestantes > 0 && (
            <span className="banner-more"> +{swapsRestantes} más</span>
          )}
        </div>
      </div>

      <div className="banner-actions">
        <button
          className="btn-accept"
          onClick={handleAceptar}
          disabled={isResponding}
        >
          ✓ Aceptar
        </button>
        <button
          className="btn-reject"
          onClick={handleRechazar}
          disabled={isResponding}
        >
          ✕ Rechazar
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}
    </div>
  )
}
