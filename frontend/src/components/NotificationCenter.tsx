import React, { useState, useEffect } from 'react'
import './NotificationCenter.css'
import { notificacionesApi, type Notificacion } from '../api/notificaciones'
import { SwapActionCard } from './SwapActionCard'

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await notificacionesApi.list()
        setNotifications(res.data)
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || err.message || 'Error al cargar notificaciones'
        setError(errorMsg)
        setNotifications([])
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [])

  const deleteNotification = (id: number) => {
    setNotifications((notifs) => notifs.filter((n) => n.id !== id))
  }

  const handleAceptarCambioFranja = async (id: number) => {
    try {
      await notificacionesApi.aceptarCambioFranja(id)
      setNotifications((notifs) =>
        notifs.map((n) => (n.id === id ? { ...n, estado: 'aceptada' } : n))
      )
    } catch (error) {
      console.error('Error aceptando cambio de franja:', error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.leida).length

  const getMessageForNotification = (notif: Notificacion): string => {
    if (notif.tipo === 'franja_preferida_disponible' && notif.franja_detalles && notif.fecha) {
      const fecha = new Date(notif.fecha).toLocaleDateString('es-AR')
      const horaInicio = notif.franja_detalles.hora_inicio.slice(0, 5)
      const horaFin = notif.franja_detalles.hora_fin.slice(0, 5)
      return `Se liberó tu franja preferida el ${fecha}: ${horaInicio} - ${horaFin}. ¿Querés cambiarte?`
    }
    return notif.mensaje
  }

  if (isLoading) {
    return <div className="notifications-loading">Cargando notificaciones...</div>
  }

  if (error) {
    return (
      <div className="notifications-error">
        <p>Error al cargar notificaciones: {error}</p>
      </div>
    )
  }

  return (
    <div className="notifications">
      <div className="notifications-header">
        <h2>Notificaciones</h2>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount} nuevas</span>}
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <p>No hay notificaciones</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notif) => {
            if (notif.tipo === 'swap_solicitado' && notif.referencia_id) {
              return (
                <div key={notif.id} className={`notification-item notification-swap_solicitado ${notif.leida ? 'read' : 'unread'}`}>
                  <SwapActionCard
                    notif={notif}
                    onRefresh={() => setNotifications((ns) => ns.map((n) => n.id === notif.id ? { ...n, leida: true } : n))}
                  />
                  <time className="notification-time">
                    {new Date(notif.created_at).toLocaleString('es-AR')}
                  </time>
                </div>
              )
            }

            return (
              <div key={notif.id} className={`notification-item notification-${notif.tipo} ${notif.leida ? 'read' : 'unread'}`}>
                <div className="notification-content">
                  <p className="notification-message">{getMessageForNotification(notif)}</p>
                  <time className="notification-time">
                    {new Date(notif.created_at).toLocaleString('es-AR')}
                  </time>
                </div>
                <div className="notification-actions">
                  {notif.tipo === 'franja_preferida_disponible' && notif.estado === 'pendiente' && (
                    <button
                      className="btn-accept"
                      onClick={() => handleAceptarCambioFranja(notif.id)}
                      title="Aceptar cambio de franja"
                    >
                      Aceptar cambio
                    </button>
                  )}
                  <button
                    className="btn-delete"
                    onClick={() => deleteNotification(notif.id)}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
