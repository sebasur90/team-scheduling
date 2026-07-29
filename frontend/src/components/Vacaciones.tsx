import React, { useState, useEffect } from 'react'
import { ausenciasApi, Ausencia } from '../api/ausencias'
import { useAuthContext } from '../contexts/AuthContext'
import { colaboradoresApi } from '../api/colaboradores'
import './Vacaciones.css'

interface VacacionesProps {
  mode: 'personal' | 'admin'
}

interface VacacionesBlock {
  colaborador_id: number
  colaborador_nombre?: string
  fecha_inicio: string
  fecha_fin: string
  dias: string[]
}

export const Vacaciones: React.FC<VacacionesProps> = ({ mode }) => {
  const { user } = useAuthContext()
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [colaboradorId, setColaboradorId] = useState(user?.id || 0)
  const [bloques, setBloques] = useState<VacacionesBlock[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load vacation data
  const cargarVacaciones = async () => {
    setLoading(true)
    try {
      const res = await ausenciasApi.list(mode === 'admin' ? undefined : user?.id)
      const ausencias = res.data

      // Group by colaborador and consecutive dates
      const bloquesPorColab = agruparVacaciones(ausencias)
      setBloques(bloquesPorColab)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar vacaciones' })
    }
    setLoading(false)
  }

  // Load colaboradores for admin dropdown
  useEffect(() => {
    if (mode === 'admin') {
      colaboradoresApi.list()
        .then(res => setColaboradores(res.data))
        .catch(() => setMessage({ type: 'error', text: 'Error al cargar colaboradores' }))
    }
  }, [mode])

  // Load vacations on mount and when colaborador changes
  useEffect(() => {
    cargarVacaciones()
  }, [colaboradorId, user?.id])

  const agruparVacaciones = (ausencias: Ausencia[]): VacacionesBlock[] => {
    const porColab = new Map<number, Ausencia[]>()
    ausencias.forEach(a => {
      if (!porColab.has(a.colaborador_id)) {
        porColab.set(a.colaborador_id, [])
      }
      porColab.get(a.colaborador_id)!.push(a)
    })

    const bloques: VacacionesBlock[] = []
    porColab.forEach((ausencias, colab_id) => {
      const sorted = ausencias.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      let i = 0
      while (i < sorted.length) {
        const inicio = new Date(sorted[i].fecha)
        let fin = inicio
        let j = i + 1
        // Group consecutive weekdays
        while (j < sorted.length) {
          const current = new Date(sorted[j].fecha)
          const prev = new Date(sorted[j - 1].fecha)
          const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
          // If gap is more than 2 days (accounting for weekends), break
          if (diffDays > 2) break
          fin = current
          j++
        }
        const dias = sorted.slice(i, j).map(a => a.fecha)
        bloques.push({
          colaborador_id: colab_id,
          fecha_inicio: inicio.toISOString().split('T')[0],
          fecha_fin: fin.toISOString().split('T')[0],
          dias,
        })
        i = j
      }
    })

    return bloques
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fechaInicio || !fechaFin) {
      setMessage({ type: 'error', text: 'Completa las fechas' })
      return
    }

    setLoading(true)
    try {
      await ausenciasApi.create({
        colaborador_id: colaboradorId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      setMessage({ type: 'success', text: 'Vacación cargada correctamente' })
      setFechaInicio('')
      setFechaFin('')
      cargarVacaciones()
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Error al crear vacación'
      setMessage({ type: 'error', text: detail })
    }
    setLoading(false)
  }

  const handleDelete = async (bloque: VacacionesBlock) => {
    if (!confirm('¿Eliminar este bloque de vacaciones?')) return

    setLoading(true)
    try {
      await ausenciasApi.deleteBloque({
        colaborador_id: bloque.colaborador_id,
        fecha_inicio: bloque.fecha_inicio,
        fecha_fin: bloque.fecha_fin,
      })
      setMessage({ type: 'success', text: 'Vacación eliminada' })
      cargarVacaciones()
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Error al eliminar vacación'
      setMessage({ type: 'error', text: detail })
    }
    setLoading(false)
  }

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha)
    return d.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="vacaciones-container">
      {/* Form Section */}
      <div className="vacaciones-form-section">
        <h3>Cargar Vacaciones</h3>
        <form onSubmit={handleCreate}>
          {mode === 'admin' && (
            <div className="form-group">
              <label>Colaborador:</label>
              <select value={colaboradorId} onChange={(e) => setColaboradorId(Number(e.target.value))}>
                <option value="">Selecciona un colaborador</option>
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Desde:</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Hasta:</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Cargar Vacaciones'}
          </button>
        </form>
      </div>

      {/* Messages */}
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      {/* Vacation Blocks */}
      <div className="vacaciones-list-section">
        <h3>
          {mode === 'admin' ? 'Vacaciones del Equipo' : 'Tus Vacaciones'}
        </h3>
        {bloques.length === 0 ? (
          <p className="empty-message">Sin vacaciones cargadas</p>
        ) : (
          <div className={mode === 'admin' ? 'vacaciones-table' : 'vacaciones-blocks'}>
            {mode === 'admin' ? (
              <table>
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {bloques.map((bloque, idx) => {
                    const colab = colaboradores.find(c => c.id === bloque.colaborador_id)
                    return (
                      <tr key={idx}>
                        <td>{colab?.nombre || `Col. ${bloque.colaborador_id}`}</td>
                        <td>{formatFecha(bloque.fecha_inicio)}</td>
                        <td>{formatFecha(bloque.fecha_fin)}</td>
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(bloque)}
                            disabled={loading}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              bloques.map((bloque, idx) => (
                <div key={idx} className="vacaciones-block">
                  <span className="block-dates">
                    {formatFecha(bloque.fecha_inicio)} – {formatFecha(bloque.fecha_fin)}
                  </span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(bloque)}
                    disabled={loading}
                  >
                    🗑️ Borrar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
