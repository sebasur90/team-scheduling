import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    try {
      setError(null)
      setIsLoading(true)
      await login(email)
    } catch {
      setError('Email no registrado. Verificá tu dirección.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f5fa' }}>
      {/* Gradient header */}
      <div
        className="relative flex flex-col items-center justify-end pb-8 overflow-hidden"
        style={{
          height: 240,
          background: 'linear-gradient(145deg, #4f46e5, #7c3aed)',
          borderRadius: '0 0 40px 40px',
        }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 300, height: 300, top: -80, right: -60,
            background: 'radial-gradient(circle, rgba(255,255,255,.1) 0%, transparent 70%)',
          }}
        />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)' }}
        >
          <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
            <rect x="6" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.9)" />
            <rect x="24" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
            <rect x="6" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
            <rect x="24" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.75)" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Bienvenido</h1>
        <p className="mt-1 text-xs text-white/60" style={{ letterSpacing: '0.04em' }}>
          Ingresá con tu cuenta
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-7 pt-8 flex flex-col gap-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              disabled={isLoading}
              required
              className="w-full h-12 bg-white border border-gray-200 rounded-2xl px-4 text-gray-900 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
            />
          </div>

          <button
            type="submit"
            disabled={!email.trim() || isLoading}
            className="h-14 rounded-2xl text-white text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              boxShadow: '0 8px 24px rgba(109,40,217,.35)',
            }}
          >
            {isLoading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-2">
          Accedé con el email registrado en el sistema
        </p>
      </div>
    </div>
  )
}
