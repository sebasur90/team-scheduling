import React, { useState, useEffect } from 'react'
import { TareaEspecialTipo, TareaEspecialTipoCreate, TareaEquipoCuotaCreate } from '../api/tareasEspeciales'
import CuotasEquipoStep from './CuotasEquipoStep'
import './FormTareaEspecial.css'

interface Sector {
  id: number
  nombre: string
}

interface FormTareaEspecialProps {
  sectores: Sector[]
  initialData?: TareaEspecialTipo
  onSave: (data: TareaEspecialTipoCreate) => Promise<void>
  onCancel: () => void
}

interface WizardState {
  nombre: string
  descripcion: string
  vigencia: { indefinida: boolean; desde: string; hasta: string }
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
  minimo_personas_dia: number
  frecuencia: 'semanal' | 'quincenal'
  fecha_inicio_ciclo: string | null
  cuotas: TareaEquipoCuotaCreate[]
  inhabilita_almuerzo: boolean
  fija_almuerzo: boolean
  franja_almuerzo_id: number | null
  politica_minimo: 'alertar' | 'bloquear'
}

export default function FormTareaEspecial({
  sectores,
  initialData,
  onSave,
  onCancel,
}: FormTareaEspecialProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<WizardState>({
    nombre: initialData?.nombre || '',
    descripcion: '',
    vigencia: { indefinida: true, desde: '', hasta: '' },
    dia_semana_aplicable: initialData?.dia_semana_aplicable || [0, 1, 2, 3, 4],
    hora_inicio: initialData?.hora_inicio || '09:00',
    hora_fin: initialData?.hora_fin || '17:00',
    minimo_personas_dia: initialData?.minimo_personas_dia || 1,
    frecuencia: (initialData?.frecuencia as 'semanal' | 'quincenal') || 'semanal',
    fecha_inicio_ciclo: initialData?.fecha_inicio_ciclo || null,
    cuotas: initialData?.cuotas_equipo || [],
    inhabilita_almuerzo: initialData?.inhabilita_almuerzo || false,
    fija_almuerzo: initialData?.fija_almuerzo || false,
    franja_almuerzo_id: initialData?.franja_almuerzo_id || null,
    politica_minimo: (initialData?.politica_minimo as 'alertar' | 'bloquear') || 'alertar',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    if (name.startsWith('dia_')) {
      const dayNum = parseInt(name.split('_')[1])
      setForm((prev) => ({
        ...prev,
        dia_semana_aplicable: (e.target as HTMLInputElement).checked
          ? [...prev.dia_semana_aplicable, dayNum]
          : prev.dia_semana_aplicable.filter((d) => d !== dayNum),
      }))
    } else {
      setForm((prev) => ({ ...prev, [name]: finalValue }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload: TareaEspecialTipoCreate = {
        nombre: form.nombre,
        dia_semana_aplicable: form.dia_semana_aplicable,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        frecuencia: form.frecuencia,
        inhabilita_almuerzo: form.inhabilita_almuerzo,
        fecha_inicio_ciclo: form.frecuencia === 'quincenal' ? form.fecha_inicio_ciclo : null,
        fija_almuerzo: form.fija_almuerzo,
        franja_almuerzo_id: form.fija_almuerzo ? form.franja_almuerzo_id : null,
        minimo_personas_dia: form.minimo_personas_dia,
        politica_minimo: form.politica_minimo,
        cuotas: form.cuotas.length > 0 ? form.cuotas : undefined,
      }
      await onSave(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const dias_nombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="form-tarea-especial">
      <div className="form-tarea-especial__header">
        <h2 className="form-tarea-especial__title">
          {initialData ? 'Editar Tarea Especial' : 'Nueva Tarea Especial'}
        </h2>
      </div>

      <div className="form-tarea-especial__steps">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`form-tarea-especial__step-button ${s === step ? 'active' : ''} ${
              s < step ? 'completed' : ''
            }`}
          >
            {s === step ? s : s < step ? '✓' : s}
          </button>
        ))}
      </div>

      {error && <div className="form-tarea-especial__error">{error}</div>}

      <div className="form-tarea-especial__content">
        {step === 1 && (
          <div className="form-tarea-especial__section">
            <div className="form-tarea-especial__field-group">
              <label htmlFor="nombre" className="form-tarea-especial__label">
                Nombre *
              </label>
              <input
                id="nombre"
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Gestión de Turnos"
                className="form-tarea-especial__input"
              />
            </div>

            <div className="form-tarea-especial__field-group">
              <label className="form-tarea-especial__label">Vigencia</label>
              <label className="form-tarea-especial__checkbox-label">
                <input
                  type="checkbox"
                  checked={form.vigencia.indefinida}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      vigencia: { ...prev.vigencia, indefinida: e.target.checked },
                    }))
                  }
                />
                <span>Indefinida</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-tarea-especial__section">
            <div className="form-tarea-especial__field-group">
              <label className="form-tarea-especial__label">Días aplicables</label>
              <div className="form-tarea-especial__days-grid">
                {dias_nombres.map((day, i) => (
                  <div key={i} className="form-tarea-especial__day-checkbox">
                    <input
                      type="checkbox"
                      id={`dia_${i}`}
                      name={`dia_${i}`}
                      checked={form.dia_semana_aplicable.includes(i)}
                      onChange={handleInputChange}
                    />
                    <label htmlFor={`dia_${i}`} className="form-tarea-especial__day-label">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-tarea-especial__field-group">
                <label htmlFor="hora_inicio" className="form-tarea-especial__label">
                  Hora inicio
                </label>
                <input
                  id="hora_inicio"
                  type="time"
                  name="hora_inicio"
                  value={form.hora_inicio}
                  onChange={handleInputChange}
                  className="form-tarea-especial__input"
                />
              </div>
              <div className="form-tarea-especial__field-group">
                <label htmlFor="hora_fin" className="form-tarea-especial__label">
                  Hora fin
                </label>
                <input
                  id="hora_fin"
                  type="time"
                  name="hora_fin"
                  value={form.hora_fin}
                  onChange={handleInputChange}
                  className="form-tarea-especial__input"
                />
              </div>
            </div>

            <div className="form-tarea-especial__field-group">
              <label htmlFor="minimo_personas_dia" className="form-tarea-especial__label">
                Mínimo de personas por día
              </label>
              <input
                id="minimo_personas_dia"
                type="number"
                name="minimo_personas_dia"
                min="1"
                max="20"
                value={form.minimo_personas_dia}
                onChange={handleInputChange}
                className="form-tarea-especial__input"
              />
            </div>

            <div className="form-tarea-especial__field-group">
              <label className="form-tarea-especial__label">Frecuencia</label>
              <div className="form-tarea-especial__radio-group">
                {(['semanal', 'quincenal'] as const).map((freq) => (
                  <label key={freq} className="form-tarea-especial__radio-label">
                    <input
                      type="radio"
                      name="frecuencia"
                      value={freq}
                      checked={form.frecuencia === freq}
                      onChange={handleInputChange}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{freq}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.frecuencia === 'quincenal' && (
              <div className="form-tarea-especial__field-group">
                <label htmlFor="fecha_inicio_ciclo" className="form-tarea-especial__label">
                  Fecha inicio ciclo
                </label>
                <input
                  id="fecha_inicio_ciclo"
                  type="date"
                  name="fecha_inicio_ciclo"
                  value={form.fecha_inicio_ciclo || ''}
                  onChange={handleInputChange}
                  className="form-tarea-especial__input"
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <CuotasEquipoStep
            cuotas={form.cuotas}
            sectores={sectores}
            minimoDiario={form.minimo_personas_dia}
            onChange={(cuotas) => setForm((prev) => ({ ...prev, cuotas }))}
          />
        )}

        {step === 4 && (
          <div className="form-tarea-especial__section">
            <div className="form-tarea-especial__field-group">
              <label className="form-tarea-especial__checkbox-label">
                <input
                  type="checkbox"
                  name="inhabilita_almuerzo"
                  checked={form.inhabilita_almuerzo}
                  onChange={handleInputChange}
                />
                <span>Inhabilita almuerzo durante la tarea</span>
              </label>
            </div>

            {form.inhabilita_almuerzo && (
              <div className="form-tarea-especial__field-group">
                <label className="form-tarea-especial__checkbox-label">
                  <input
                    type="checkbox"
                    name="fija_almuerzo"
                    checked={form.fija_almuerzo}
                    onChange={handleInputChange}
                  />
                  <span>Fijar horario de almuerzo</span>
                </label>
              </div>
            )}

            <div className="form-tarea-especial__field-group">
              <label className="form-tarea-especial__label">
                Política cuando no se alcanza el mínimo
              </label>
              <div className="form-tarea-especial__radio-group">
                {(['alertar', 'bloquear'] as const).map((pol) => (
                  <label key={pol} className="form-tarea-especial__radio-label">
                    <input
                      type="radio"
                      name="politica_minimo"
                      value={pol}
                      checked={form.politica_minimo === pol}
                      onChange={handleInputChange}
                    />
                    <span>
                      {pol === 'alertar' ? 'Alertar y continuar' : 'Bloquear generación'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-tarea-especial__actions">
        <button onClick={onCancel} className="form-tarea-especial__button form-tarea-especial__button--cancel">
          Cancelar
        </button>

        <div className="form-tarea-especial__button-group">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="form-tarea-especial__button form-tarea-especial__button--secondary"
            >
              Anterior
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="form-tarea-especial__button form-tarea-especial__button--primary"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="form-tarea-especial__button form-tarea-especial__button--primary"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
