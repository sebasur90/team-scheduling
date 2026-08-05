import React, { useState } from 'react'
import { TareaEquipoCuota, TareaEquipoCuotaCreate } from '../api/tareasEspeciales'
import './CuotasEquipoStep.css'

interface Sector {
  id: number
  nombre: string
}

interface TareaEquipoCuotaForm extends TareaEquipoCuotaCreate {
  key?: string
}

interface CuotasEquipoStepProps {
  cuotas: TareaEquipoCuotaForm[]
  sectores: Sector[]
  minimoDiario: number
  onChange: (cuotas: TareaEquipoCuotaForm[]) => void
}

export default function CuotasEquipoStep({
  cuotas,
  sectores,
  minimoDiario,
  onChange,
}: CuotasEquipoStepProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(
    cuotas.length > 0 ? 0 : null
  )

  const usedSectorIds = new Set(cuotas.map((c) => c.sector_id))
  const availableSectors = sectores.filter((s) => !usedSectorIds.has(s.id))

  const handleAddCuota = () => {
    const newCuota: TareaEquipoCuotaForm = {
      key: Date.now().toString(),
      sector_id: availableSectors[0]?.id || 0,
      personas_por_turno: 1,
      frecuencia: 'diaria',
    }
    onChange([...cuotas, newCuota])
    setExpandedIdx(cuotas.length)
  }

  const handleRemoveCuota = (idx: number) => {
    onChange(cuotas.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
  }

  const handleCuotaChange = (idx: number, changes: Partial<TareaEquipoCuotaForm>) => {
    const updated = [...cuotas]
    updated[idx] = { ...updated[idx], ...changes }
    onChange(updated)
  }

  const calcCobertura = (): { diaria: number; total: number } => {
    let diaria = 0
    let total = 0

    for (const c of cuotas) {
      if (c.frecuencia === 'diaria') {
        diaria += c.personas_por_turno
        total += c.personas_por_turno
      } else if (c.frecuencia === 'semanal' && c.veces_por_semana) {
        total += c.personas_por_turno * c.veces_por_semana
      }
    }

    return { diaria, total: Math.ceil(total / 5) }
  }

  const cob = calcCobertura()

  return (
    <div className="cuotas-equipo-step">
      <div className="cuotas-equipo-step__header">
        <h3 className="cuotas-equipo-step__title">Cuotas por Equipo</h3>
        <p className="cuotas-equipo-step__description">
          Define cuántos colaboradores de cada sector se asignan y con qué frecuencia
        </p>
      </div>

      <div className="cuotas-equipo-step__list">
        {cuotas.map((cuota, idx) => {
          const sectorNombre = sectores.find((s) => s.id === cuota.sector_id)?.nombre || 'Sector'
          const isExpanded = expandedIdx === idx
          return (
            <div key={cuota.key || idx} className="cuota-card">
              <div
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className={`cuota-card__header ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="cuota-card__title">
                  <strong>{sectorNombre}</strong>
                  <span className="cuota-card__info">
                    {cuota.personas_por_turno} persona{cuota.personas_por_turno !== 1 ? 's' : ''}
                    {cuota.frecuencia === 'semanal' && ` - ${cuota.veces_por_semana}x/semana`}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveCuota(idx)
                  }}
                  className="cuota-card__remove-btn"
                >
                  Remover
                </button>
              </div>

              {isExpanded && (
                <div className="cuota-card__body">
                  <div className="cuota-card__section">
                    <label className="cuota-card__label">Sector</label>
                    <select
                      value={cuota.sector_id}
                      onChange={(e) =>
                        handleCuotaChange(idx, {
                          sector_id: parseInt(e.target.value),
                        })
                      }
                      className="cuota-card__select"
                    >
                      {sectores
                        .filter((s) => s.id === cuota.sector_id || !usedSectorIds.has(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="cuota-card__section">
                    <label className="cuota-card__label">Personas por turno</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={cuota.personas_por_turno}
                      onChange={(e) =>
                        handleCuotaChange(idx, {
                          personas_por_turno: parseInt(e.target.value),
                        })
                      }
                      className="cuota-card__input"
                    />
                  </div>

                  <div className="cuota-card__section">
                    <label className="cuota-card__label">Frecuencia</label>
                    <div className="cuota-card__radio-group">
                      {['diaria', 'semanal'].map((freq) => (
                        <label key={freq} className="cuota-card__radio-label">
                          <input
                            type="radio"
                            name={`freq_${idx}`}
                            value={freq}
                            checked={cuota.frecuencia === freq}
                            onChange={(e) =>
                              handleCuotaChange(idx, {
                                frecuencia: e.target.value as 'diaria' | 'semanal',
                                ...(e.target.value === 'diaria' && {
                                  veces_por_semana: undefined,
                                  dia_tipo: undefined,
                                  dia_fijo: undefined,
                                }),
                              })
                            }
                          />
                          <span style={{ textTransform: 'capitalize' }}>{freq}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {cuota.frecuencia === 'semanal' && (
                    <>
                      <div className="cuota-card__section">
                        <label className="cuota-card__label">Veces por semana</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={cuota.veces_por_semana || 1}
                          onChange={(e) =>
                            handleCuotaChange(idx, {
                              veces_por_semana: parseInt(e.target.value),
                            })
                          }
                          className="cuota-card__input"
                        />
                      </div>

                      <div className="cuota-card__section">
                        <label className="cuota-card__label">Tipo de día</label>
                        <div className="cuota-card__radio-group">
                          {['fijo', 'rotativo'].map((tipo) => (
                            <label key={tipo} className="cuota-card__radio-label">
                              <input
                                type="radio"
                                name={`dia_tipo_${idx}`}
                                value={tipo}
                                checked={cuota.dia_tipo === tipo}
                                onChange={(e) =>
                                  handleCuotaChange(idx, {
                                    dia_tipo: e.target.value as 'fijo' | 'rotativo',
                                    ...(e.target.value === 'rotativo' && {
                                      dia_fijo: undefined,
                                    }),
                                  })
                                }
                              />
                              <span style={{ textTransform: 'capitalize' }}>{tipo}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {cuota.dia_tipo === 'fijo' && (
                        <div className="cuota-card__section">
                          <label className="cuota-card__label">Día de la semana</label>
                          <select
                            value={cuota.dia_fijo ?? 0}
                            onChange={(e) =>
                              handleCuotaChange(idx, {
                                dia_fijo: parseInt(e.target.value),
                              })
                            }
                            className="cuota-card__select"
                          >
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
                              (day, d) => (
                                <option key={d} value={d}>
                                  {day}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {availableSectors.length > 0 && (
        <button onClick={handleAddCuota} className="cuotas-equipo-step__add-btn">
          + Agregar equipo
        </button>
      )}

      <div className="cuotas-equipo-step__summary">
        <strong>Cobertura estimada</strong>
        <ul>
          <li>Diaria: {cob.diaria} personas</li>
          <li>Promedio semanal: {cob.total} personas/día</li>
          <li>
            Mínimo requerido: {minimoDiario}{' '}
            <span className={cob.diaria >= minimoDiario ? 'success' : 'danger'}>
              {cob.diaria >= minimoDiario ? '✓' : '✗'}
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
