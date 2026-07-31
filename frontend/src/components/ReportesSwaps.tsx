import React, { useState } from 'react'
import { ResumenSwaps } from '../api/admin_reportes'

interface ReportesSwapsProps {
  data: ResumenSwaps | null
  loading: boolean
  error: string | null
}

export const ReportesSwaps: React.FC<ReportesSwapsProps> = ({ data, loading, error }) => {
  const [detailView, setDetailView] = useState(false)

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Cargando datos de swaps...</div>
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-500">Sin datos disponibles</div>
  }

  const stats = data.estadisticas
  const porcentajeAceptados = stats.total_general > 0 ? ((stats.total_aceptados / stats.total_general) * 100).toFixed(1) : 0
  const porcentajeRechazados = stats.total_general > 0 ? ((stats.total_rechazados / stats.total_general) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumen</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 text-center border-l-4 border-amber-500">
            <p className="text-2xl font-bold text-amber-600">{stats.total_pendientes}</p>
            <p className="text-xs text-slate-600 mt-1">Pendientes ⏳</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border-l-4 border-emerald-500">
            <p className="text-2xl font-bold text-emerald-600">{stats.total_aceptados}</p>
            <p className="text-xs text-slate-600 mt-1">Aceptados ✓ ({porcentajeAceptados}%)</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border-l-4 border-red-500">
            <p className="text-2xl font-bold text-red-600">{stats.total_rechazados}</p>
            <p className="text-xs text-slate-600 mt-1">Rechazados ✗ ({porcentajeRechazados}%)</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center border-l-4 border-slate-400">
            <p className="text-2xl font-bold text-slate-600">{stats.total_general}</p>
            <p className="text-xs text-slate-600 mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Más Activos</h3>
        <button
          onClick={() => setDetailView(!detailView)}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm transition"
        >
          {detailView ? 'Ver Ranking' : 'Ver Detalle'}
        </button>
      </div>

      {!detailView ? (
        // Vista de ranking
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Colaborador</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Pendientes</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Aceptados</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Rechazados</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.slice(0, 20).map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                      {item.swaps_pendientes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                      {item.swaps_aceptados}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      {item.swaps_rechazados}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Vista de detalle
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Solicitante</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Receptor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Franja Origen</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900">Antigüedad</th>
              </tr>
            </thead>
            <tbody>
              {data.detalle.slice(0, 30).map((item, idx) => {
                const statusColor =
                  item.estado === 'aceptado' ? 'bg-emerald-100 text-emerald-700' :
                  item.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                const statusLabel =
                  item.estado === 'aceptado' ? '✓ Aceptado' :
                  item.estado === 'rechazado' ? '✗ Rechazado' :
                  '⏳ Pendiente'

                return (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{item.fecha}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{item.solicitante_nombre}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{item.receptor_nombre}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{item.franja_origen}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600 text-xs">{item.dias_antiguedad}d</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
