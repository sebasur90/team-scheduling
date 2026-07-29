import React, { useState, useEffect } from 'react'
import { configuracionApi, ConfiguracionNotificaciones, ConfiguracionNotificacionesUpdate } from '../api/configuracion'
import { useAuthContext } from '../contexts/AuthContext'

interface FormData extends ConfiguracionNotificacionesUpdate {
  pausa_hasta_date?: string
  pausa_hasta_time?: string
}

export const NotificacionesConfig: React.FC = () => {
  const { user } = useAuthContext()
  const [config, setConfig] = useState<ConfiguracionNotificaciones | null>(null)
  const [formData, setFormData] = useState<FormData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const isReadOnly = user?.rol === 'viewer'

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await configuracionApi.getNotificaciones()
        setConfig(res.data)
        setFormData({
          aviso_previo_minutos: res.data.aviso_previo_minutos,
          tiempo_respuesta_colab_min: res.data.tiempo_respuesta_colab_min,
          tiempo_aceptacion_admin_min: res.data.tiempo_aceptacion_admin_min,
          notificaciones_pausadas: res.data.notificaciones_pausadas,
          hora_inicio_envio: res.data.hora_inicio_envio,
          hora_fin_envio: res.data.hora_fin_envio,
          intervalo_recordatorio_min: res.data.intervalo_recordatorio_min,
          pausa_hasta_date: res.data.pausa_hasta ? new Date(res.data.pausa_hasta).toISOString().split('T')[0] : '',
          pausa_hasta_time: res.data.pausa_hasta ? new Date(res.data.pausa_hasta).toTimeString().slice(0, 5) : '',
        })
      } catch (error) {
        console.error('Error loading notification config:', error)
        setMessage({ type: 'error', text: 'Error al cargar la configuración' })
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return

    setIsSaving(true)
    try {
      const submitData: ConfiguracionNotificacionesUpdate = {
        aviso_previo_minutos: formData.aviso_previo_minutos,
        tiempo_respuesta_colab_min: formData.tiempo_respuesta_colab_min,
        tiempo_aceptacion_admin_min: formData.tiempo_aceptacion_admin_min,
        notificaciones_pausadas: formData.notificaciones_pausadas,
        hora_inicio_envio: formData.hora_inicio_envio,
        hora_fin_envio: formData.hora_fin_envio,
        intervalo_recordatorio_min: formData.intervalo_recordatorio_min,
      }

      if (formData.notificaciones_pausadas && formData.pausa_hasta_date && formData.pausa_hasta_time) {
        const pausaDateTime = `${formData.pausa_hasta_date}T${formData.pausa_hasta_time}:00Z`
        submitData.pausa_hasta = pausaDateTime
      } else if (!formData.notificaciones_pausadas) {
        submitData.pausa_hasta = null
      }

      await configuracionApi.updateNotificaciones(submitData)
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' })

      const res = await configuracionApi.getNotificaciones()
      setConfig(res.data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Error al guardar la configuración'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="loading">Cargando configuración de notificaciones...</div>
  }

  if (!config) {
    return <div className="error">No se pudo cargar la configuración</div>
  }

  return (
    <div className="notificaciones-config">
      <h2>Configuración de Notificaciones</h2>

      {isReadOnly && (
        <div className="read-only-banner">Modo lectura — No puedes hacer cambios</div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="config-form">
        <fieldset disabled={isReadOnly}>
          <div className="form-section">
            <h3>Pausa de Notificaciones</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.notificaciones_pausadas || false}
                  onChange={e => handleChange('notificaciones_pausadas', e.target.checked)}
                />
                Pausar notificaciones
              </label>
            </div>

            {formData.notificaciones_pausadas && (
              <div className="form-group">
                <label>
                  Reanudar automáticamente a:
                  <input
                    type="date"
                    value={formData.pausa_hasta_date || ''}
                    onChange={e => handleChange('pausa_hasta_date', e.target.value)}
                  />
                  <input
                    type="time"
                    value={formData.pausa_hasta_time || ''}
                    onChange={e => handleChange('pausa_hasta_time', e.target.value)}
                  />
                </label>
                <p className="helper-text">(Dejar vacío = pausa indefinida)</p>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Ventana de Envío</h3>
            <div className="form-group">
              <label>
                Hora de inicio:
                <input
                  type="time"
                  value={formData.hora_inicio_envio || ''}
                  onChange={e => handleChange('hora_inicio_envio', e.target.value)}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                Hora de fin:
                <input
                  type="time"
                  value={formData.hora_fin_envio || ''}
                  onChange={e => handleChange('hora_fin_envio', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Tiempos de Respuesta (minutos)</h3>
            <div className="form-group">
              <label>
                Aviso previo:
                <input
                  type="number"
                  min="0"
                  value={formData.aviso_previo_minutos || 0}
                  onChange={e => handleChange('aviso_previo_minutos', parseInt(e.target.value))}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                Tiempo de respuesta colaborador:
                <input
                  type="number"
                  min="0"
                  value={formData.tiempo_respuesta_colab_min || 0}
                  onChange={e => handleChange('tiempo_respuesta_colab_min', parseInt(e.target.value))}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                Tiempo de aceptación admin:
                <input
                  type="number"
                  min="0"
                  value={formData.tiempo_aceptacion_admin_min || 0}
                  onChange={e => handleChange('tiempo_aceptacion_admin_min', parseInt(e.target.value))}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                Intervalo de recordatorio:
                <input
                  type="number"
                  min="0"
                  value={formData.intervalo_recordatorio_min || 0}
                  onChange={e => handleChange('intervalo_recordatorio_min', parseInt(e.target.value))}
                />
              </label>
            </div>
          </div>

          {!isReadOnly && (
            <button type="submit" disabled={isSaving} className="btn-submit">
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          )}
        </fieldset>
      </form>
    </div>
  )
}
