import React, { useState } from 'react'
import { AdminPanel } from './AdminPanel'
import { CalendarView } from './CalendarView'
import { NotificacionesConfig } from './NotificacionesConfig'
import { SectoresPanel } from './SectoresPanel'
import { TareasEspecialesPanel } from './TareasEspecialesPanel'
import { Preferences } from './Preferences'
import { Vacaciones } from './Vacaciones'
import './AdminDashboard.css'

type TabType = 'inicio' | 'colaboradores' | 'tareas' | 'sectores' | 'calendario' | 'preferencias' | 'vacaciones' | 'notificaciones' | 'configuracion'

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inicio')

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="dashboard-inicio">
            <h2>Inicio</h2>
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Incidencias activas</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Colaboradores activos</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Franjas hoy</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">✓</div>
                <div className="stat-label">Estado cobertura</div>
              </div>
            </div>
            <p className="info-text">Bienvenido al panel de administración. Usa el menú lateral para navegar.</p>
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
      case 'vacaciones':
        return (
          <div className="dashboard-section">
            <Vacaciones mode="admin" />
          </div>
        )
      case 'notificaciones':
        return (
          <div className="dashboard-section">
            <NotificacionesConfig />
          </div>
        )
      case 'configuracion':
        return (
          <div className="dashboard-section">
            <AdminPanel />
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
              Preferencias
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
