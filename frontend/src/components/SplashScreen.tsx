import React, { useEffect } from 'react'

interface Props { onDone: () => void }

export const SplashScreen: React.FC<Props> = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)' }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400, height: 400,
          top: -100, right: -100,
          background: 'radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 320, height: 320,
          bottom: -80, left: -60,
          background: 'radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(255,255,255,.15)',
            border: '1px solid rgba(255,255,255,.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect x="6" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.9)" />
            <rect x="24" y="8" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
            <rect x="6" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.5)" />
            <rect x="24" y="26" width="14" height="14" rx="4" fill="rgba(255,255,255,.75)" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Turnos</h1>
        <p className="mt-2 text-sm text-white/60" style={{ letterSpacing: '0.05em' }}>
          Gestión de equipos
        </p>
      </div>

      <div className="absolute bottom-20 flex items-center gap-1.5">
        <span className="h-1.5 rounded-full bg-white" style={{ width: 20 }} />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
      </div>
    </div>
  )
}
