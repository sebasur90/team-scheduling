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

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuthContext()
  const [activeTab, setActiveTab] = useState<AdminTabType>('resumen')
  const { alerts } = useAdminAlerts(true)

  const totalAlerts = (alerts?.swaps_pendientes?.count || 0) + (alerts?.cobertura_en_riesgo?.count || 0)

  const getStatBgColor = (count: number): string => {
    return count > 0 ? 'bg-red-500' : 'bg-emerald-500'
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
          <div className="bg-white rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Panel de Resumen</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className={`${getStatBgColor(alerts?.swaps_pendientes.count || 0)} rounded-lg p-4 text-white text-center`}>
                <div className="text-3xl font-bold">{alerts?.swaps_pendientes.count || 0}</div>
                <div className="text-sm opacity-90">Swaps pendientes</div>
              </div>
              <div className={`${getStatBgColor(alerts?.turnos_sin_confirmar.count || 0)} rounded-lg p-4 text-white text-center`}>
                <div className="text-3xl font-bold">{alerts?.turnos_sin_confirmar.count || 0}</div>
                <div className="text-sm opacity-90">Sin confirmar</div>
              </div>
              <div className={`${getStatBgColor(alerts?.cobertura_en_riesgo.count || 0)} rounded-lg p-4 text-white text-center`}>
                <div className="text-3xl font-bold">{alerts?.cobertura_en_riesgo.count || 0}</div>
                <div className="text-sm opacity-90">Cobertura en riesgo</div>
              </div>
              <div className="bg-emerald-500 rounded-lg p-4 text-white text-center">
                <div className="text-3xl font-bold">{alerts?.colaboradores_activos || 0}</div>
                <div className="text-sm opacity-90">Colaboradores activos</div>
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
                      className="mt-3 w-full bg-sky-700 hover:bg-sky-800 text-white py-2 rounded-md text-sm font-medium transition"
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
                      className="mt-3 w-full bg-sky-700 hover:bg-sky-800 text-white py-2 rounded-md text-sm font-medium transition"
                    >
                      Ver →
                    </button>
                  </div>
                )}

                {(alerts?.turnos_sin_confirmar?.count || 0) > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-amber-500 rounded-lg p-4">
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
                      className="mt-3 w-full bg-sky-700 hover:bg-sky-800 text-white py-2 rounded-md text-sm font-medium transition"
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
          <div className="bg-white rounded-xl p-6 md:p-8">
            <AdminPanel />
          </div>
        )

      case 'turnos':
        return (
          <div className="bg-white rounded-xl p-6 md:p-8">
            <CalendarView />
          </div>
        )

      case 'vacaciones':
        return (
          <div className="bg-white rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Vacaciones de Colaboradores</h2>
            <Vacaciones mode="admin" />
          </div>
        )

      case 'preferencias':
        return (
          <div className="bg-white rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferencias de Franja</h2>
            <PreferenciasUsuarios />
          </div>
        )

      case 'reportes':
        return (
          <div className="bg-white rounded-xl p-6 md:p-8">
            <ReportesPanel />
          </div>
        )

      case 'notificaciones':
        return (
          <div className="bg-white rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Notificaciones y Swaps Pendientes</h2>
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

      default:
        return null
    }
  }

  if (!user) {
    return <div className="p-4 text-center">Cargando...</div>
  }

  return (
    <div className="admin-dashboard flex flex-col h-screen bg-gray-50">
      <AdminTopBar user={user} onLogout={logout} />

      <div className="hidden md:block flex-shrink-0 pt-20 pb-4 px-6">
        <h1 className="text-3xl font-bold text-slate-900">Panel de Administración</h1>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-24 md:pb-6 px-4 md:px-8">
        {renderContent()}
      </main>

      <AdminBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
