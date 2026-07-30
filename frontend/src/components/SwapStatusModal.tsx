import React, { useState } from 'react'
import { swapsApi, SwapResponse } from '../api/swaps'
import './SwapStatusModal.css'

interface Props {
  swap: SwapResponse
  onClose: () => void
  onSuccess: () => void
}

export const SwapStatusModal: React.FC<Props> = ({ swap, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false)

  const fechaLegible = swap.fecha
    ? new Date(swap.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const handleCancelar = async () => {
    setIsLoading(true)
    try {
      await swapsApi.cancelar(swap.id)
      onSuccess()
    } catch (err: any) {
      console.error('Error cancelando swap:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content swap-status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Intercambio pendiente</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="swap-status-body">
          <p className="swap-status-desc">
            Solicitaste intercambiar con <strong>{swap.nombre_receptor}</strong>
          </p>

          <div className="swap-info-row">
            <span className="swap-info-label">Fecha</span>
            <span className="swap-info-value">{fechaLegible}</span>
          </div>
          <div className="swap-info-row">
            <span className="swap-info-label">Tu franja</span>
            <span className="swap-info-value swap-franja">{swap.franja_origen_hora || '—'}</span>
          </div>
          <div className="swap-info-row">
            <span className="swap-info-label">Su franja</span>
            <span className="swap-info-value swap-franja">{swap.franja_receptor_hora || '—'}</span>
          </div>

          <p className="swap-status-waiting">Esperando respuesta...</p>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cerrar
          </button>
          <button className="btn btn-danger" onClick={handleCancelar} disabled={isLoading}>
            {isLoading ? 'Cancelando...' : 'Cancelar swap'}
          </button>
        </div>
      </div>
    </div>
  )
}
