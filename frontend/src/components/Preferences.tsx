import React, { useState, useEffect } from 'react'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import { colaboradoresApi } from '../api/colaboradores'
import { useAuthContext } from '../contexts/AuthContext'

export const Preferences: React.FC = () => {
  const { user } = useAuthContext()
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [selectedFranja, setSelectedFranja] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const franjasRes = await franjasApi.list()
        setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))
        if (user?.franja_preferida_id) setSelectedFranja(user.franja_preferida_id)
      } catch {
        // silently fail — no franjas loaded
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleSubmit = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      await colaboradoresApi.updatePreference(selectedFranja)
      setMessage({ type: 'success', text: 'Preferencia guardada correctamente' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error al guardar' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const allOptions = [
    { id: null as number | null, label: 'Sin preferencia', sub: 'El sistema te asignará automáticamente' },
    ...franjas.map(f => ({
      id: f.id as number | null,
      label: `${f.hora_inicio.slice(0, 5)} – ${f.hora_fin.slice(0, 5)}`,
      sub: 'Franja horaria disponible',
    })),
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight">Franja preferida</h2>
        <p className="text-xs text-gray-400 mt-0.5">El sistema la priorizará al asignarte turnos</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
          style={
            message.type === 'success'
              ? { background: '#ecfdf5', color: '#065f46', border: '1.5px solid #a7f3d0' }
              : { background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fecaca' }
          }
        >
          <span>{message.type === 'success' ? '✓' : '✕'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Options */}
      {franjas.length === 0 ? (
        <div
          className="rounded-2xl p-4 text-sm text-amber-700"
          style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
        >
          El administrador aún no cargó los horarios disponibles.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allOptions.map(opt => {
            const isSelected = selectedFranja === opt.id
            return (
              <button
                key={String(opt.id)}
                onClick={() => setSelectedFranja(opt.id)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                style={{
                  background: isSelected ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#fff',
                  border: isSelected ? 'none' : '1.5px solid rgba(0,0,0,.05)',
                  boxShadow: isSelected ? '0 8px 20px rgba(79,70,229,.3)' : '0 2px 8px rgba(0,0,0,.04)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    border: isSelected ? '2px solid rgba(255,255,255,.6)' : '2px solid #d1d5db',
                    background: isSelected ? 'rgba(255,255,255,.3)' : 'transparent',
                  }}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <div
                    className="text-sm font-bold tracking-tight"
                    style={{ color: isSelected ? '#fff' : '#111827' }}
                  >
                    {opt.label}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: isSelected ? 'rgba(255,255,255,.65)' : '#9ca3af' }}
                  >
                    {opt.sub}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSubmit}
        disabled={isSaving || !franjas.length}
        className="h-14 rounded-2xl text-white text-base font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(109,40,217,.3)' }}
      >
        {isSaving ? 'Guardando...' : 'Guardar preferencia'}
      </button>

      {/* Info footer */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#f5f5fa', border: '1.5px solid rgba(0,0,0,.05)' }}
      >
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Info</p>
        <ul className="flex flex-col gap-1.5">
          {[
            'Podés cambiar tu preferencia en cualquier momento.',
            'Sin preferencia: se te asigna automáticamente.',
            'Cuando tu franja se libere, recibirás una notificación.',
          ].map((tip, i) => (
            <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
              <span className="mt-0.5 text-indigo-400">·</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
