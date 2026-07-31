import React, { useState } from 'react'
import { ResumenFranjas } from '../api/admin_reportes'

interface ReportesFranjasProps {
  data: ResumenFranjas | null
  loading: boolean
  error: string | null
}

export const ReportesFranjas: React.FC<ReportesFranjasProps> = ({ data, loading, error }) => {
  const [activeSection, setActiveSection] = useState<'distribucion' | 'preferencias' | 'cobertura'>('distribucion')

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Cargando datos de franjas...</div>
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-500">Sin datos disponibles</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'distribucion' as const, label: 'Distribución' },
          { id: 'preferencias' as const, label: 'Preferencias' },
          { id: 'cobertura' as const, label: 'Cobertura' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 border-b-2 font-medium transition ${
              activeSection === tab.id
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'distribucion' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Distribución de Asignaciones</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.distribucion.slice(0, 15).map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{item.franja_nombre} ({item.hora_inicio} - {item.hora_fin})</p>
                    <p className="text-xs text-slate-600">{item.fecha}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Cap: {item.capacidad}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Asignados: {item.asignados}</div>
                  <div className="bg-red-100 text-red-700 px-2 py-1 rounded">Ausentes: {item.ausentes}</div>
                  <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Disponibles: {item.disponibles_backlog}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'preferencias' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Cumplimiento de Preferencias</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Colaborador</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Preferencia</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Cumplimiento</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.cumplimiento_preferencias.map((item, idx) => {
                  const porcentaje = item.porcentaje_cumplimiento
                  const isLow = porcentaje < 70
                  const statusColor = isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'

                  return (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900 font-medium">{item.nombre}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.franja_preferida_nombre || 'N/A'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${porcentaje}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold text-slate-900">{porcentaje.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                          {isLow ? '⚠️ Bajo' : '✓ OK'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'cobertura' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Cobertura Real vs Configurada</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Franja</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Ocupación</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Capacidad</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-900">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.cobertura_real.map((item, idx) => {
                  const isCritical = item.porcentaje_cobertura < 50
                  const isWarning = item.porcentaje_cobertura < 80
                  const statusColor =
                    isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  const statusLabel = isCritical ? '✗ Crítica' : isWarning ? '⚠️ Baja' : '✓ OK'

                  return (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900 font-medium">{item.franja_nombre} ({item.hora_inicio} - {item.hora_fin})</td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.ocupacion_promedio.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.capacidad_promedio.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
