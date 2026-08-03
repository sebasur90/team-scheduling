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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 text-white border-b" style={{ background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%)', borderColor: 'rgba(0,0,0,.05)', paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight">Admin</h1>
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,.25)' }}>
              ADMIN
            </span>
          </div>
          <div className="w-10 h-10 text-white rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.3)' }}>
            {initials}
          </div>
        </div>
      </div>

      {/* Desktop AdminTopBar */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-40 text-white shadow-lg" style={{ background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tight">🏢 Administración</h1>
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,.25)' }}>
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{user.nombre}</span>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:bg-white/20"
              style={{ background: 'rgba(255,255,255,.15)' }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
