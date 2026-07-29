import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Header } from './Header'
import { Barometro } from './Barometro'
import { CalendarView } from './CalendarView'
import { Preferences } from './Preferences'
import { NotificationCenter } from './NotificationCenter'
import { Vacaciones } from './Vacaciones'
import { AdminPanel } from './AdminPanel'
import './Dashboard.css'

type TabType = 'calendar' | 'preferences' | 'vacaciones' | 'notifications'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('calendar')

  if (!user) {
    return <div>Cargando...</div>
  }

  const isAdmin = user.rol === 'admin'

  return (
    <div className="dashboard">
      <Header user={user} isAdmin={isAdmin} onLogout={logout} />
      <main className="dashboard-main">
        <Barometro />
        {isAdmin && <AdminPanel />}

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Calendario
          </button>
          <button
            className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            ✨ Preferencias
          </button>
          <button
            className={`tab-button ${activeTab === 'vacaciones' ? 'active' : ''}`}
            onClick={() => setActiveTab('vacaciones')}
          >
            🏖️ Vacaciones
          </button>
          <button
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notificaciones
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'preferences' && <Preferences />}
          {activeTab === 'vacaciones' && <Vacaciones mode="personal" />}
          {activeTab === 'notifications' && <NotificationCenter />}
        </div>
      </main>
    </div>
  )
}
