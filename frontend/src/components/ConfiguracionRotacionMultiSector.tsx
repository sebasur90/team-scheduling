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
    if (checked && modo === 'patron_fijo' && patronSemanal.length === 0 && sectores.length > 0) {
      // Inicializar patrón fijo
      setPatronSemanal(new Array(diasOrdenados.length).fill(sectores[0]))
    }
    if (checked && modo === 'personalizado' && Object.keys(distribucionPorDia).length === 0 && sectores.length > 0) {
      // Inicializar personalizado
      const newDist: Record<string, Record<string, number>> = {}
      for (const dia of diasOrdenados) {
        newDist[String(dia)] = {}
        for (const sector of sectores) {
          newDist[String(dia)][sector] = 0
        }
      }
      setDistribucionPorDia(newDist)
    }
  }

  const handleModoChange = (nuevoModo: 'patron_fijo' | 'personalizado') => {
    setModo(nuevoModo)

    if (nuevoModo === 'patron_fijo' && patronSemanal.length === 0) {
      setPatronSemanal(new Array(diasOrdenados.length).fill(sectores[0] || ''))
    } else if (nuevoModo === 'personalizado' && Object.keys(distribucionPorDia).length === 0) {
      const newDist: Record<string, Record<string, number>> = {}
      for (const dia of diasOrdenados) {
        newDist[String(dia)] = {}
        for (const sector of sectores) {
          newDist[String(dia)][sector] = 0
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
    const newDist = { ...distribucionPorDia }
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
    <div className="configuracion-rotacion-multisector">
      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={activa}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={disabled}
          />
          <span>Rotación multi-sector</span>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activa && (
        <>
          <div className="modo-selector">
            <div className="radio-group">
              <label className="radio-label">
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
              <label className="radio-label">
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
            <div className="patron-fijo">
              <h4>Patrón Semanal</h4>
              <div className="patron-grid">
                {diasOrdenados.map((dia, idx) => (
                  <div key={dia} className="patron-item">
                    <label className="sector-label">
                      {DIAS_SEMANA[dia]}
                    </label>
                    <select
                      value={patronSemanal[idx] || ''}
                      onChange={(e) => handlePatronChange(idx, e.target.value)}
                      disabled={disabled}
                      className="sector-select"
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
            <div className="personalizado">
              <h4>Distribución por Día</h4>
              <div className="distribucion-table-container">
                <table className="distribucion-table">
                  <thead>
                    <tr>
                      <th>Día</th>
                      {sectores.map((s) => (
                        <th key={s} className="sector-header">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diasOrdenados.map((dia) => (
                      <tr key={dia}>
                        <td className="dia-cell">{DIAS_SEMANA[dia]}</td>
                        {sectores.map((sector) => (
                          <td key={`${dia}-${sector}`} className="input-cell">
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
                              className="cantidad-input"
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

          <div className="resumen-distribuciones">
            <h4>Distribución Total</h4>
            <div className="distribuciones-list">
              {sectores.map((sector) => (
                <div key={sector} className="distribucion-item">
                  <span className="sector-name">{sector}</span>
                  <span className="sector-count">
                    {distribuciones[sector] || 0} colaboradores
                  </span>
                </div>
              ))}
            </div>
            <div className={`validacion ${isValid ? 'valid' : 'invalid'}`}>
              <span>
                Total: <strong>{totalColaboradores}</strong> / {diasRequeridos} días
              </span>
              {!isValid && (
                <span className="error-hint">
                  La suma debe ser igual a {diasRequeridos}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .configuracion-rotacion-multisector {
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #f9f9f9;
        }

        .checkbox-group {
          margin-bottom: 1.5rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .checkbox-label input {
          cursor: pointer;
        }

        .error-message {
          padding: 0.75rem;
          margin-bottom: 1rem;
          background-color: #fee;
          color: #c33;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .modo-selector {
          margin: 1.5rem 0;
          padding: 1rem;
          background: white;
          border-radius: 6px;
        }

        .radio-group {
          display: flex;
          gap: 2rem;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .radio-label input {
          cursor: pointer;
        }

        .patron-fijo {
          margin: 1.5rem 0;
          padding: 1rem;
          background: white;
          border-radius: 6px;
        }

        .patron-fijo h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 0.95rem;
          color: #333;
        }

        .patron-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .patron-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sector-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
        }

        .sector-select {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .sector-select:disabled {
          background-color: #f0f0f0;
          cursor: not-allowed;
        }

        .personalizado {
          margin: 1.5rem 0;
          padding: 1rem;
          background: white;
          border-radius: 6px;
        }

        .personalizado h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 0.95rem;
          color: #333;
        }

        .distribucion-table-container {
          overflow-x: auto;
        }

        .distribucion-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .distribucion-table th,
        .distribucion-table td {
          padding: 0.75rem;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
        }

        .distribucion-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #333;
        }

        .distribucion-table tbody tr:hover {
          background: #fafafa;
        }

        .dia-cell {
          text-align: left;
          font-weight: 500;
          color: #333;
        }

        .sector-header {
          color: #666;
          font-size: 0.85rem;
        }

        .input-cell {
          padding: 0.5rem;
        }

        .cantidad-input {
          width: 60px;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          text-align: center;
          font-size: 0.9rem;
        }

        .cantidad-input:disabled {
          background-color: #f0f0f0;
          cursor: not-allowed;
        }

        .resumen-distribuciones {
          margin-top: 1.5rem;
          padding: 1rem;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #6366f1;
        }

        .resumen-distribuciones h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 0.95rem;
          color: #333;
        }

        .distribuciones-list {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .distribucion-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #f9f9f9;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .sector-name {
          font-weight: 500;
          color: #333;
        }

        .sector-count {
          background: #e8f5e9;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
          color: #2e7d32;
          font-size: 0.85rem;
        }

        .validacion {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .validacion.valid {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #4caf50;
        }

        .validacion.invalid {
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ef5350;
        }

        .error-hint {
          display: block;
          margin-top: 0.5rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}
