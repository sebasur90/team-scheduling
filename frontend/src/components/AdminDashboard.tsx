import React, { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { AdminPanel } from './AdminPanel'
import { CalendarView } from './CalendarView'
import { Vacaciones } from './Vacaciones'
import { PreferenciasUsuarios } from './PreferenciasUsuarios'
import { ReportesPanel } from './ReportesPanel'
import { useAdminAlerts } from '../hooks/useAdminAlerts'
import { AdminTopBar } from './AdminTopBar'
import { AdminBottomNav, type AdminTabType } from './AdminBottomNav'
import { AdminMasPanel, type AdminSubScreen } from './AdminMasPanel'
import { SectoresPanel } from './SectoresPanel'
import { FranjasPanel } from './FranjasPanel'
import { TareasEspecialesPanel } from './TareasEspecialesPanel'
import { CronogramaTareasScreen } from './CronogramaTareasScreen'
import { AsignacionTurnosPanel } from './AsignacionTurnosPanel'
import { DiasNoLaborablesPanel } from './DiasNoLaborablesPanel'
import { ConfiguracionPanel } from './ConfiguracionPanel'
import { IncidenciasPanel } from './IncidenciasPanel'

const ADMIN_SUB_SCREEN_LABELS: Record<AdminSubScreen, string> = {
  'sectores': 'Sectores',
  'franjas': 'Franjas',
  'tareas-especiales': 'Tareas Especiales',
  'cronograma-tareas': 'Cronograma de Tareas',
  'asignacion-turnos': 'Asignación de Turnos',
  'dias-no-laborables': 'Días No Laborables',
  'configuracion': 'Configuración',
  'incidencias': 'Incidencias',
}

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuthContext()
  const [activeTab, setActiveTab] = useState<AdminTabType>('resumen')
  const [adminSubScreen, setAdminSubScreen] = useState<AdminSubScreen | null>(null)
  const { alerts } = useAdminAlerts(true)

  const handleTabChange = (tab: AdminTabType) => {
    setAdminSubScreen(null)
    setActiveTab(tab)
  }

  const renderAdminSubScreen = (screen: AdminSubScreen) => {
    switch (screen) {
      case 'sectores':
        return <SectoresPanel />
      case 'franjas':
        return <FranjasPanel />
      case 'tareas-especiales':
        return <TareasEspecialesPanel />
      case 'cronograma-tareas':
        return <CronogramaTareasScreen />
      case 'asignacion-turnos':
        return <AsignacionTurnosPanel />
      case 'dias-no-laborables':
        return <DiasNoLaborablesPanel />
      case 'configuracion':
        return <ConfiguracionPanel />
      case 'incidencias':
        return <IncidenciasPanel />
      default:
        return null
    }
  }

  const totalAlerts = (alerts?.swaps_pendientes?.count || 0) + (alerts?.cobertura_en_riesgo?.count || 0)

  const getStatBgColor = (count: number): string => {
    return count > 0 ? 'bg-red-500' : 'bg-violet-600'
  }

  const getStatBorderColor = (type: string, count: number): string => {
    if (type === 'swaps' && count > 0) return 'border-l-4 border-amber-500'
    if (type === 'cobertura' && count > 0) return 'border-l-4 border-red-500'
    return 'border-l-4 border-emerald-500'
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <div className="bg-white rounded-3xl p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontWeight: 700 }}>Panel de Resumen</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className={`${getStatBgColor(alerts?.swaps_pendientes.count || 0)} p-5 text-white text-center`} style={{ borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
                <div className="text-4xl font-black">{alerts?.swaps_pendientes.count || 0}</div>
                <div className="text-sm font-medium opacity-95 mt-2">Swaps pendientes</div>
              </div>
              <div className={`${getStatBgColor(alerts?.turnos_sin_confirmar.count || 0)} p-5 text-white text-center`} style={{ borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
                <div className="text-4xl font-black">{alerts?.turnos_sin_confirmar.count || 0}</div>
                <div className="text-sm font-medium opacity-95 mt-2">Sin confirmar</div>
              </div>
              <div className={`${getStatBgColor(alerts?.cobertura_en_riesgo.count || 0)} p-5 text-white text-center`} style={{ borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
                <div className="text-4xl font-black">{alerts?.cobertura_en_riesgo.count || 0}</div>
                <div className="text-sm font-medium opacity-95 mt-2">Cobertura en riesgo</div>
              </div>
              <div className="bg-violet-600 p-5 text-white text-center" style={{ borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
                <div className="text-4xl font-black">{alerts?.colaboradores_activos || 0}</div>
                <div className="text-sm font-medium opacity-95 mt-2">Colaboradores activos</div>
              </div>
            </div>

            {totalAlerts > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Requieren atención</h3>

                {(alerts?.swaps_pendientes?.count || 0) > 0 && (
                  <div className={`bg-amber-50 rounded-lg p-4 ${getStatBorderColor('swaps', alerts?.swaps_pendientes?.count || 0)}`}>
                    <div className="font-semibold text-slate-900 mb-3">
                      ↔️ Swaps pendientes ({alerts?.swaps_pendientes?.count || 0})
                    </div>
                    <div className="space-y-2">
                      {alerts?.swaps_pendientes?.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center text-sm text-slate-700">
                          <span>{item.solicitante} ↔️ {item.receptor}</span>
                          <span className="text-xs text-slate-500">{item.hace}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTab('notificaciones')}
                      className="mt-3 w-full text-white py-2 text-sm font-medium transition"
                      style={{ backgroundColor: '#7c3aed', borderRadius: '8px' }}
                    >
                      Ver →
                    </button>
                  </div>
                )}

                {(alerts?.cobertura_en_riesgo?.count || 0) > 0 && (
                  <div className={`bg-red-50 rounded-lg p-4 ${getStatBorderColor('cobertura', alerts?.cobertura_en_riesgo?.count || 0)}`}>
                    <div className="font-semibold text-slate-900 mb-3">
                      🚨 Cobertura en riesgo ({alerts?.cobertura_en_riesgo?.count || 0})
                    </div>
                    <div className="space-y-2">
                      {alerts?.cobertura_en_riesgo?.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-slate-700">
                          <span>{item.fecha} - {item.franja}</span>
                          <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-medium">{item.estado}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTab('turnos')}
                      className="mt-3 w-full text-white py-2 text-sm font-medium transition"
                      style={{ backgroundColor: '#7c3aed', borderRadius: '8px' }}
                    >
                      Ver →
                    </button>
                  </div>
                )}

                {(alerts?.turnos_sin_confirmar?.count || 0) > 0 && (
                  <div className="border-l-4 border-amber-500 rounded-lg p-4" style={{ backgroundColor: '#fffbeb' }}>
                    <div className="font-semibold text-slate-900 mb-3">
                      ⏳ Sin confirmar ({alerts?.turnos_sin_confirmar?.count || 0})
                    </div>
                    <div className="space-y-2">
                      {alerts?.turnos_sin_confirmar?.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-slate-700">
                          <span>{item.colaborador} - {item.fecha}</span>
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">{item.franja}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTab('turnos')}
                      className="mt-3 w-full text-white py-2 text-sm font-medium transition"
                      style={{ backgroundColor: '#7c3aed', borderRadius: '8px' }}
                    >
                      Ver →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-3">✓</div>
                <div className="text-emerald-700 font-semibold">Todo en orden</div>
              </div>
            )}
          </div>
        )

      case 'colaboradores':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <AdminPanel />
          </div>
        )

      case 'turnos':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <CalendarView />
          </div>
        )

      case 'vacaciones':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Vacaciones de Colaboradores</h2>
            <Vacaciones mode="admin" />
          </div>
        )

      case 'preferencias':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Preferencias de Franja</h2>
            <PreferenciasUsuarios />
          </div>
        )

      case 'reportes':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <ReportesPanel />
          </div>
        )

      case 'notificaciones':
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Notificaciones y Swaps Pendientes</h2>
            {alerts && alerts.swaps_pendientes.count > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">↔️ Swaps Pendientes ({alerts.swaps_pendientes.count})</h3>
                <div className="space-y-3">
                  {alerts.swaps_pendientes.items.map((item: any) => (
                    <div key={item.id} className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded">
                      <div className="font-semibold text-slate-900 mb-2">
                        {item.solicitante} ↔️ {item.receptor}
                      </div>
                      <div className="text-sm text-slate-600">
                        📅 {item.fecha} • {item.franja_origen} ↔️ {item.franja_receptor}
                      </div>
                      <div className="text-xs text-slate-500 mt-2">Hace {item.hace}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center">
                <div className="text-2xl mb-2">✓</div>
                <div className="text-emerald-700 font-semibold">No hay swaps pendientes</div>
              </div>
            )}
          </div>
        )

      case 'admin-mas':
        if (!adminSubScreen) {
          return (
            <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
              <AdminMasPanel onSelect={setAdminSubScreen} />
            </div>
          )
        }
        return (
          <div className="bg-white p-6 md:p-8" style={{ borderRadius: '20px', border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <button
              onClick={() => setAdminSubScreen(null)}
              className="mb-4 flex items-center gap-1 text-sm font-semibold transition"
              style={{ color: '#7c3aed' }}
            >
              ‹ Volver
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontWeight: 700 }}>
              {ADMIN_SUB_SCREEN_LABELS[adminSubScreen]}
            </h2>
            {renderAdminSubScreen(adminSubScreen)}
          </div>
        )

      default:
        return null
    }
  }

  if (!user) {
    return <div className="p-4 text-center">Cargando...</div>
  }

  return (
    <div className="admin-dashboard flex flex-col h-screen bg-gray-100" style={{ background: '#f5f5fa !important' }}>
      <AdminTopBar user={user} onLogout={logout} />

      <div className="hidden md:block flex-shrink-0 pt-20 pb-4 px-6">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontWeight: 700 }}>Panel de Administración</h1>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-6 px-4 md:px-8" style={{ background: '#f5f5fa' }}>
        {renderContent()}
      </main>

      <AdminBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
