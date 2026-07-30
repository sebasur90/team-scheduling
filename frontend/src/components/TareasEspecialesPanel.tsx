import React, { useState, useEffect } from 'react'
import { tareasEspecialesApi, TareaEspecialTipo } from '../api/tareasEspeciales'
import { colaboradoresApi, Colaborador } from '../api/colaboradores'
import './TareasEspecialesPanel.css'

interface AsignacionTarea {
  fecha: string
  tarea_id: number
  colaborador_id: number
}

export const TareasEspecialesPanel: React.FC = () => {
  const [tareas, setTareas] = useState<TareaEspecialTipo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionTarea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTarea, setSelectedTarea] = useState<number | null>(null)
  const [formData, setFormData] = useState<AsignacionTarea>({
    fecha: new Date().toISOString().split('T')[0],
    tarea_id: 0,
    colaborador_id: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const tareasRes = await tareasEspecialesApi.getTipos()
      const colaboradoresRes = await colaboradoresApi.list()

      setTareas(tareasRes.data)
      setColaboradores(colaboradoresRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      await tareasEspecialesApi.asignar({
        fecha: formData.fecha,
        tarea_especial_tipo_id: formData.tarea_id,
        colaborador_id: formData.colaborador_id,
      })
      alert('Tarea asignada correctamente')
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error assigning task:', error)
      alert(error.response?.data?.detail || 'Error al asignar tarea')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (tarea_id: number, fecha: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return
    try {
      await tareasEspecialesApi.desasignar(tarea_id, fecha)
      alert('Asignación eliminada')
      loadData()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Error al eliminar asignación')
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tarea_id: 0,
      colaborador_id: 0,
    })
    setSelectedTarea(null)
    setShowForm(false)
  }

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

  return (
    <div className="tareas-panel">
      <div className="tareas-header">
        <h2>Tareas Especiales</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={isLoading}
        >
          {showForm ? 'Cancelar' : '+ Nueva Asignación'}
        </button>
      </div>

      {showForm && (
        <div className="tareas-form">
          <h3>Asignar Tarea Especial</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label>Tarea Especial</label>
              <select
                value={formData.tarea_id}
                onChange={(e) => setFormData({ ...formData, tarea_id: parseInt(e.target.value) })}
                required
                disabled={isLoading}
              >
                <option value={0}>Selecciona una tarea</option>
                {tareas.map((tarea) => (
                  <option key={tarea.id} value={tarea.id}>
                    {tarea.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Colaborador</label>
              <select
                value={formData.colaborador_id}
                onChange={(e) => setFormData({ ...formData, colaborador_id: parseInt(e.target.value) })}
                required
                disabled={isLoading}
              >
                <option value={0}>Selecciona un colaborador</option>
                {colaboradores.map((colab) => (
                  <option key={colab.id} value={colab.id}>
                    {colab.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Asignar'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
                disabled={isLoading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading && !showForm && <div className="loading">Cargando...</div>}

      <div className="tareas-info">
        <div className="info-section">
          <h3>Tipos de Tareas</h3>
          <div className="tareas-list">
            {tareas.length === 0 ? (
              <p className="empty-message">Sin tareas definidas</p>
            ) : (
              tareas.map((tarea) => (
                <div key={tarea.id} className="tarea-item">
                  <div className="tarea-header">
                    <h4>{tarea.nombre}</h4>
                  </div>
                  <div className="tarea-details">
                    <div className="detail">
                      <span className="label">Días:</span>
                      <span className="value">
                        {tarea.dia_semana_aplicable.map((d) => diasSemana[d]).join(', ')}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Horario:</span>
                      <span className="value">
                        {tarea.hora_inicio} - {tarea.hora_fin}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
