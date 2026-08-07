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
import { MisTareasSection } from './MisTareasSection'
import './Dashboard.css'

type TabType = 'calendar' | 'preferences' | 'vacaciones' | 'notifications'

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { notificaciones } = useUserNotifications()
  const [activeTab, setActiveTab] = useState<TabType>('calendar')

  const unreadCount = notificaciones.filter(n => n.estado === 'pendiente').length

  if (!user) return <div>Cargando...</div>

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
      case 'calendar': return 'Calendario'
      case 'preferences': return 'Preferencias'
      case 'vacaciones': return 'Vacaciones'
      case 'notifications': return 'Notificaciones'
    }
  }

  const firstName = user.nombre.split(' ')[0]
  const todayRaw = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayStr = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f5f5fa' }}>

      {/* ── Mobile header ── */}
      <div
        className="md:hidden bg-white flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,0,0,.05)', paddingTop: 'max(env(safe-area-inset-top), 44px)' }}
      >
        {activeTab === 'calendar' ? (
          <div className="px-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{todayStr}</p>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
                  Hola, {firstName}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="relative mt-1 w-10 h-10 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition"
                  style={{ border: '1.5px solid rgba(0,0,0,.06)' }}
                  title="Salir"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className="relative mt-1 w-10 h-10 rounded-2xl flex items-center justify-center text-gray-500"
                  style={{ background: '#f5f5fa', border: '1.5px solid rgba(0,0,0,.06)' }}
                >
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{getSectionTitle()}</h1>
            <button
              onClick={logout}
              className="text-xs font-semibold text-gray-400 py-1.5 px-3 rounded-xl"
              style={{ background: '#f5f5fa', border: '1.5px solid rgba(0,0,0,.06)' }}
            >
              Salir
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:block md:pt-16">
        <TopBar user={user} isAdmin={false} sectionTitle={getSectionTitle()} onLogout={logout} unreadCount={unreadCount} />
        <Header user={user} isAdmin={false} onLogout={logout} />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {/* Mobile */}
        <div className="md:hidden">
          {activeTab === 'calendar' && (
            <div className="px-4 pt-4 flex flex-col gap-4 pb-4">
              <Barometro />
              <CalendarView />
              <MisTareasSection />
            </div>
          )}
          {activeTab === 'preferences' && <div className="px-4 pt-4 pb-4"><Preferences /></div>}
          {activeTab === 'vacaciones' && <div className="px-4 pt-4 pb-4"><Vacaciones mode="personal" /></div>}
          {activeTab === 'notifications' && <div className="px-4 pt-4 pb-4"><NotificationCenter /></div>}
        </div>

        {/* Desktop */}
        <div className="hidden md:block max-w-7xl mx-auto px-6 py-6">
          <Barometro />
          <div className="flex tabs mt-4">
            {(['calendar', 'preferences', 'vacaciones', 'notifications'] as TabType[]).map(tab => (
              <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'calendar' && '📅 Calendario'}
                {tab === 'preferences' && '✨ Preferencias'}
                {tab === 'vacaciones' && '🏖️ Vacaciones'}
                {tab === 'notifications' && (
                  <>{'🔔'} Notificaciones{unreadCount > 0 && <span className="badge badge-unread">{unreadCount}</span>}</>
                )}
              </button>
            ))}
          </div>
          <div className="tab-content">
            {activeTab === 'calendar' && (
              <div>
                <CalendarView />
                <MisTareasSection />
              </div>
            )}
            {activeTab === 'preferences' && <Preferences />}
            {activeTab === 'vacaciones' && <Vacaciones mode="personal" />}
            {activeTab === 'notifications' && <NotificationCenter />}
          </div>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
    </div>
  )
}
