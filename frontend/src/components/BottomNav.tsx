import React from 'react'

type TabId = 'calendar' | 'preferences' | 'vacaciones' | 'notifications'

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  unreadCount: number
}

const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const StarIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const SunIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const BellIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, unreadCount }) => {
  const tabs: { id: TabId; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { id: 'calendar', label: 'Calendario', Icon: CalendarIcon },
    { id: 'preferences', label: 'Preferencias', Icon: StarIcon },
    { id: 'vacaciones', label: 'Vacaciones', Icon: SunIcon },
    { id: 'notifications', label: 'Alertas', Icon: BellIcon },
  ]

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
      style={{
        height: 82,
        background: 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="relative flex flex-col items-center gap-1 flex-1 py-1"
          >
            <div
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
              style={isActive ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
            >
              <Icon active={isActive} />
            </div>
            <span
              className="text-[10px] font-semibold transition-colors"
              style={{ color: isActive ? '#4f46e5' : '#9ca3af' }}
            >
              {label}
            </span>
            {id === 'notifications' && unreadCount > 0 && (
              <span
                className="absolute top-0 right-4 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: '#ef4444' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
