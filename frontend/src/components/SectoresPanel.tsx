import React, { useState, useEffect } from 'react'
import { sectoresApi, Sector, SectorCreate, SectorUpdate } from '../api/sectores'
import './SectoresPanel.css'

export const SectoresPanel: React.FC = () => {
  const [sectores, setSectores] = useState<Sector[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<SectorCreate>({
    nombre: '',
    capacidad_maxima: 10,
    minimo_cobertura: 1,
    participa_almuerzo: true,
    color: '#3b82f6',
    acceso_rol: 'gestion',
  })

  useEffect(() => {
    loadSectores()
  }, [])

  const loadSectores = async () => {
    try {
      setIsLoading(true)
      const res = await sectoresApi.list()
      setSectores(res.data)
    } catch (error) {
      console.error('Error loading sectores:', error)
      alert('Error al cargar sectores')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      if (editingId) {
        await sectoresApi.update(editingId, formData as SectorUpdate)
        alert('Sector actualizado')
      } else {
        await sectoresApi.create(formData)
        alert('Sector creado')
      }
      resetForm()
      loadSectores()
    } catch (error) {
      console.error('Error saving sector:', error)
      alert('Error al guardar sector')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (sector: Sector) => {
    setFormData({
      nombre: sector.nombre,
      capacidad_maxima: sector.capacidad_maxima,
      minimo_cobertura: sector.minimo_cobertura,
      participa_almuerzo: sector.participa_almuerzo,
      color: sector.color,
      acceso_rol: sector.acceso_rol as 'gestion' | 'viewer',
    })
    setEditingId(sector.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este sector?')) return
    try {
      await sectoresApi.delete(id)
      alert('Sector eliminado')
      loadSectores()
    } catch (error) {
      console.error('Error deleting sector:', error)
      alert('Error al eliminar sector')
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      capacidad_maxima: 10,
      minimo_cobertura: 1,
      participa_almuerzo: true,
      color: '#3b82f6',
      acceso_rol: 'gestion',
    })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="sectores-panel">
      <div className="sectores-header">
        <h2>Gestión de Sectores</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={isLoading}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Sector'}
        </button>
      </div>

      {showForm && (
        <div className="sectores-form">
          <h3>{editingId ? 'Editar Sector' : 'Crear Nuevo Sector'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Capacidad Máxima</label>
                <input
                  type="number"
                  value={formData.capacidad_maxima}
                  onChange={(e) =>
                    setFormData({ ...formData, capacidad_maxima: parseInt(e.target.value) })
                  }
                  min="1"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Cobertura Mínima</label>
                <input
                  type="number"
                  value={formData.minimo_cobertura}
                  onChange={(e) =>
                    setFormData({ ...formData, minimo_cobertura: parseInt(e.target.value) })
                  }
                  min="0"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label>Rol de Acceso</label>
                <select
                  value={formData.acceso_rol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acceso_rol: e.target.value as 'gestion' | 'viewer',
                    })
                  }
                  disabled={isLoading}
                >
                  <option value="gestion">Gestión</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.participa_almuerzo}
                  onChange={(e) =>
                    setFormData({ ...formData, participa_almuerzo: e.target.checked })
                  }
                  disabled={isLoading}
                />
                Participa en almuerzos
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
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

      <div className="sectores-list">
        {sectores.length === 0 ? (
          <p className="empty-message">No hay sectores. Crea uno para comenzar.</p>
        ) : (
          <div className="sectors-grid">
            {sectores.map((sector) => (
              <div key={sector.id} className="sector-card">
                <div className="sector-header">
                  <div className="sector-color" style={{ backgroundColor: sector.color }}></div>
                  <h4>{sector.nombre}</h4>
                </div>

                <div className="sector-info">
                  <div className="info-item">
                    <span className="label">Capacidad:</span>
                    <span className="value">{sector.capacidad_maxima}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Cobertura Min.:</span>
                    <span className="value">{sector.minimo_cobertura}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Almuerzos:</span>
                    <span className="value">{sector.participa_almuerzo ? 'Sí' : 'No'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Acceso:</span>
                    <span className="value">{sector.acceso_rol}</span>
                  </div>
                </div>

                <div className="sector-actions">
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => handleEdit(sector)}
                    disabled={isLoading}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(sector.id)}
                    disabled={isLoading}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
