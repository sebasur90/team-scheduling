import React, { useState } from 'react'
import { useUserNotifications } from '../hooks/useUserNotifications'
import { notificacionesApi } from '../api/notificaciones'
import './SwapResponseBanner.css'

export const SwapResponseBanner: React.FC = () => {
  const { notificaciones } = useUserNotifications()
  const [markingRead, setMarkingRead] = useState<number | null>(null)

  // Filtrar notificaciones de respuestas a swaps no leídas
  const respuestas = notificaciones.filter(
    (n) =>
      (n.tipo === 'swap_aceptado' || n.tipo === 'swap_rechazado') &&
      !n.leida
  )

  if (!respuestas || respuestas.length === 0) {
    return null
  }

  const handleEntendido = async (notifId: number) => {
    setMarkingRead(notifId)
    try {
      await notificacionesApi.marcarLeida(notifId)
      // La notificación se actualiza automáticamente via Firestore
    } catch (err: any) {
      console.error('Error marcando notificación como leída:', err)
    } finally {
      setMarkingRead(null)
    }
  }

  return (
    <div className="swap-response-banners">
      {respuestas.map((notif) => {
        const isAceptado = notif.tipo === 'swap_aceptado'
        const className = isAceptado
          ? 'swap-response-banner accepted'
          : 'swap-response-banner rejected'

        return (
          <div key={notif.id} className={className}>
            <div className="banner-content">
              <div className="banner-icon">{isAceptado ? '✓' : '✕'}</div>
              <div className="banner-text">
                {notif.mensaje || (isAceptado
                  ? 'Tu intercambio fue aceptado'
                  : 'Tu intercambio fue rechazado')}
              </div>
            </div>

            <button
              className="btn-understood"
              onClick={() => handleEntendido(notif.id)}
              disabled={markingRead === notif.id}
            >
              Entendido
            </button>
          </div>
        )
      })}
    </div>
  )
}
