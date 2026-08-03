import React from 'react'
import { Colaborador } from '../api/auth'

interface TopBarProps {
  user: Colaborador
  isAdmin: boolean
  sectionTitle: string
  onLogout: () => void
  unreadCount?: number
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  isAdmin,
  sectionTitle,
  onLogout,
}) => {
  const initials = user.nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Mobile TopBar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div className="h-14 px-5 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900 tracking-tight">{sectionTitle}</h1>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div
        className="hidden md:block fixed top-0 left-0 right-0 z-40 text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 20px rgba(79,70,229,.3)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }}
            >
              <svg width="16" height="16" viewBox="0 0 44 44" fill="none">
                <rect x="6" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.9)" />
                <rect x="24" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
                <rect x="6" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
                <rect x="24" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.75)" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">Turnos</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user.nombre}</span>
              {user.sector_nombre && (
                <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,.15)' }}>
                  {user.sector_nombre}
                </span>
              )}
              {isAdmin && (
                <span className="text-xs bg-amber-400 text-amber-900 px-2 py-1 rounded-lg font-semibold">
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-1.5 rounded-xl text-sm font-medium transition"
              style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
