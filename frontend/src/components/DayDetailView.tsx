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
    <div className="md:hidden space-y-2">
      {/* Controls row - compact layout */}
      {isAdmin && (
        <div className="flex gap-2 items-stretch">
          {/* Día no laborable button */}
          <button
            onClick={() => onDiaNoLaborableClick?.(selectedDate)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition whitespace-nowrap ${
              isDiaNoLaborable
                ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isDiaNoLaborable ? 'Sin laborable' : 'No laborable'}
          </button>

          {/* Generar día button */}
          <button
            onClick={() => onGenerarDesdeElDia?.(selectedDate)}
            disabled={isGenerating}
            className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sky-700 hover:bg-sky-800 text-white'
            }`}
          >
            {isGenerating ? 'Gen...' : 'Regenerar'}
          </button>
        </div>
      )}

      {/* Vacaciones */}
      <div className="bg-white rounded border border-gray-200 p-2">
        <div className="text-xs font-semibold text-gray-600 mb-1">Vacaciones</div>
        <div className="text-xs">{renderVacacionesPills(selectedDate)}</div>
      </div>

      {/* Franjas */}
      {franjas.map(franja => {
        const turno = turnos.get(`${dateStr}-${franja.id}`)
        const isSinTurno = !turno || turno.asignaciones.length === 0

        return (
          <div
            key={franja.id}
            className={`rounded border p-2 ${
              isSinTurno
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-gray-900">
                {franja.hora_inicio.slice(0, 5)} – {franja.hora_fin.slice(0, 5)}
              </div>
              {turno && (
                <div className="text-xs text-gray-500">
                  {turno.asignaciones.length}
                </div>
              )}
            </div>
            <div className="text-xs">
              {renderTurnoPills(selectedDate, franja.id)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
