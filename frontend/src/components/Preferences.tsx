import React, { useState, useEffect } from 'react'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import { colaboradoresApi } from '../api/colaboradores'
import { useAuthContext } from '../contexts/AuthContext'
import './Preferences.css'

export const Preferences: React.FC = () => {
  const { user } = useAuthContext()
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [selectedFranja, setSelectedFranja] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const franjasRes = await franjasApi.list()
        setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))

        if (user?.franja_preferida_id) {
          setSelectedFranja(user.franja_preferida_id)
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleSubmit = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Debe estar autenticado' })
      return
    }

    setIsSaving(true)
    try {
      await colaboradoresApi.updatePreference(selectedFranja)
      setMessage({ type: 'success', text: 'Preferencia de franja guardada exitosamente' })
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
        <h2>Tu Preferencia de Franja Horaria</h2>
        <p className="preferences-description">
          Indica tu franja horaria preferida. El sistema la considerará al asignarte turnos.
        </p>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}

        <div className="form-group">
          <label>Franja Horaria Preferida:</label>
          {franjas.length === 0 ? (
            <div className="alert alert-warning">
              El administrador aún no cargó los horarios disponibles.
            </div>
          ) : (
            <div className="franjas-selection">
              <label className="franja-radio">
                <input
                  type="radio"
                  name="franja"
                  value=""
                  checked={selectedFranja === null}
                  onChange={() => setSelectedFranja(null)}
                />
                <span className="franja-label">Sin preferencia</span>
              </label>
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
            <li>Puedes cambiar tu preferencia en cualquier momento.</li>
            <li>Si no indicas preferencia, se te asignará una franja disponible automáticamente.</li>
            <li>Cuando tu franja preferida se libera, recibirás una notificación con prioridad.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
