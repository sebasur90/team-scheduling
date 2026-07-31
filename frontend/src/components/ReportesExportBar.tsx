import React, { useState } from 'react'
import { adminReportesApi } from '../api/admin_reportes'

interface ReportesExportBarProps {
  seccion: 'ausencias' | 'franjas' | 'swaps'
  fechaInicio: string
  fechaFin: string
  sectorId?: number
}

export const ReportesExportBar: React.FC<ReportesExportBarProps> = ({
  seccion,
  fechaInicio,
  fechaFin,
  sectorId,
}) => {
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setExporting(format)
      setError(null)

      const response = format === 'csv'
        ? await adminReportesApi.exportCsv(seccion, fechaInicio, fechaFin, sectorId)
        : await adminReportesApi.exportPdf(seccion, fechaInicio, fechaFin, sectorId)

      // Crear blob y descargar
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'application/pdf',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${seccion}_${fechaInicio}_${fechaFin}.${format === 'csv' ? 'csv' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error(`Error exporting ${format}:`, err)
      setError(err.message || `Error al exportar ${format.toUpperCase()}`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600">Exportar:</span>
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting !== null}
        className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
          exporting === 'csv'
            ? 'bg-slate-400 text-white cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {exporting === 'csv' ? '⬇️ Exportando...' : '⬇️ CSV'}
      </button>
      <button
        onClick={() => handleExport('pdf')}
        disabled={exporting !== null}
        className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
          exporting === 'pdf'
            ? 'bg-slate-400 text-white cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {exporting === 'pdf' ? '⬇️ Exportando...' : '⬇️ PDF'}
      </button>
      {error && (
        <span className="text-red-600 text-sm">{error}</span>
      )}
    </div>
  )
}
