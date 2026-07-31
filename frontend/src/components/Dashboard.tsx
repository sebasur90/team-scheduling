import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUserNotifications } from '../hooks/useUserNotifications'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { Barometro } from './Barometro'
import { CalendarView } from './CalendarView'
import { Preferences } from './Preferences'
import { NotificationCenter } from './NotificationCenter'
import { Vacaciones } from './Vacaciones'
import { AdminDashboard } from './AdminDashboard'
import { ViewerPanel } from './ViewerPanel'
import './Dashboard.css'

type TabType = 'calendar' | 'preferences' | 'vacaciones' | 'notifications'

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { notificaciones } = useUserNotifications()
  const [activeTab, setActiveTab] = useState<TabType>('calendar')

  const unreadCount = notificaciones.filter(n => !n.leida).length

  if (!user) {
    return <div>Cargando...</div>
  }

  if (user.rol === 'viewer') {
    return (
      <div className="dashboard">
        <TopBar user={user} isAdmin={false} sectionTitle="Visor" onLogout={logout} />
        <ViewerPanel />
      </div>
    )
  }

  if (user.rol === 'admin') {
    return (
      <div className="dashboard">
        <TopBar user={user} isAdmin={true} sectionTitle="Admin" onLogout={logout} />
        <AdminDashboard />
      </div>
    )
  }

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'calendar':
        return 'Calendario'
      case 'preferences':
        return 'Preferencias'
      case 'vacaciones':
        return 'Vacaciones'
      case 'notifications':
        return 'Notificaciones'
    }
  }

  return (
    <div className="dashboard flex flex-col md:grid md:grid-cols-1 h-screen">
      <TopBar
        user={user}
        isAdmin={false}
        sectionTitle={getSectionTitle()}
        onLogout={logout}
        unreadCount={unreadCount}
      />

      {/* Desktop tabs */}
      <div className="hidden md:block md:pt-16">
        <Header user={user} isAdmin={false} onLogout={logout} />
      </div>

      {/* Main content - with top padding for mobile TopBar, bottom padding for BottomNav */}
      <main className="dashboard-main flex-1 overflow-y-auto md:pt-16 pt-14 pb-20 md:pb-0 bg-sky-50">
        <div className="max-w-7xl mx-auto">
          <Barometro />

          {/* Desktop tabs - hidden on mobile */}
          <div className="hidden md:flex tabs">
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
              {unreadCount > 0 && (
                <span className="badge badge-unread">{unreadCount}</span>
              )}
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'preferences' && <Preferences />}
            {activeTab === 'vacaciones' && <Vacaciones mode="personal" />}
            {activeTab === 'notifications' && <NotificationCenter />}
          </div>
        </div>
      </main>

      {/* Mobile BottomNav */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
