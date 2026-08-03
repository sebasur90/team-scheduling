import React from 'react'

export type AdminTabType = 'resumen' | 'colaboradores' | 'turnos' | 'vacaciones' | 'preferencias' | 'notificaciones' | 'reportes'

interface AdminBottomNavProps {
  activeTab: AdminTabType
  onTabChange: (tab: AdminTabType) => void
}

const ResumenIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const ColaboradoresIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const TurnosIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const VacacionesIcon = ({ active }: { active: boolean }) => (
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

const PreferenciasIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const ReportesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const NotificacionesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: AdminTabType; label: string; Icon: React.FC<{ active: boolean }> }[] = [
    { id: 'resumen', label: 'Resumen', Icon: ResumenIcon },
    { id: 'colaboradores', label: 'Colabs', Icon: ColaboradoresIcon },
    { id: 'turnos', label: 'Turnos', Icon: TurnosIcon },
    { id: 'vacaciones', label: 'Vacar', Icon: VacacionesIcon },
    { id: 'preferencias', label: 'Pref', Icon: PreferenciasIcon },
    { id: 'reportes', label: 'Report', Icon: ReportesIcon },
    { id: 'notificaciones', label: 'Notif', Icon: NotificacionesIcon },
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
              className="relative flex flex-col items-center gap-1 flex-1 py-2"
            >
              <div
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                style={isActive ? { background: 'linear-gradient(145deg, #4f46e5, #7c3aed)' } : {}}
              >
                <tab.Icon active={isActive} />
              </div>
              <span
                className="text-[10px] font-semibold transition-colors truncate max-w-12"
                style={{ color: isActive ? '#7c3aed' : '#9ca3af' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
