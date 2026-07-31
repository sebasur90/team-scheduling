import React, { useState } from 'react'
import { AdminPanel } from './AdminPanel'
import { CalendarView } from './CalendarView'
import { SectoresPanel } from './SectoresPanel'
import { TareasEspecialesPanel } from './TareasEspecialesPanel'
import { Preferences } from './Preferences'
import { PreferenciasUsuarios } from './PreferenciasUsuarios'
import { Vacaciones } from './Vacaciones'
import { ConfiguracionPanel } from './ConfiguracionPanel'
import { useAdminAlerts } from '../hooks/useAdminAlerts'
import './AdminDashboard.css'

type TabType = 'inicio' | 'colaboradores' | 'tareas' | 'sectores' | 'calendario' | 'preferencias' | 'preferencias-usuarios' | 'vacaciones' | 'notificaciones' | 'configuracion'

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inicio')
  const { alerts } = useAdminAlerts(true)

  const getStatColor = (count: number): string => {
    return count > 0 ? 'stat-alert' : 'stat-ok'
  }

  const totalAlerts = (alerts?.swaps_pendientes?.count || 0) + (alerts?.cobertura_en_riesgo?.count || 0)

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="dashboard-inicio">
            <h2>Inicio</h2>
            <div className="dashboard-stats">
              <div className={`stat-card ${getStatColor(alerts?.swaps_pendientes.count || 0)}`}>
                <div className="stat-number">{alerts?.swaps_pendientes.count || 0}</div>
                <div className="stat-label">Swaps pendientes</div>
              </div>
              <div className={`stat-card ${getStatColor(alerts?.turnos_sin_confirmar.count || 0)}`}>
                <div className="stat-number">{alerts?.turnos_sin_confirmar.count || 0}</div>
                <div className="stat-label">Sin confirmar</div>
              </div>
              <div className={`stat-card ${getStatColor(alerts?.cobertura_en_riesgo.count || 0)}`}>
                <div className="stat-number">{alerts?.cobertura_en_riesgo.count || 0}</div>
                <div className="stat-label">Cobertura en riesgo</div>
              </div>
              <div className="stat-card stat-ok">
                <div className="stat-number">{alerts?.colaboradores_activos || 0}</div>
                <div className="stat-label">Colaboradores activos</div>
              </div>
            </div>

            {totalAlerts > 0 ? (
              <div className="alerts-feed">
                <h3>⚠️ Requieren atención</h3>
                {alerts?.swaps_pendientes.count! > 0 && (
                  <div className="alert-section alert-critical">
                    <div className="alert-header">
                      <span className="alert-icon">↔️</span>
                      <span className="alert-title">Swaps pendientes ({alerts.swaps_pendientes.count})</span>
                    </div>
                    {alerts.swaps_pendientes.items.map((item: any) => (
                      <div key={item.id} className="alert-item">
                        <span className="alert-desc">{item.solicitante} ↔️ {item.receptor}</span>
                        <span className="alert-time">{item.hace}</span>
                      </div>
                    ))}
                    <button className="btn-view" onClick={() => setActiveTab('notificaciones')}>Ver →</button>
                  </div>
                )}

                {alerts?.cobertura_en_riesgo.count! > 0 && (
                  <div className="alert-section alert-critical">
                    <div className="alert-header">
                      <span className="alert-icon">⚠️</span>
                      <span className="alert-title">Cobertura en riesgo ({alerts.cobertura_en_riesgo.count})</span>
                    </div>
                    {alerts.cobertura_en_riesgo.items.map((item: any, idx: number) => (
                      <div key={idx} className="alert-item">
                        <span className="alert-desc">{item.fecha} - {item.franja}</span>
                        <span className={`alert-status ${item.estado}`}>{item.estado}</span>
                      </div>
                    ))}
                    <button className="btn-view" onClick={() => setActiveTab('calendario')}>Ver →</button>
                  </div>
                )}

                {alerts?.turnos_sin_confirmar.count! > 0 && (
                  <div className="alert-section alert-warning">
                    <div className="alert-header">
                      <span className="alert-icon">⏳</span>
                      <span className="alert-title">Sin confirmar ({alerts.turnos_sin_confirmar.count})</span>
                    </div>
                    {alerts.turnos_sin_confirmar.items.map((item: any, idx: number) => (
                      <div key={idx} className="alert-item">
                        <span className="alert-desc">{item.colaborador} - {item.fecha}</span>
                        <span className="alert-franja">{item.franja}</span>
                      </div>
                    ))}
                    <button className="btn-view" onClick={() => setActiveTab('calendario')}>Ver →</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="alerts-ok">
                <div className="ok-icon">✓</div>
                <div className="ok-text">Todo en orden</div>
              </div>
            )}
          </div>
        )
      case 'colaboradores':
        return (
          <div className="dashboard-section">
            <AdminPanel />
          </div>
        )
      case 'tareas':
        return (
          <div className="dashboard-section">
            <TareasEspecialesPanel />
          </div>
        )
      case 'sectores':
        return (
          <div className="dashboard-section">
            <SectoresPanel />
          </div>
        )
      case 'calendario':
        return (
          <div className="dashboard-section">
            <CalendarView />
          </div>
        )
      case 'preferencias':
        return (
          <div className="dashboard-section">
            <Preferences />
          </div>
        )
      case 'preferencias-usuarios':
        return (
          <div className="dashboard-section">
            <PreferenciasUsuarios />
          </div>
        )
      case 'vacaciones':
        return (
          <div className="dashboard-section">
            <Vacaciones mode="admin" />
          </div>
        )
      case 'notificaciones':
        return (
          <div className="dashboard-section">
            <h2>Notificaciones y Swaps Pendientes</h2>
            {alerts && alerts.swaps_pendientes.count > 0 ? (
              <div>
                <h3>↔️ Swaps Pendientes ({alerts.swaps_pendientes.count})</h3>
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                  {alerts.swaps_pendientes.items.map((item: any) => (
                    <div key={item.id} style={{
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      backgroundColor: '#fef3c7',
                      borderLeft: '4px solid #f59e0b',
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                        {item.solicitante} ↔️ {item.receptor}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        📅 {item.fecha} • {item.franja_origen} ↔️ {item.franja_receptor}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                        Hace {item.hace}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                color: '#16a34a',
              }}>
                ✓ No hay swaps pendientes
              </div>
            )}
          </div>
        )
      case 'configuracion':
        return (
          <div className="dashboard-section">
            <ConfiguracionPanel />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Panel de Administración</h1>
      </div>

      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <nav className="dashboard-nav">
            <button
              className={`nav-item ${activeTab === 'inicio' ? 'active' : ''}`}
              onClick={() => setActiveTab('inicio')}
            >
              <span className="nav-icon">🏠</span>
              Inicio
            </button>
            <button
              className={`nav-item ${activeTab === 'colaboradores' ? 'active' : ''}`}
              onClick={() => setActiveTab('colaboradores')}
            >
              <span className="nav-icon">👥</span>
              Colaboradores
            </button>
            <button
              className={`nav-item ${activeTab === 'tareas' ? 'active' : ''}`}
              onClick={() => setActiveTab('tareas')}
            >
              <span className="nav-icon">✓</span>
              Tareas Especiales
            </button>
            <button
              className={`nav-item ${activeTab === 'sectores' ? 'active' : ''}`}
              onClick={() => setActiveTab('sectores')}
            >
              <span className="nav-icon">📋</span>
              Sectores
            </button>
            <button
              className={`nav-item ${activeTab === 'calendario' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendario')}
            >
              <span className="nav-icon">📅</span>
              Calendario
            </button>
            <button
              className={`nav-item ${activeTab === 'preferencias' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferencias')}
            >
              <span className="nav-icon">❤️</span>
              Mi Preferencia
            </button>
            <button
              className={`nav-item ${activeTab === 'preferencias-usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferencias-usuarios')}
            >
              <span className="nav-icon">📋</span>
              Preferencias de Usuarios
            </button>
            <button
              className={`nav-item ${activeTab === 'vacaciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('vacaciones')}
            >
              <span className="nav-icon">🏖️</span>
              Vacaciones
            </button>
            <button
              className={`nav-item ${activeTab === 'notificaciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('notificaciones')}
            >
              <span className="nav-icon">🔔</span>
              Notificaciones
              {totalAlerts > 0 && (
                <span className="badge badge-alert">{totalAlerts}</span>
              )}
            </button>
            <button
              className={`nav-item ${activeTab === 'configuracion' ? 'active' : ''}`}
              onClick={() => setActiveTab('configuracion')}
            >
              <span className="nav-icon">⚙️</span>
              Configuración
            </button>
          </nav>
        </aside>

        <main className="dashboard-content">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
