import React, { useState, useEffect } from 'react'
import {
  ConfiguracionRotacionMultiSector as Config,
  tareasEspecialesApi,
} from '../api/tareasEspeciales'
import { sectoresApi } from '../api/sectores'

interface Props {
  valor: Config | null
  diasAplicables: number[]
  onChange: (config: Config | null) => void
  disabled?: boolean
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export const ConfiguracionRotacionMultiSector: React.FC<Props> = ({
  valor,
  diasAplicables,
  onChange,
  disabled = false,
}) => {
  const [sectores, setSectores] = useState<string[]>([])
  const [activa, setActiva] = useState(valor !== null)
  const [modo, setModo] = useState<'patron_fijo' | 'personalizado'>(
    valor?.modo || 'patron_fijo'
  )
  const [patronSemanal, setPatronSemanal] = useState<string[]>(
    valor?.patron_semanal || []
  )
  const [distribucionPorDia, setDistribucionPorDia] = useState<
    Record<string, Record<string, number>>
  >(valor?.distribucion_por_dia || {})
  const [distribuciones, setDistribuciones] = useState<Record<string, number>>(
    valor?.distribuciones_sector || {}
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const diasOrdenados = [...diasAplicables].sort()

  // Cargar sectores dinámicamente desde API
  useEffect(() => {
    const loadSectores = async () => {
      try {
        setLoading(true)
        const res = await sectoresApi.list()
        const nombres = res.data.map((s) => s.nombre)
        setSectores(nombres)

        // Inicializar si es patrón fijo y estamos activando
        if (activa && modo === 'patron_fijo' && patronSemanal.length === 0) {
          setPatronSemanal(new Array(diasOrdenados.length).fill(nombres[0] || ''))
        }

        // Inicializar distribución personalizada si es necesario
        if (activa && modo === 'personalizado' && Object.keys(distribucionPorDia).length === 0) {
          const newDist: Record<string, Record<string, number>> = {}
          for (const dia of diasOrdenados) {
            newDist[String(dia)] = {}
            for (const sector of nombres) {
              newDist[String(dia)][sector] = 0
            }
          }
          setDistribucionPorDia(newDist)
        }

        setError(null)
      } catch (err) {
        console.error('Error loading sectors:', err)
        setError('No se pudieron cargar los sectores')
      } finally {
        setLoading(false)
      }
    }

    loadSectores()
  }, [])

  // Inicializar distribución personalizada cuando sectores se cargan
  useEffect(() => {
    if (!activa || modo !== 'personalizado' || sectores.length === 0) return
    if (Object.keys(distribucionPorDia).length > 0) return // Ya inicializado

    const newDist: Record<string, Record<string, number>> = {}
    for (const dia of diasOrdenados) {
      newDist[String(dia)] = {}
      for (const sector of sectores) {
        newDist[String(dia)][sector] = 0
      }
    }
    setDistribucionPorDia(newDist)
  }, [sectores, modo, activa])

  // Recomputar distribuciones cuando cambian patrón, modo o díasAplicables
  useEffect(() => {
    if (!activa) return

    let newDistribuciones: Record<string, number> = {}

    if (modo === 'patron_fijo') {
      // Contar ocurrencias de cada sector en patronSemanal
      for (const sector of patronSemanal) {
        if (sector) {
          newDistribuciones[sector] = (newDistribuciones[sector] || 0) + 1
        }
      }
    } else {
      // Sumar por sector desde distribucion_por_dia
      for (const dayDist of Object.values(distribucionPorDia)) {
        for (const [sector, cantidad] of Object.entries(dayDist)) {
          if (cantidad > 0) {
            newDistribuciones[sector] = (newDistribuciones[sector] || 0) + cantidad
          }
        }
      }
    }

    setDistribuciones(newDistribuciones)
  }, [modo, patronSemanal, distribucionPorDia, activa])

  // Emitir configuración cuando cambia
  useEffect(() => {
    if (!activa) {
      onChange(null)
      return
    }

    const config: Config = {
      modo,
      patron_semanal: modo === 'patron_fijo' ? patronSemanal : null,
      distribucion_por_dia: modo === 'personalizado' ? distribucionPorDia : null,
      distribuciones_sector: distribuciones,
    }
    onChange(config)
  }, [activa, modo, patronSemanal, distribucionPorDia, distribuciones])

  const handleToggle = (checked: boolean) => {
    setActiva(checked)
    if (!checked) return

    // Inicializar estructura según modo
    if (modo === 'patron_fijo' && patronSemanal.length === 0 && sectores.length > 0) {
      setPatronSemanal(new Array(diasOrdenados.length).fill(sectores[0]))
    } else if (modo === 'personalizado' && sectores.length > 0) {
      const newDist: Record<string, Record<string, number>> = {}
      for (const dia of diasOrdenados) {
        newDist[String(dia)] = {}
        for (const sector of sectores) {
          newDist[String(dia)][sector] = distribucionPorDia[String(dia)]?.[sector] || 0
        }
      }
      setDistribucionPorDia(newDist)
    }
  }

  const handleModoChange = (nuevoModo: 'patron_fijo' | 'personalizado') => {
    setModo(nuevoModo)

    if (nuevoModo === 'patron_fijo' && patronSemanal.length === 0) {
      setPatronSemanal(new Array(diasOrdenados.length).fill(sectores[0] || ''))
    } else if (nuevoModo === 'personalizado') {
      // Siempre reinicializar distribución personalizada al cambiar de modo
      const newDist: Record<string, Record<string, number>> = {}
      for (const dia of diasOrdenados) {
        newDist[String(dia)] = {}
        for (const sector of sectores) {
          newDist[String(dia)][sector] = distribucionPorDia[String(dia)]?.[sector] || 0
        }
      }
      setDistribucionPorDia(newDist)
    }
  }

  const handlePatronChange = (index: number, sector: string) => {
    const newPatron = [...patronSemanal]
    newPatron[index] = sector
    setPatronSemanal(newPatron)
  }

  const handleDistribucionChange = (dia: string, sector: string, cantidad: number) => {
    const newDist = JSON.parse(JSON.stringify(distribucionPorDia)) // Deep copy
    if (!newDist[dia]) {
      newDist[dia] = {}
    }
    newDist[dia][sector] = Math.max(0, cantidad)
    setDistribucionPorDia(newDist)
  }

  const totalColaboradores = Object.values(distribuciones).reduce((a, b) => a + b, 0)
  const diasRequeridos = diasOrdenados.length
  const isValid = totalColaboradores === diasRequeridos

  if (loading) {
    return <div className="configuracion-rotacion">Cargando sectores...</div>
  }

  return (
    <div style={styles.root}>
      <div style={styles.checkboxGroup}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={activa}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={disabled}
          />
          <span>Rotación multi-sector</span>
        </label>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {activa && (
        <>
          <div style={styles.modoSelector}>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="modo"
                  value="patron_fijo"
                  checked={modo === 'patron_fijo'}
                  onChange={() => handleModoChange('patron_fijo')}
                  disabled={disabled}
                />
                <span>Patrón Fijo</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="modo"
                  value="personalizado"
                  checked={modo === 'personalizado'}
                  onChange={() => handleModoChange('personalizado')}
                  disabled={disabled}
                />
                <span>Personalizado</span>
              </label>
            </div>
          </div>

          {modo === 'patron_fijo' && (
            <div style={styles.patronFijo}>
              <h4 style={styles.patronH4}>Patrón Semanal</h4>
              <div style={styles.patronGrid}>
                {diasOrdenados.map((dia, idx) => (
                  <div key={dia} style={styles.patronItem}>
                    <label style={styles.sectorLabel}>
                      {DIAS_SEMANA[dia]}
                    </label>
                    <select
                      value={patronSemanal[idx] || ''}
                      onChange={(e) => handlePatronChange(idx, e.target.value)}
                      disabled={disabled}
                      style={styles.sectorSelect}
                    >
                      <option value="">-- Seleccionar --</option>
                      {sectores.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modo === 'personalizado' && (
            <div style={styles.personalizado}>
              <h4 style={styles.patronH4}>Distribución por Día</h4>
              <div style={styles.distribucionTableContainer}>
                <table style={styles.distribucionTable}>
                  <thead>
                    <tr>
                      <th style={styles.distribucionTh}>Día</th>
                      {sectores.map((s) => (
                        <th key={s} style={styles.distribucionTh}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diasOrdenados.map((dia) => (
                      <tr key={dia}>
                        <td style={{ ...styles.distribucionTd, ...styles.diaCell }}>{DIAS_SEMANA[dia]}</td>
                        {sectores.map((sector) => (
                          <td key={`${dia}-${sector}`} style={styles.distribucionTd}>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={distribucionPorDia[String(dia)]?.[sector] || 0}
                              onChange={(e) =>
                                handleDistribucionChange(
                                  String(dia),
                                  sector,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              disabled={disabled}
                              style={styles.cantidadInput}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={styles.resumenDistribuciones}>
            <h4 style={styles.patronH4}>Distribución Total</h4>
            <div style={styles.distribucionesList}>
              {sectores.map((sector) => (
                <div key={sector} style={styles.distribucionItem}>
                  <span style={styles.sectorName}>{sector}</span>
                  <span style={styles.sectorCount}>
                    {distribuciones[sector] || 0} colaboradores
                  </span>
                </div>
              ))}
            </div>
            <div style={isValid ? styles.validacionValid : styles.validacionInvalid}>
              <span>
                Total: <strong>{totalColaboradores}</strong> / {diasRequeridos} días
              </span>
              {!isValid && (
                <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  La suma debe ser igual a {diasRequeridos}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    padding: '1.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    background: '#f9f9f9',
  },
  checkboxGroup: {
    marginBottom: '1.5rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  errorMessage: {
    padding: '0.75rem',
    marginBottom: '1rem',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  modoSelector: {
    margin: '1.5rem 0',
    padding: '1rem',
    background: 'white',
    borderRadius: '6px',
  },
  radioGroup: {
    display: 'flex',
    gap: '2rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  patronFijo: {
    margin: '1.5rem 0',
    padding: '1rem',
    background: 'white',
    borderRadius: '6px',
  },
  patronH4: {
    marginTop: 0,
    marginBottom: '1rem',
    fontSize: '0.95rem',
    color: '#333',
  },
  patronGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
  },
  patronItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  sectorLabel: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#666',
  },
  sectorSelect: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  personalizado: {
    margin: '1.5rem 0',
    padding: '1rem',
    background: 'white',
    borderRadius: '6px',
  },
  distribucionTableContainer: {
    overflowX: 'auto' as const,
  },
  distribucionTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  },
  distribucionTh: {
    padding: '0.75rem',
    textAlign: 'center' as const,
    borderBottom: '1px solid #e0e0e0',
    background: '#f5f5f5',
    fontWeight: 600,
    color: '#333',
  },
  distribucionTd: {
    padding: '0.75rem',
    textAlign: 'center' as const,
    borderBottom: '1px solid #e0e0e0',
  },
  diaCell: {
    textAlign: 'left' as const,
    fontWeight: 500,
    color: '#333',
  },
  cantidadInput: {
    width: '60px',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    textAlign: 'center' as const,
    fontSize: '0.9rem',
  },
  resumenDistribuciones: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'white',
    borderRadius: '6px',
    borderLeft: '4px solid #6366f1',
  },
  distribucionesList: {
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  distribucionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    background: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  sectorName: {
    fontWeight: 500,
    color: '#333',
  },
  sectorCount: {
    background: '#e8f5e9',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontWeight: 600,
    color: '#2e7d32',
    fontSize: '0.85rem',
  },
  validacionValid: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #4caf50',
  },
  validacionInvalid: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ef5350',
  },
}
