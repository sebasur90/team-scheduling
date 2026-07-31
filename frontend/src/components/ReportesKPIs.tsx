import React from 'react'
import { ResumenAusencias } from '../api/admin_reportes'
import { ResumenSwaps } from '../api/admin_reportes'

interface ReportesKPIsProps {
  ausenciasTotal: number
  vacacionesTotal: number
  swapsData: { pendientes: number; aceptados: number; rechazados: number } | null
  coberturaPromedio: number
}

export const ReportesKPIs: React.FC<ReportesKPIsProps> = ({
  ausenciasTotal,
  vacacionesTotal,
  swapsData,
  coberturaPromedio,
}) => {
  const swapStates = swapsData ? [
    { icon: '✓', count: swapsData.aceptados, label: 'Aceptados', color: 'bg-emerald-100 text-emerald-700' },
    { icon: '✗', count: swapsData.rechazados, label: 'Rechazados', color: 'bg-red-100 text-red-700' },
    { icon: '⏳', count: swapsData.pendientes, label: 'Pendientes', color: 'bg-amber-100 text-amber-700' },
  ] : []

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* KPI: Ausencias */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Ausencias</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{ausenciasTotal}</p>
            <p className="text-xs text-red-600 mt-2">
              {vacacionesTotal > 0 ? `(+${vacacionesTotal} vacaciones)` : 'Sin vacaciones'}
            </p>
          </div>
          <div className="text-4xl">📊</div>
        </div>
      </div>

      {/* KPI: Swaps */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Swaps</p>
            <div className="flex gap-2 mt-2">
              {swapStates.map((state) => (
                <div key={state.label} className={`px-2 py-1 rounded ${state.color} text-xs font-semibold`}>
                  {state.count}{state.icon}
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Total: {swapsData ? swapsData.aceptados + swapsData.rechazados + swapsData.pendientes : 0}
            </p>
          </div>
          <div className="text-4xl">↔️</div>
        </div>
      </div>

      {/* KPI: Cobertura */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600">Cobertura</p>
            <p className="text-3xl font-bold text-emerald-700 mt-1">{coberturaPromedio.toFixed(1)}%</p>
            <p className="text-xs text-emerald-600 mt-2">Días con cobertura ≥ mínimo</p>
          </div>
          <div className="text-4xl">✓</div>
        </div>
      </div>
    </div>
  )
}
