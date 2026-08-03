import React from 'react'
import { FranjaHoraria } from '../api/franjas'
import { TurnoAlmuerzoResponse } from '../api/turnos'

interface DayDetailViewProps {
  selectedDate: Date
  franjas: FranjaHoraria[]
  turnos: Map<string, TurnoAlmuerzoResponse>
  isDiaNoLaborable: boolean
  formatDate: (date: Date) => string
  renderTurnoPills: (date: Date, franjaId: number) => React.ReactNode
  renderVacacionesPills: (date: Date) => React.ReactNode
  isAdmin?: boolean
  isGenerating?: boolean
  onDiaNoLaborableClick?: (date: Date) => void
  onGenerarDesdeElDia?: (date: Date) => void
}

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  selectedDate,
  franjas,
  turnos,
  isDiaNoLaborable,
  formatDate,
  renderTurnoPills,
  renderVacacionesPills,
  isAdmin = false,
  isGenerating = false,
  onDiaNoLaborableClick,
  onGenerarDesdeElDia,
}) => {
  const dateStr = formatDate(selectedDate)

  return (
    <div className="md:hidden flex flex-col gap-2.5">
      {/* Admin controls */}
      {isAdmin && (
        <div className="flex gap-2">
          <button
            onClick={() => onDiaNoLaborableClick?.(selectedDate)}
            className="flex-1 h-9 rounded-xl text-xs font-semibold transition"
            style={
              isDiaNoLaborable
                ? { background: '#fef3c7', color: '#92400e', border: '1.5px solid #fde68a' }
                : { background: '#f5f5fa', color: '#6b7280', border: '1.5px solid rgba(0,0,0,.06)' }
            }
          >
            {isDiaNoLaborable ? 'Quitar no laborable' : 'Marcar no laborable'}
          </button>
          <button
            onClick={() => onGenerarDesdeElDia?.(selectedDate)}
            disabled={isGenerating}
            className="flex-1 h-9 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {isGenerating ? 'Generando...' : 'Regenerar día'}
          </button>
        </div>
      )}

      {/* Vacaciones card */}
      <div
        className="bg-white rounded-2xl p-3.5"
        style={{ border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
      >
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vacaciones</div>
        <div className="text-xs">{renderVacacionesPills(selectedDate)}</div>
      </div>

      {/* Franjas */}
      {franjas.map(franja => {
        const turno = turnos.get(`${dateStr}-${franja.id}`)
        const isSinTurno = !turno || turno.asignaciones.length === 0

        return (
          <div
            key={franja.id}
            className="bg-white rounded-2xl p-3.5"
            style={{
              border: isSinTurno ? '1.5px solid #fecaca' : '1.5px solid rgba(0,0,0,.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              background: isSinTurno ? '#fef2f2' : '#fff',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">
                {franja.hora_inicio.slice(0, 5)} – {franja.hora_fin.slice(0, 5)}
              </span>
              {turno && turno.asignaciones.length > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#ede9fe', color: '#6d28d9' }}
                >
                  {turno.asignaciones.length} pers.
                </span>
              )}
              {isSinTurno && (
                <span className="text-xs font-semibold text-red-400">Sin asignar</span>
              )}
            </div>
            <div className="text-xs">{renderTurnoPills(selectedDate, franja.id)}</div>
          </div>
        )
      })}
    </div>
  )
}
