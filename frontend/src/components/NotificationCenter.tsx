import React, { useState, useEffect } from 'react'
import './NotificationCenter.css'

interface Notification {
  id: number
  tipo: string
  mensaje: string
  leida: boolean
  created_at: string
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setNotifications([
        {
          id: 1,
          tipo: 'info',
          mensaje: 'Tu preferencia para el 28/07 ha sido otorgada: 13:00 - 13:45',
          leida: false,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          tipo: 'warning',
          mensaje:
            'No fue posible asignar tu preferencia del 29/07 por restricción de cobertura. Tu puntaje de prioridad aumentó.',
          leida: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ])
      setIsLoading(false)
    }, 500)
  }, [])

  const markAsRead = (id: number) => {
    setNotifications((notifs) =>
      notifs.map((n) => (n.id === id ? { ...n, leida: true } : n))
    )
  }

  const deleteNotification = (id: number) => {
    setNotifications((notifs) => notifs.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.leida).length

  if (isLoading) {
    return <div className="notifications-loading">Cargando notificaciones...</div>
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
          {notifications.map((notif) => (
            <div key={notif.id} className={`notification-item notification-${notif.tipo} ${notif.leida ? 'read' : 'unread'}`}>
              <div className="notification-content">
                <p className="notification-message">{notif.mensaje}</p>
                <time className="notification-time">
                  {new Date(notif.created_at).toLocaleString('es-ES')}
                </time>
              </div>
              <div className="notification-actions">
                {!notif.leida && (
                  <button
                    className="btn-mark-read"
                    onClick={() => markAsRead(notif.id)}
                    title="Marcar como leída"
                  >
                    ✓
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
          ))}
        </div>
      )}
    </div>
  )
}
