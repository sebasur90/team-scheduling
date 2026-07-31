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
}

export const DayDetailView: React.FC<DayDetailViewProps> = ({
  selectedDate,
  franjas,
  turnos,
  isDiaNoLaborable,
  formatDate,
  renderTurnoPills,
  renderVacacionesPills,
}) => {
  const dateStr = formatDate(selectedDate)

  return (
    <div className="md:hidden space-y-3">
      {isDiaNoLaborable && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
          <div className="text-sm font-medium text-amber-900">Día no laborable</div>
        </div>
      )}

      {/* Vacaciones */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">De Vacaciones</div>
        <div className="text-sm">{renderVacacionesPills(selectedDate)}</div>
      </div>

      {/* Franjas */}
      {franjas.map(franja => {
        const turno = turnos.get(`${dateStr}-${franja.id}`)
        const isSinTurno = !turno || turno.asignaciones.length === 0

        return (
          <div
            key={franja.id}
            className={`rounded-lg border p-3 ${
              isSinTurno
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">
                {franja.hora_inicio} – {franja.hora_fin}
              </div>
              {turno && (
                <div className="text-xs text-gray-500">
                  {turno.asignaciones.length}/{turno.capacidad || turno.asignaciones.length}
                </div>
              )}
            </div>
            <div className="text-sm">
              {renderTurnoPills(selectedDate, franja.id)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
