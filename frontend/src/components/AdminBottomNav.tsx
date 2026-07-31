import React from 'react'

export type AdminTabType = 'resumen' | 'colaboradores' | 'turnos' | 'vacaciones' | 'preferencias' | 'notificaciones' | 'reportes'

interface AdminBottomNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'resumen' as const, icon: '📊', label: 'Resumen' },
    { id: 'colaboradores' as const, icon: '👥', label: 'Colabs' },
    { id: 'turnos' as const, icon: '📅', label: 'Turnos' },
    { id: 'vacaciones' as const, icon: '🏖️', label: 'Vacar' },
    { id: 'preferencias' as const, icon: '⭐', label: 'Pref' },
    { id: 'reportes' as const, icon: '📈', label: 'Report' },
    { id: 'notificaciones' as const, icon: '🔔', label: 'Notif' },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800">
      <div className="flex items-center justify-around overflow-x-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 py-3 px-3 flex flex-col items-center justify-center gap-1 border-t-2 ${
                isActive
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-gray-400'
              } transition`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs font-medium truncate max-w-12">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
