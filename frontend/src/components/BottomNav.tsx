import React from 'react'

interface BottomNavProps {
  activeTab: 'calendar' | 'preferences' | 'vacaciones' | 'notifications'
  onTabChange: (tab: 'calendar' | 'preferences' | 'vacaciones' | 'notifications') => void
  unreadCount: number
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
}) => {
  const tabs = [
    { id: 'calendar' as const, icon: '📅', label: 'Calendario' },
    { id: 'preferences' as const, icon: '✨', label: 'Preferencias' },
    { id: 'vacaciones' as const, icon: '🏖️', label: 'Vacaciones' },
    { id: 'notifications' as const, icon: '🔔', label: 'Notificaciones' },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 px-4 flex flex-col items-center justify-center gap-1 relative border-t-2 ${
                isActive
                  ? 'border-sky-700 text-sky-700'
                  : 'border-transparent text-gray-500'
              } transition`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium truncate max-w-12">{tab.label}</span>
              {tab.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
