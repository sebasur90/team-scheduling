import React, { useState, useEffect } from 'react'
import { tareasEspecialesApi, TareaEspecialTipo, TareaEspecialAsignacionDetalle, GenerarCronogramaRequest } from '../api/tareasEspeciales'
import { colaboradoresApi, Colaborador } from '../api/colaboradores'

interface CronogramaTareasPanelProps {
  readOnly?: boolean
}

export const CronogramaTareasPanel: React.FC<CronogramaTareasPanelProps> = ({ readOnly = false }) => {
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

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadCronograma()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin])

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
    <div className="cronograma-panel">
      <div className="cronograma-header">
        <h2 className="cronograma-header__title">Cronograma de Tareas</h2>
        {!readOnly && (
          <div className="cronograma-header__actions">
            <button
              onClick={() => setShowGenerador(!showGenerador)}
              className="btn-generar"
              disabled={isLoading}
            >
              {showGenerador ? 'Cerrar' : '+ Generar Cronograma'}
            </button>
          </div>
        )}
      </div>

      {!readOnly && showGenerador && (
        <div className="cronograma-controls">
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
            Generar Cronograma
          </h3>
          <div className="cronograma-controls__row">
            <div className="cronograma-controls__group">
              <label className="cronograma-controls__label">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="cronograma-controls__input"
              />
            </div>
            <div className="cronograma-controls__group">
              <label className="cronograma-controls__label">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="cronograma-controls__input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={handleGenerarCronograma}
                disabled={isLoading}
                className="btn-generar"
                style={{ width: '100%' }}
              >
                {isLoading ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>

          {generationResult && (
            <div className="cronograma-result">
              <p className="cronograma-result__message">
                ✓ Asignaciones creadas: <strong>{generationResult.asignaciones_creadas}</strong>
              </p>
              <p className="cronograma-result__detail">
                Asignaciones saltadas: {generationResult.asignaciones_saltadas}
              </p>
              {generationResult.advertencias.length > 0 && (
                <div className="cronograma-result__warning">
                  {generationResult.advertencias.map((adv: string, i: number) => (
                    <div key={i}>⚠️ {adv}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading && !showGenerador ? (
        <div className="cronograma-loading">Cargando...</div>
      ) : fechasOrdenadas.length === 0 ? (
        <div className="cronograma-empty">Sin asignaciones en el rango seleccionado</div>
      ) : (
        <div className="cronograma-list">
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
              <div key={fecha}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333', marginBottom: '0.75rem', marginTop: '1rem' }}>
                  {fechaStr}
                </div>
                {tipos.map((tipo) => {
                  const asignacion = asignacionesDia.find((a) => a.tarea_especial_tipo_id === tipo.id)
                  return (
                    <div key={`${fecha}-${tipo.id}`} className="cronograma-item-card">
                      <div className="cronograma-item-card__header">
                        <div>
                          <h4 className="cronograma-item-card__title">{tipo.nombre}</h4>
                          {tipo.inhabilita_almuerzo && (
                            <span className="cronograma-item-card__chip" style={{ marginTop: '0.5rem' }}>
                              Sin almuerzo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="cronograma-item-card__info">
                        {asignacion ? (
                          <>
                            <div className="cronograma-item-card__person">
                              <span>{asignacion.colaborador_nombre}</span>
                            </div>
                            {!readOnly && (
                              <button
                                onClick={() => {
                                  const nuevoId = prompt(`Cambiar a colaborador ID:`)
                                  if (nuevoId) {
                                    handleSwapAsignacion(asignacion.id, parseInt(nuevoId))
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#7c3aed',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  textDecoration: 'underline',
                                  padding: 0,
                                  textAlign: 'left',
                                }}
                              >
                                ✎ Cambiar asignación
                              </button>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
