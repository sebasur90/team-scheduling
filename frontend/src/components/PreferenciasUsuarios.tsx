import React, { useState, useEffect } from 'react'
import { colaboradoresApi, Colaborador } from '../api/colaboradores'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import './PreferenciasUsuarios.css'

export const PreferenciasUsuarios: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedFranja, setSelectedFranja] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [colabRes, franjasRes] = await Promise.all([
        colaboradoresApi.list(),
        franjasApi.list(),
      ])
      setColaboradores(colabRes.data)
      setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditClick = (colaborador: Colaborador) => {
    setEditingId(colaborador.id)
    setSelectedFranja(colaborador.franja_preferida_id || null)
  }

  const handleSave = async () => {
    if (!editingId || selectedFranja === null) return

    try {
      setIsSaving(true)
      await colaboradoresApi.updatePreference(selectedFranja)
      alert('Preferencia actualizada')
      setEditingId(null)
      loadData()
    } catch (error) {
      console.error('Error updating preference:', error)
      alert('Error al actualizar preferencia')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setSelectedFranja(null)
  }

  const getFranjaInfo = (franjaId?: number) => {
    if (!franjaId) return 'Sin preferencia'
    const franja = franjas.find((f) => f.id === franjaId)
    return franja ? `${franja.hora_inicio} - ${franja.hora_fin}` : 'Desconocida'
  }

  if (isLoading) {
    return <div className="preferencias-loading">Cargando preferencias...</div>
  }

  return (
    <div className="preferencias-usuarios">
      <h3>Preferencias de Franjas por Usuario</h3>

      <div className="preferencias-table-container">
        <table className="preferencias-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Sector</th>
              <th>Franja Preferida</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-cell">
                  No hay colaboradores
                </td>
              </tr>
            ) : (
              colaboradores.map((colab) => (
                <tr key={colab.id} className={editingId === colab.id ? 'editing' : ''}>
                  <td>{colab.nombre}</td>
                  <td>{colab.sector_nombre || 'N/A'}</td>
                  <td>
                    {editingId === colab.id ? (
                      <select
                        value={selectedFranja || ''}
                        onChange={(e) => setSelectedFranja(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isSaving}
                      >
                        <option value="">Sin preferencia</option>
                        {franjas.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.hora_inicio} - {f.hora_fin}
                          </option>
                        ))}
                      </select>
                    ) : (
                      getFranjaInfo(colab.franja_preferida_id)
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingId === colab.id ? (
                      <>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          Guardar
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={handleCancel}
                          disabled={isSaving}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => handleEditClick(colab)}
                        disabled={isLoading}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
