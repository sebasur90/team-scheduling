import React, { useState } from 'react'
import { swapsApi } from '../api/swaps'
import { AsignacionResponse } from '../api/turnos'
import './SwapConfirmModal.css'

interface Props {
  asignacionOrigen: AsignacionResponse
  asignacionReceptor: AsignacionResponse
  receptorNombre: string
  franjaOrigen: string
  franjaReceptor: string
  fecha: string
  onClose: () => void
  onSuccess: () => void
}

export const SwapConfirmModal: React.FC<Props> = ({
  asignacionOrigen,
  asignacionReceptor,
  receptorNombre,
  franjaOrigen,
  franjaReceptor,
  fecha,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fechaLegible = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleConfirmar = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await swapsApi.create(asignacionOrigen.id, asignacionReceptor.id)
      onSuccess()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Error al solicitar el intercambio')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content swap-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Solicitar intercambio</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="swap-confirm-body">
          <div className="swap-info-row">
            <span className="swap-info-label">Fecha</span>
            <span className="swap-info-value">{fechaLegible}</span>
          </div>
          <div className="swap-info-row">
            <span className="swap-info-label">Tu turno</span>
            <span className="swap-info-value swap-franja">{franjaOrigen}</span>
          </div>
          <div className="swap-arrow">⇅</div>
          <div className="swap-info-row">
            <span className="swap-info-label">Turno de</span>
            <span className="swap-info-value">
              <strong>{receptorNombre}</strong>
              <span className="swap-franja"> {franjaReceptor}</span>
            </span>
          </div>

          {error && <div className="swap-error">{error}</div>}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirmar} disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Confirmar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
