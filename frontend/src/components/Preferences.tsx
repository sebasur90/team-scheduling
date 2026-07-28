import React, { useState, useEffect } from 'react'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import { preferenciasApi } from '../api/preferencias'
import { useAuthContext } from '../contexts/AuthContext'
import './Preferences.css'

export const Preferences: React.FC = () => {
  const { user } = useAuthContext()
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [selectedFranja, setSelectedFranja] = useState<number | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const franjasRes = await franjasApi.list()
        setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))

        if (user) {
          const prefRes = await preferenciasApi.get(selectedDate, user.id)
          if (prefRes.data) {
            setSelectedFranja(prefRes.data.franja_horaria_id_deseada)
          } else if (franjasRes.data.length > 0) {
            setSelectedFranja(franjasRes.data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedDate, user])

  const handleSubmit = async () => {
    if (!selectedFranja || !user) {
      setMessage({ type: 'error', text: 'Selecciona una franja' })
      return
    }

    setIsSaving(true)
    try {
      await preferenciasApi.create({
        fecha: selectedDate,
        franja_horaria_id_deseada: selectedFranja as number,
      })
      setMessage({ type: 'success', text: 'Preferencia guardada exitosamente' })
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Error al guardar la preferencia'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="preferences-loading">Cargando franjas...</div>
  }

  return (
    <div className="preferences">
      <div className="preferences-card">
        <h2>Cargar Preferencia de Almuerzo</h2>
        <p className="preferences-description">
          Indica tu franja horaria preferida para mañana. El sistema intentará asignarte tu
          preferencia si la cobertura lo permite.
        </p>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date-input">Fecha:</label>
          <input
            id="date-input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
          <p className="form-hint">
            Por defecto muestra mañana. Puedes seleccionar cualquier día del mes.
          </p>
        </div>

        <div className="form-group">
          <label>Franja Horaria Preferida:</label>
          {franjas.length === 0 ? (
            <div className="alert alert-warning">
              El administrador aún no cargó los horarios de almuerzo disponibles.
            </div>
          ) : (
            <div className="franjas-selection">
              {franjas.map((franja) => (
                <label key={franja.id} className="franja-radio">
                  <input
                    type="radio"
                    name="franja"
                    value={franja.id}
                    checked={selectedFranja === franja.id}
                    onChange={(e) => setSelectedFranja(Number(e.target.value))}
                  />
                  <span className="franja-label">
                    {franja.hora_inicio.slice(0, 5)} – {franja.hora_fin.slice(0, 5)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={isSaving || !franjas.length}>
          {isSaving ? 'Guardando...' : 'Guardar Preferencia'}
        </button>

        <div className="preferences-info">
          <h3>Información importante:</h3>
          <ul>
            <li>
              Puedes cambiar tu preferencia hasta que el administrador genere los turnos del día.
            </li>
            <li>Si no indicas preferencia, se te asignará una franja disponible automáticamente.</li>
            <li>
              Si tu preferencia no puede cumplirse por restricciones de cobertura, tu puntaje de
              prioridad aumentará.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
