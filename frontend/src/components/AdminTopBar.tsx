import React from 'react'
import { Colaborador } from '../api/auth'

interface AdminTopBarProps {
  user: Colaborador
  onLogout: () => void
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({ user, onLogout }) => {
  const initials = user.nombre
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Mobile AdminTopBar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white border-b border-slate-800">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">Admin</h1>
            <span className="text-xs bg-amber-500 text-black px-2 py-1 rounded font-bold">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 text-black rounded-full flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop AdminTopBar */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🏢 Organización</h1>
            <span className="text-xs bg-amber-500 text-black px-3 py-1 rounded font-bold">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user.nombre}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
