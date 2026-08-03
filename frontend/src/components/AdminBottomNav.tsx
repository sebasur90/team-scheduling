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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t" style={{ backgroundColor: 'rgba(255,255,255,.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(0,0,0,.05)', paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center justify-center gap-1.5 transition ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              style={isActive ? { background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%)' } : {}}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-semibold truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
