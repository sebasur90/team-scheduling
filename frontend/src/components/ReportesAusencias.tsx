import React, { useState } from 'react'
import { ResumenAusencias } from '../api/admin_reportes'

interface ReportesAusenciasProps {
  data: ResumenAusencias | null
  loading: boolean
  error: string | null
}

type SortField = 'nombre' | 'cantidad' | 'porcentaje'
type SortOrder = 'asc' | 'desc'

export const ReportesAusencias: React.FC<ReportesAusenciasProps> = ({ data, loading, error }) => {
  const [detailView, setDetailView] = useState(false)
  const [sortField, setSortField] = useState<SortField>('cantidad')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error: {error}
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Cargando ausencias...</div>
  }

  if (!data) {
    return <div className="text-center py-8 text-slate-500">Sin datos disponibles</div>
  }

  const sortedRanking = [...data.ranking].sort((a, b) => {
    let aVal = a[sortField === 'cantidad' ? 'cantidad_ausencias' : sortField === 'porcentaje' ? 'porcentaje_semana' : 'nombre']
    let bVal = b[sortField === 'cantidad' ? 'cantidad_ausencias' : sortField === 'porcentaje' ? 'porcentaje_semana' : 'nombre']

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = (bVal as string).toLowerCase()
    }

    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">Ausencias</h3>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-900 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('nombre')}>
                  Colaborador {sortField === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('cantidad')}>
                  Cantidad {sortField === 'cantidad' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-center font-semibold text-slate-900 cursor-pointer hover:bg-slate-200" onClick={() => handleSort('porcentaje')}>
                  % Semana {sortField === 'porcentaje' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRanking.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-32 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${Math.min(item.cantidad_ausencias * 10, 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-slate-900">{item.cantidad_ausencias}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.porcentaje_semana.toFixed(1)}%</td>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Colaborador</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Motivo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Creado</th>
              </tr>
            </thead>
            <tbody>
              {data.detalle.map((item, idx) => {
                const motivoColor =
                  item.motivo === 'vacaciones' ? 'bg-blue-100 text-blue-700' :
                  item.motivo === 'enfermedad' ? 'bg-red-100 text-red-700' :
                  item.motivo === 'licencia' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'

                return (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{item.fecha}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{item.nombre_colaborador}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${motivoColor}`}>
                        {item.motivo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Total de registros: {data.total_registros}
      </div>
    </div>
  )
}
