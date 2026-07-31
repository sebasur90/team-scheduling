import React, { useState, useEffect } from 'react'
import { useReportesAusencias, useReportesFranjas, useReportesSwaps } from '../hooks/useReportes'
import { ReportesFiltros } from './ReportesFiltros'
import { ReportesKPIs } from './ReportesKPIs'
import { ReportesAusencias } from './ReportesAusencias'
import { ReportesFranjas } from './ReportesFranjas'
import { ReportesSwaps } from './ReportesSwaps'
import { ReportesExportBar } from './ReportesExportBar'
import { sectoresApi, type Sector } from '../api/sectores'

type TabType = 'ausencias' | 'franjas' | 'swaps'
type PeriodType = 'semanal' | 'mensual' | 'personalizado'

export const ReportesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ausencias')
  const [periodType, setPeriodType] = useState<PeriodType>('semanal')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [sectorId, setSectorId] = useState<number | undefined>()
  const [sectores, setSectores] = useState<Sector[]>([])

  // Cargar sectores
  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await sectoresApi.list()
        setSectores(res.data)
      } catch (err) {
        console.error('Error cargando sectores:', err)
      }
    }
    fetchSectores()
  }, [])

  // Inicializar fechas basado en período
  useEffect(() => {
    const today = new Date()
    const inicio = new Date(today)
    const fin = new Date(today)

    if (periodType === 'semanal') {
      inicio.setDate(today.getDate() - 7)
    } else if (periodType === 'mensual') {
      inicio.setDate(1)
    }

    setFechaInicio(inicio.toISOString().split('T')[0])
    setFechaFin(fin.toISOString().split('T')[0])
  }, [periodType])

  // Fetch data para cada sección
  const ausenciasData = useReportesAusencias({
    fechaInicio,
    fechaFin,
    sectorId,
  })

  const franjasData = useReportesFranjas({
    fechaInicio,
    fechaFin,
    sectorId,
  })

  const swapsData = useReportesSwaps({
    fechaInicio,
    fechaFin,
    sectorId,
  })

  // Calcular KPIs
  const ausenciasTotal = ausenciasData.data?.detalle.filter(a => a.motivo !== 'vacaciones').length || 0
  const vacacionesTotal = ausenciasData.data?.detalle.filter(a => a.motivo === 'vacaciones').length || 0
  const swapsStats = swapsData.data?.estadisticas ? {
    pendientes: swapsData.data.estadisticas.total_pendientes,
    aceptados: swapsData.data.estadisticas.total_aceptados,
    rechazados: swapsData.data.estadisticas.total_rechazados,
  } : null

  const coberturaPromedio = franjasData.data?.cobertura_real
    ? (franjasData.data.cobertura_real.reduce((sum, item) => sum + item.porcentaje_cobertura, 0) / franjasData.data.cobertura_real.length)
    : 0

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type)
  }

  const handleFechaInicio = (fecha: string) => {
    setFechaInicio(fecha)
    if (fecha > fechaFin) {
      setFechaFin(fecha)
    }
  }

  const handleFechaFin = (fecha: string) => {
    setFechaFin(fecha)
    if (fecha < fechaInicio) {
      setFechaInicio(fecha)
    }
  }

  const handleSectorChange = (id?: number) => {
    setSectorId(id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Reportes y Estadísticas</h1>
      </div>

      {/* Filtros */}
      <ReportesFiltros
        periodType={periodType}
        onPeriodChange={handlePeriodChange}
        fechaInicio={fechaInicio}
        onFechaInicio={handleFechaInicio}
        fechaFin={fechaFin}
        onFechaFin={handleFechaFin}
        sectorId={sectorId}
        onSectorChange={handleSectorChange}
        sectores={sectores}
      />

      {/* KPIs */}
      <ReportesKPIs
        ausenciasTotal={ausenciasTotal}
        vacacionesTotal={vacacionesTotal}
        swapsData={swapsStats}
        coberturaPromedio={coberturaPromedio}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'ausencias' as const, label: 'Ausencias', icon: '📊' },
          { id: 'franjas' as const, label: 'Franjas', icon: '🎯' },
          { id: 'swaps' as const, label: 'Swaps', icon: '↔️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 border-b-2 font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-xl p-6">
        {activeTab === 'ausencias' && (
          <ReportesAusencias {...ausenciasData} />
        )}

        {activeTab === 'franjas' && (
          <ReportesFranjas {...franjasData} />
        )}

        {activeTab === 'swaps' && (
          <ReportesSwaps {...swapsData} />
        )}
      </div>

      {/* Export Bar */}
      <div className="bg-slate-50 rounded-lg p-4 flex justify-end">
        <ReportesExportBar
          seccion={activeTab}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          sectorId={sectorId}
        />
      </div>
    </div>
  )
}
