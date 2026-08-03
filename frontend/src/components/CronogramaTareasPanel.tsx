import React, { useState, useEffect } from 'react'
import { tareasEspecialesApi, TareaEspecialTipo, TareaEspecialAsignacionDetalle, GenerarCronogramaRequest } from '../api/tareasEspeciales'
import { colaboradoresApi, Colaborador } from '../api/colaboradores'

export const CronogramaTareasPanel: React.FC = () => {
  const [tipos, setTipos] = useState<TareaEspecialTipo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [cronograma, setCronograma] = useState<TareaEspecialAsignacionDetalle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showGenerador, setShowGenerador] = useState(false)

  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const [generationResult, setGenerationResult] = useState<any>(null)

  useEffect(() => {
    loadData()
    // Set default date range (next 2 weeks)
    const hoy = new Date()
    const inicio = new Date(hoy)
    const fin = new Date(hoy.getTime() + 14 * 24 * 60 * 60 * 1000)
    setFechaInicio(inicio.toISOString().split('T')[0])
    setFechaFin(fin.toISOString().split('T')[0])
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [tiposRes, colabRes] = await Promise.all([
        tareasEspecialesApi.getTipos(),
        colaboradoresApi.list(),
      ])
      setTipos(tiposRes.data)
      setColaboradores(colabRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerarCronograma = async () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor completa las fechas')
      return
    }

    try {
      setIsLoading(true)
      const req: GenerarCronogramaRequest = {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      }
      const res = await tareasEspecialesApi.generarCronograma(req)
      setGenerationResult(res.data)
      // Reload cronograma
      await loadCronograma()
    } catch (error: any) {
      console.error('Error generating schedule:', error)
      alert(error.response?.data?.detail || 'Error al generar cronograma')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCronograma = async () => {
    try {
      setIsLoading(true)
      const res = await tareasEspecialesApi.getCronograma({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      setCronograma(res.data)
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwapAsignacion = async (asignacionId: number, nuevoColaboradorId: number) => {
    try {
      await tareasEspecialesApi.swapAsignacion(asignacionId, { colaborador_id: nuevoColaboradorId })
      // Reload cronograma
      await loadCronograma()
    } catch (error: any) {
      console.error('Error swapping assignment:', error)
      alert(error.response?.data?.detail || 'Error al cambiar asignación')
    }
  }

  // Group cronograma by fecha
  const cronogramaByFecha: { [key: string]: TareaEspecialAsignacionDetalle[] } = {}
  cronograma.forEach((item) => {
    if (!cronogramaByFecha[item.fecha]) {
      cronogramaByFecha[item.fecha] = []
    }
    cronogramaByFecha[item.fecha].push(item)
  })

  const fechasOrdenadas = Object.keys(cronogramaByFecha).sort()

  // Get colaboradores pool for each type
  const getPoolColaboradores = (tipoId: number): number[] => {
    return colaboradores.filter((c) => c.id > 0).map((c) => c.id)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cronograma de Tareas</h2>
        <button
          onClick={() => setShowGenerador(!showGenerador)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          disabled={isLoading}
        >
          {showGenerador ? 'Cerrar' : '+ Generar Cronograma'}
        </button>
      </div>

      {/* Generador */}
      {showGenerador && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Generar Cronograma</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={handleGenerarCronograma}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Generando...' : 'Generar'}
          </button>

          {generationResult && (
            <div className="bg-white border border-green-200 rounded-lg p-3 text-sm space-y-1">
              <p className="text-green-800">✓ Asignaciones creadas: <strong>{generationResult.asignaciones_creadas}</strong></p>
              <p className="text-gray-700">Asignaciones saltadas: {generationResult.asignaciones_saltadas}</p>
              {generationResult.advertencias.length > 0 && (
                <div className="mt-2 text-amber-700 space-y-1">
                  {generationResult.advertencias.map((adv: string, i: number) => (
                    <p key={i}>⚠️ {adv}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cronograma Table */}
      {isLoading && !showGenerador ? (
        <div className="text-center text-gray-500 py-8">Cargando...</div>
      ) : fechasOrdenadas.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Sin asignaciones en el rango seleccionado</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                {tipos.map((tipo) => (
                  <th key={tipo.id} className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    {tipo.nombre}
                    {tipo.inhabilita_almuerzo && <span className="text-xs text-red-600 ml-1">*Sin almuerzo</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fechasOrdenadas.map((fecha) => {
                const asignacionesDia = cronogramaByFecha[fecha]
                const fechaObj = new Date(fecha + 'T00:00:00')
                const fechaStr = fechaObj.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <tr key={fecha} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fechaStr}</td>
                    {tipos.map((tipo) => {
                      const asignacion = asignacionesDia.find((a) => a.tarea_especial_tipo_id === tipo.id)
                      return (
                        <td key={`${fecha}-${tipo.id}`} className="px-4 py-3 text-sm">
                          {asignacion ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-900">{asignacion.colaborador_nombre}</span>
                              <button
                                onClick={() => {
                                  const nuevoId = prompt(`Cambiar a colaborador ID:`)
                                  if (nuevoId) {
                                    handleSwapAsignacion(asignacion.id, parseInt(nuevoId))
                                  }
                                }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                ✎
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
