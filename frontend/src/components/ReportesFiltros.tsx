import React from 'react'

interface ReportesFiltrosProps {
  periodType: 'semanal' | 'mensual' | 'personalizado'
  onPeriodChange: (type: 'semanal' | 'mensual' | 'personalizado') => void
  fechaInicio: string
  onFechaInicio: (fecha: string) => void
  fechaFin: string
  onFechaFin: (fecha: string) => void
  sectorId?: number
  onSectorChange: (sectorId?: number) => void
  sectores: { id: number; nombre: string }[]
}

export const ReportesFiltros: React.FC<ReportesFiltrosProps> = ({
  periodType,
  onPeriodChange,
  fechaInicio,
  onFechaInicio,
  fechaFin,
  onFechaFin,
  sectorId,
  onSectorChange,
  sectores,
}) => {
  return (
    <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Período preestablecido */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Período</label>
          <select
            value={periodType}
            onChange={(e) => onPeriodChange(e.target.value as 'semanal' | 'mensual' | 'personalizado')}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="semanal">Últimos 7 días</option>
            <option value="mensual">Este mes</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </div>

        {/* Fecha inicio */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => onFechaInicio(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Fecha fin */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => onFechaFin(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Sector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">Sector</label>
          <select
            value={sectorId || 'todos'}
            onChange={(e) => onSectorChange(e.target.value === 'todos' ? undefined : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="todos">Todos</option>
            {sectores.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
