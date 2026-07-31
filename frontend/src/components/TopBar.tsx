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
  unreadCount = 0,
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="h-14 px-4 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">{sectionTitle}</h1>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-sky-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🏢 Organización</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user.nombre}</span>
              {user.sector_nombre && (
                <span className="text-xs bg-sky-600 px-2 py-1 rounded">
                  {user.sector_nombre}
                </span>
              )}
              {isAdmin && (
                <span className="text-xs bg-amber-500 px-2 py-1 rounded">
                  ADMIN
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium transition"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
