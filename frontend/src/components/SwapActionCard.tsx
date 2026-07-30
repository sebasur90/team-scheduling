import React, { useState } from 'react'
import { swapsApi } from '../api/swaps'
import { Notificacion } from '../api/notificaciones'

interface Props {
  notif: Notificacion
  onRefresh: () => void
}

export const SwapActionCard: React.FC<Props> = ({ notif, onRefresh }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  const swapId = notif.referencia_id

  const handleAceptar = async () => {
    if (!swapId) return
    setIsLoading(true)
    try {
      await swapsApi.aceptar(swapId)
      setDone(true)
      window.dispatchEvent(new CustomEvent('swap-updated'))
      onRefresh()
    } catch (err: any) {
      console.error('Error aceptando swap:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRechazar = async () => {
    if (!swapId) return
    setIsLoading(true)
    try {
      await swapsApi.rechazar(swapId)
      setDone(true)
      window.dispatchEvent(new CustomEvent('swap-updated'))
      onRefresh()
    } catch (err: any) {
      console.error('Error rechazando swap:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="swap-action-card swap-action-card--done">
        <p className="swap-action-mensaje">{notif.mensaje}</p>
        <p className="swap-action-done-msg">Respondido</p>
      </div>
    )
  }

  return (
    <div className="swap-action-card">
      <div className="swap-action-header">↔ Solicitud de intercambio</div>
      <p className="swap-action-mensaje">{notif.mensaje}</p>
      <div className="swap-action-buttons">
        <button
          className="btn-swap-rechazar"
          onClick={handleRechazar}
          disabled={isLoading}
        >
          Rechazar
        </button>
        <button
          className="btn-swap-aceptar"
          onClick={handleAceptar}
          disabled={isLoading}
        >
          Aceptar ✓
        </button>
      </div>
    </div>
  )
}
