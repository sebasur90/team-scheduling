import React, { useState, useEffect } from 'react'
import { tareasEspecialesApi, MiTareaResponse } from '../api/tareasEspeciales'

export const MisTareasSection: React.FC = () => {
  const [tareas, setTareas] = useState<MiTareaResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading || tareas.length === 0) {
    return null
  }

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Mis Tareas Especiales</h3>
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
    </div>
  )
}
