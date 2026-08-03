import React, { useState, useEffect } from 'react'
import { ausenciasApi, Ausencia } from '../api/ausencias'
import { useAuthContext } from '../contexts/AuthContext'
import { colaboradoresApi } from '../api/colaboradores'
import './Vacaciones.css'

interface VacacionesProps {
  mode: 'personal' | 'admin'
}

interface VacacionesBlock {
  colaborador_id: number
  colaborador_nombre?: string
  fecha_inicio: string
  fecha_fin: string
  dias: string[]
}

export const Vacaciones: React.FC<VacacionesProps> = ({ mode }) => {
  const { user } = useAuthContext()
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [colaboradorId, setColaboradorId] = useState(user?.id || 0)
  const [bloques, setBloques] = useState<VacacionesBlock[]>([])
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load vacation data
  const cargarVacaciones = async () => {
    setLoading(true)
    try {
      const res = await ausenciasApi.list(mode === 'admin' ? undefined : user?.id)
      const ausencias = res.data

      // Group by colaborador and consecutive dates
      const bloquesPorColab = agruparVacaciones(ausencias)
      setBloques(bloquesPorColab)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar vacaciones' })
    }
    setLoading(false)
  }

  // Load colaboradores for admin dropdown
  useEffect(() => {
    if (mode === 'admin') {
      colaboradoresApi.list()
        .then(res => setColaboradores(res.data))
        .catch(() => setMessage({ type: 'error', text: 'Error al cargar colaboradores' }))
    }
  }, [mode])

  // Load vacations on mount and when colaborador changes
  useEffect(() => {
    cargarVacaciones()
  }, [colaboradorId, user?.id])

  const agruparVacaciones = (ausencias: Ausencia[]): VacacionesBlock[] => {
    const porColab = new Map<number, Ausencia[]>()
    ausencias.forEach(a => {
      if (!porColab.has(a.colaborador_id)) {
        porColab.set(a.colaborador_id, [])
      }
      porColab.get(a.colaborador_id)!.push(a)
    })

    const bloques: VacacionesBlock[] = []
    porColab.forEach((ausencias, colab_id) => {
      const sorted = ausencias.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      let i = 0
      while (i < sorted.length) {
        const inicio = new Date(sorted[i].fecha)
        let fin = inicio
        let j = i + 1
        // Group consecutive weekdays
        while (j < sorted.length) {
          const current = new Date(sorted[j].fecha)
          const prev = new Date(sorted[j - 1].fecha)
          const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
          // If gap is more than 2 days (accounting for weekends), break
          if (diffDays > 2) break
          fin = current
          j++
        }
        const dias = sorted.slice(i, j).map(a => a.fecha)
        bloques.push({
          colaborador_id: colab_id,
          fecha_inicio: inicio.toISOString().split('T')[0],
          fecha_fin: fin.toISOString().split('T')[0],
          dias,
        })
        i = j
      }
    })

    return bloques
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fechaInicio || !fechaFin) {
      setMessage({ type: 'error', text: 'Completa las fechas' })
      return
    }

    setLoading(true)
    try {
      await ausenciasApi.create({
        colaborador_id: colaboradorId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      setMessage({ type: 'success', text: 'Vacación cargada correctamente' })
      setFechaInicio('')
      setFechaFin('')
      cargarVacaciones()
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Error al crear vacación'
      setMessage({ type: 'error', text: detail })
    }
    setLoading(false)
  }

  const handleDelete = async (bloque: VacacionesBlock) => {
    if (!confirm('¿Eliminar este bloque de vacaciones?')) return

    setLoading(true)
    try {
      await ausenciasApi.deleteBloque({
        colaborador_id: bloque.colaborador_id,
        fecha_inicio: bloque.fecha_inicio,
        fecha_fin: bloque.fecha_fin,
      })
      setMessage({ type: 'success', text: 'Vacación eliminada' })
      cargarVacaciones()
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Error al eliminar vacación'
      setMessage({ type: 'error', text: detail })
    }
    setLoading(false)
  }

  const formatFecha = (fecha: string) => {
    const [year, month, day] = fecha.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const totalDias = bloques.reduce((acc, b) => acc + b.dias.length, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Balance card — solo para usuarios personales */}
      {mode === 'personal' && (
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(79,70,229,.25)' }}
        >
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 200, height: 200, top: -60, right: -40, background: 'radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Días en el sistema</p>
            <div className="text-5xl font-extrabold text-white tracking-tight mt-1">{totalDias}</div>
            <div className="flex gap-2 mt-3">
              <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,.12)' }}>
                <div className="text-lg font-bold text-white">{bloques.length}</div>
                <div className="text-xs text-white/60 mt-0.5">Bloques</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div
        className="bg-white rounded-2xl p-4"
        style={{ border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
      >
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {mode === 'admin' ? 'Cargar vacaciones' : 'Solicitar días'}
        </h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          {mode === 'admin' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Colaborador</label>
              <select
                value={colaboradorId}
                onChange={(e) => setColaboradorId(Number(e.target.value))}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-900 outline-none focus:border-indigo-400"
              >
                <option value="">Seleccioná un colaborador</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-900 outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm text-gray-900 outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {loading ? 'Cargando...' : 'Cargar vacaciones'}
          </button>
        </form>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between text-sm font-medium"
          style={
            message.type === 'success'
              ? { background: '#ecfdf5', color: '#065f46', border: '1.5px solid #a7f3d0' }
              : { background: '#fef2f2', color: '#991b1b', border: '1.5px solid #fecaca' }
          }
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-lg leading-none opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      {/* List */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {mode === 'admin' ? 'Vacaciones del equipo' : 'Tus bloques'}
        </h3>
        {bloques.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center text-sm text-gray-400"
            style={{ background: '#f9f9fb', border: '1.5px dashed #e5e7eb' }}
          >
            Sin vacaciones cargadas
          </div>
        ) : mode === 'admin' ? (
          <div className="flex flex-col gap-2">
            {bloques.map((bloque, idx) => {
              const colab = colaboradores.find(c => c.id === bloque.colaborador_id)
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3"
                  style={{ border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                  >
                    {(colab?.nombre || 'X').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">{colab?.nombre || `Col. ${bloque.colaborador_id}`}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatFecha(bloque.fecha_inicio)} – {formatFecha(bloque.fecha_fin)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(bloque)}
                    disabled={loading}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:text-red-600 transition"
                    style={{ background: '#fef2f2' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bloques.map((bloque, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 flex items-center gap-3"
                style={{ border: '1.5px solid rgba(0,0,0,.05)', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: '#ede9fe' }}
                >
                  🏖️
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">
                    {formatFecha(bloque.fecha_inicio)} – {formatFecha(bloque.fecha_fin)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{bloque.dias.length} días</div>
                </div>
                <button
                  onClick={() => handleDelete(bloque)}
                  disabled={loading}
                  className="text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-xl transition"
                  style={{ background: '#fef2f2' }}
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
