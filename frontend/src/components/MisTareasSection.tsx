import React, { useState, useEffect } from 'react'
import { tareasEspecialesApi, MiTareaResponse } from '../api/tareasEspeciales'
import { CronogramaTareasScreen } from './CronogramaTareasScreen'

export const MisTareasSection: React.FC = () => {
  const [tareas, setTareas] = useState<MiTareaResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCronograma, setShowCronograma] = useState(false)

  useEffect(() => {
    loadTareas()
  }, [])

  const loadTareas = async () => {
    try {
      setIsLoading(true)
      const res = await tareasEspecialesApi.getMisTareas()
      setTareas(res.data)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">Mis Tareas Especiales</h3>
        <button
          type="button"
          onClick={() => setShowCronograma(true)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          Ver calendario de tareas especiales →
        </button>
      </div>

      {tareas.length === 0 ? (
        <p className="text-sm text-gray-500">No tenés tareas especiales asignadas próximamente.</p>
      ) : (
        <div className="space-y-2">
          {tareas.map((tarea) => {
            const fecha = new Date(tarea.fecha)
            const fechaStr = fecha.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

            return (
              <div key={tarea.id} className="p-3 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{tarea.tipo_nombre}</p>
                    <p className="text-sm text-gray-600">{fechaStr}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {tarea.hora_inicio} - {tarea.hora_fin}
                    </p>
                  </div>
                  {tarea.inhabilita_almuerzo && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                      Sin almuerzo
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCronograma && (
        <div className="modal-overlay" onClick={() => setShowCronograma(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '900px', width: '95%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Calendario de Tareas Especiales</h3>
              <button className="modal-close" onClick={() => setShowCronograma(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <CronogramaTareasScreen readOnly />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
