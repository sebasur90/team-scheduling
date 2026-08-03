import React, { useState, useEffect, useCallback } from 'react'
import { turnosApi, TurnoAlmuerzoResponse, AsignacionResponse } from '../api/turnos'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import { diasNolaborablesApi } from '../api/diasNolaborables'
import { ausenciasApi, Ausencia } from '../api/ausencias'
import { sectoresApi, type Sector } from '../api/sectores'
import { useAuthContext } from '../contexts/AuthContext'
import { swapsApi, SwapResponse } from '../api/swaps'
import { useUserNotifications } from '../hooks/useUserNotifications'
import { SwapConfirmModal } from './SwapConfirmModal'
import { SwapStatusModal } from './SwapStatusModal'
import { SwapPendingBanner } from './SwapPendingBanner'
import { SwapResponseBanner } from './SwapResponseBanner'
import './CalendarView.css'

import { colaboradoresApi, type Colaborador } from '../api/colaboradores'
import { DayStrip } from './DayStrip'
import { DayDetailView } from './DayDetailView'

interface GenerationResult {
  status: string
  message: string
  dias_con_advertencia: Array<{ fecha: string; advertencias: string[] }>
  dias_con_error: Array<{ fecha: string; error: string }>
  dias_salteados: Array<{ fecha: string; motivo: string }>
}

function formatDateHelper(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMondayHelper(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

export const CalendarView: React.FC = () => {
  const { user } = useAuthContext()
  const { notificaciones } = useUserNotifications()
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(getMondayHelper(new Date()))
  const [selectedDayMobile, setSelectedDayMobile] = useState<string>(formatDateHelper(new Date()))
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [turnos, setTurnos] = useState<Map<string, TurnoAlmuerzoResponse>>(new Map())
  const [diasNoLaborables, setDiasNoLaborables] = useState<Set<string>>(new Set())
  const [vacaciones, setVacaciones] = useState<Map<string, Ausencia[]>>(new Map())
  const [colaboradores, setColaboradores] = useState<Map<number, Colaborador>>(new Map())
  const [sectores, setSectores] = useState<Map<number, Sector>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [showDiaNoLaborableModal, setShowDiaNoLaborableModal] = useState<string | null>(null)
  const [diaNoLaborableMotivo, setDiaNoLaborableMotivo] = useState('')
  const [diaNoLaborableLoading, setDiaNoLaborableLoading] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [swapConfirmModal, setSwapConfirmModal] = useState<{
    asignacionOrigen: AsignacionResponse
    asignacionReceptor: AsignacionResponse
    receptorNombre: string
    franjaOrigen: string
    franjaReceptor: string
    fecha: string
  } | null>(null)
  const [swapStatusModal, setSwapStatusModal] = useState<SwapResponse | null>(null)

  // Alias para usar las funciones helper dentro del componente
  const getMonday = getMondayHelper
  const formatDate = formatDateHelper

  function getDayName(date: Date): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab']
    return days[date.getDay()]
  }

  const reloadTurnos = useCallback(async () => {
    const turnosMap = new Map<string, TurnoAlmuerzoResponse>()
    const weekDaysList: Date[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(selectedWeekMonday)
      d.setDate(d.getDate() + i)
      weekDaysList.push(d)
    }
    await Promise.all(
      weekDaysList.map(async (d) => {
        const dateStr = formatDate(d)
        const res = await turnosApi.list(dateStr)
        res.data.franjas.forEach((turno) => {
          turnosMap.set(`${dateStr}-${turno.franja_horaria_id}`, turno)
        })
      })
    )
    setTurnos(turnosMap)
  }, [selectedWeekMonday])

  useEffect(() => {
    const handler = () => { reloadTurnos() }
    window.addEventListener('swap-updated', handler)
    return () => window.removeEventListener('swap-updated', handler)
  }, [reloadTurnos])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const franjasRes = await franjasApi.list()
        setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))

        // Load sectores for color mapping
        const sectoresRes = await sectoresApi.list()
        const sectoresMap = new Map<number, Sector>()
        sectoresRes.data.forEach(s => sectoresMap.set(s.id, s))
        setSectores(sectoresMap)

        // Load colaboradores for name mapping
        const colabsRes = await colaboradoresApi.list()
        const colabMap = new Map<number, Colaborador>()
        colabsRes.data.forEach(c => colabMap.set(c.id, c))
        setColaboradores(colabMap)

        // Load non-working days for this month
        const monthStr = formatDate(selectedWeekMonday).substring(0, 7)
        const diasRes = await diasNolaborablesApi.list(monthStr)
        const diasSet = new Set(diasRes.data.map(d => d.fecha))
        setDiasNoLaborables(diasSet)

        // Load vacaciones for this month
        const vacacionesRes = await ausenciasApi.list(undefined, monthStr)
        const vacacionesMap = new Map<string, Ausencia[]>()
        vacacionesRes.data.forEach(v => {
          if (!vacacionesMap.has(v.fecha)) {
            vacacionesMap.set(v.fecha, [])
          }
          vacacionesMap.get(v.fecha)!.push(v)
        })
        setVacaciones(vacacionesMap)

        const turnosMap = new Map<string, TurnoAlmuerzoResponse>()
        const weekDays = []
        for (let i = 0; i < 5; i++) {
          const date = new Date(selectedWeekMonday)
          date.setDate(date.getDate() + i)
          weekDays.push(date)
        }

        await Promise.all(
          weekDays.map(async (date) => {
            const res = await turnosApi.list(formatDate(date))
            res.data.franjas.forEach((turno) => {
              turnosMap.set(`${formatDate(date)}-${turno.franja_horaria_id}`, turno)
            })
          })
        )

        setTurnos(turnosMap)
      } catch (error) {
        console.error('Error loading calendar data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [selectedWeekMonday])

  // Initialize selected day for mobile view
  useEffect(() => {
    // Only reset selectedDayMobile if the current selected day is not in the new week
    const [year, month, day] = selectedDayMobile.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
    const weekEnd = new Date(selectedWeekMonday)
    weekEnd.setDate(weekEnd.getDate() + 4) // Friday of the week

    if (selectedDayMobile && selectedDate >= selectedWeekMonday && selectedDate <= weekEnd) {
      // Keep the selected day if it's in the current week
      return
    }

    // Otherwise, select the first day of the new week (Monday)
    setSelectedDayMobile(formatDate(selectedWeekMonday))
  }, [selectedWeekMonday, selectedDayMobile, formatDate])

  const handlePreviousWeek = () => {
    const prev = new Date(selectedWeekMonday)
    prev.setDate(prev.getDate() - 7)
    setSelectedWeekMonday(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(selectedWeekMonday)
    next.setDate(next.getDate() + 7)
    setSelectedWeekMonday(next)
  }

  const handleCurrentWeek = () => {
    setSelectedWeekMonday(getMonday(new Date()))
    setSelectedDayMobile(formatDate(new Date()))
  }

  const handleGenerarSemana = async () => {
    try {
      setIsGenerating(true)
      const monday = getMonday(new Date(selectedWeekMonday))
      const mondayFormatted = formatDate(monday)

      const response = await turnosApi.generateWeek(mondayFormatted)

      // Reload calendar after generation
      const turnosMap = new Map<string, TurnoAlmuerzoResponse>()
      const weekDays = []
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday)
        date.setDate(date.getDate() + i)
        weekDays.push(date)
      }

      await Promise.all(
        weekDays.map(async (date) => {
          const dateStr = formatDate(date)
          const res = await turnosApi.list(dateStr)
          res.data.franjas.forEach((turno) => {
            turnosMap.set(`${dateStr}-${turno.franja_horaria_id}`, turno)
          })
        })
      )

      // Force re-render by setting turnos state
      setTurnos(turnosMap)

      // Find first day with turnos to display
      let firstDayWithTurnos = null
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday)
        date.setDate(date.getDate() + i)
        const dateStr = formatDate(date)
        const dayHasTurnos = Array.from(turnosMap.values()).some(
          (turno) => turno.fecha === dateStr || turno.fecha?.startsWith(dateStr)
        )
        if (dayHasTurnos) {
          firstDayWithTurnos = dateStr
          break
        }
      }

      // Select first day with turnos, or keep current day
      if (firstDayWithTurnos) {
        setSelectedDayMobile(firstDayWithTurnos)
      }

      setGenerationResult({
        status: response.data.status,
        message: response.data.mensaje,
        dias_con_advertencia: response.data.dias_con_advertencia || [],
        dias_con_error: response.data.dias_con_error || [],
        dias_salteados: response.data.dias_salteados || [],
      })

      // Auto-close modal on success after 2 seconds
      if (response.data.status === 'ok' || response.data.status === 'warning') {
        setTimeout(() => {
          setGenerationResult(null)
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error generating week:', error)
      setGenerationResult({
        status: 'error',
        message: 'Error al generar la semana',
        dias_con_advertencia: [],
        dias_con_error: [{ fecha: '', error: error.response?.data?.detail || error.message || 'Error desconocido' }],
        dias_salteados: [],
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const weekDays: Date[] = []
  for (let i = 0; i < 5; i++) {
    const date = new Date(selectedWeekMonday)
    date.setDate(date.getDate() + i)
    weekDays.push(date)
  }

  if (isLoading) {
    return <div className="calendar-loading">Cargando calendario...</div>
  }

  const getAsignados = (date: Date, franjaId: number): string => {
    const turno = turnos.get(`${formatDate(date)}-${franjaId}`)
    if (!turno) {
      return '—'
    }
    if (turno.asignaciones.length === 0) {
      return 'Sin turno'
    }
    return turno.asignaciones.map((a) => a.colaborador.nombre.split(' ')[0]).join(', ')
  }

  const getVacacionesEnDia = (date: Date): Ausencia[] => {
    const dateStr = formatDate(date)
    return vacaciones.get(dateStr) || []
  }

  const renderTurnoPills = (date: Date, franjaId: number) => {
    const turno = turnos.get(`${formatDate(date)}-${franjaId}`)
    if (!turno) {
      return <span className="turno-empty">—</span>
    }
    if (turno.asignaciones.length === 0) {
      return <span className="turno-empty">Sin turno</span>
    }

    const dateStr = formatDate(date)
    const myInfoForDate = user ? getUserAsignacionForDate(dateStr) : null
    const canInitiateSwap = user && user.rol !== 'viewer' && myInfoForDate !== null

    return (
      <div className="turno-pills">
        {turno.asignaciones.map((a, idx) => {
          const sector = sectores.get(a.colaborador.sector_id)
          const isCurrentUser = user && a.colaborador_id === user.id
          const isPendienteSwap = isCurrentUser && a.estado === 'pendiente_swap'
          const isClickable = isCurrentUser ? isPendienteSwap : canInitiateSwap

          return (
            <span
              key={idx}
              className={`pill ${isCurrentUser ? 'current-user' : ''} ${isPendienteSwap ? 'pill-pending-swap' : ''} ${isClickable ? 'pill-clickable' : ''}`}
              style={{ backgroundColor: sector?.color || '#999', color: 'white' }}
              title={isPendienteSwap ? 'Intercambio pendiente — clic para ver estado' : isClickable ? `Intercambiar con ${a.colaborador.nombre}` : a.colaborador.nombre}
              onClick={isClickable ? () => handlePillClick(date, a, turno) : undefined}
            >
              {a.colaborador.nombre.split(' ')[0]}
              {isPendienteSwap && <span className="swap-badge" />}
            </span>
          )
        })}
      </div>
    )
  }

  const renderVacacionesPills = (date: Date) => {
    const vacs = getVacacionesEnDia(date)
    if (vacs.length === 0) {
      return <span className="vacaciones-empty">—</span>
    }
    // Group by colaborador_id to get unique colaboradores
    const colabIds = new Set(vacs.map(v => v.colaborador_id))
    return (
      <div className="vacaciones-pills">
        {Array.from(colabIds).map((colabId, idx) => {
          const colab = colaboradores.get(colabId)
          const nombre = colab ? colab.nombre.split(' ')[0] : `Col. ${colabId}`
          const isCurrentUser = user && colabId === user.id
          return (
            <span key={idx} className={`pill pill-vacation ${isCurrentUser ? 'current-user' : ''}`} title={colab?.nombre}>
              {nombre}
            </span>
          )
        })}
      </div>
    )
  }

  const isDiaNoLaborable = (date: Date): boolean => {
    return diasNoLaborables.has(formatDate(date))
  }

  const formatFranja = (franja: FranjaHoraria): string =>
    `${franja.hora_inicio.slice(0, 5)} – ${franja.hora_fin.slice(0, 5)}`

  const getUserAsignacionForDate = (dateStr: string): { asig: AsignacionResponse; turno: TurnoAlmuerzoResponse } | null => {
    for (const franja of franjas) {
      const turno = turnos.get(`${dateStr}-${franja.id}`)
      if (turno) {
        const myAsig = turno.asignaciones.find((a) => user && a.colaborador_id === user.id)
        if (myAsig) return { asig: myAsig, turno }
      }
    }
    return null
  }

  const handlePillClick = async (
    date: Date,
    clickedAsig: AsignacionResponse,
    clickedTurno: TurnoAlmuerzoResponse
  ) => {
    if (!user || user.rol === 'viewer') return

    if (clickedAsig.colaborador_id === user.id) {
      if (clickedAsig.estado === 'pendiente_swap') {
        try {
          const res = await swapsApi.list()
          const swap = res.data.find(
            (s) =>
              (s.asignacion_origen_id === clickedAsig.id || s.asignacion_receptor_id === clickedAsig.id) &&
              s.estado === 'pendiente'
          )
          if (swap) setSwapStatusModal(swap)
        } catch (err) {
          console.error('Error cargando swap:', err)
        }
      }
      return
    }

    const dateStr = formatDate(date)
    const myInfo = getUserAsignacionForDate(dateStr)
    if (!myInfo) return

    setSwapConfirmModal({
      asignacionOrigen: myInfo.asig,
      asignacionReceptor: clickedAsig,
      receptorNombre: clickedAsig.colaborador.nombre,
      franjaOrigen: formatFranja(myInfo.turno.franja_horaria),
      franjaReceptor: formatFranja(clickedTurno.franja_horaria),
      fecha: dateStr,
    })
  }

  const handleDiaNoLaborableClick = (date: Date) => {
    if (!user || user.rol !== 'admin') return
    const dateStr = formatDate(date)
    if (isDiaNoLaborable(date)) {
      handleRemoveDiaNoLaborable(dateStr)
    } else {
      setShowDiaNoLaborableModal(dateStr)
      setDiaNoLaborableMotivo('')
    }
  }

  const handleRemoveDiaNoLaborable = async (fecha: string) => {
    try {
      setDiaNoLaborableLoading(true)
      await diasNolaborablesApi.delete(fecha)
      const newDias = new Set(diasNoLaborables)
      newDias.delete(fecha)
      setDiasNoLaborables(newDias)
    } catch (error) {
      console.error('Error removing non-working day:', error)
      alert('Error al quitar el día no laborable')
    } finally {
      setDiaNoLaborableLoading(false)
    }
  }

  const handleAddDiaNoLaborable = async () => {
    if (!showDiaNoLaborableModal || !diaNoLaborableMotivo.trim()) {
      alert('Ingresa un motivo')
      return
    }

    try {
      setDiaNoLaborableLoading(true)
      await diasNolaborablesApi.create({
        fecha: showDiaNoLaborableModal,
        motivo: diaNoLaborableMotivo,
      })
      const newDias = new Set(diasNoLaborables)
      newDias.add(showDiaNoLaborableModal)
      setDiasNoLaborables(newDias)
      setShowDiaNoLaborableModal(null)
      setDiaNoLaborableMotivo('')
    } catch (error) {
      console.error('Error adding non-working day:', error)
      alert('Error al marcar el día no laborable')
    } finally {
      setDiaNoLaborableLoading(false)
    }
  }

  const handleGenerarDesdeElDia = async (date: Date) => {
    try {
      setIsGenerating(true)
      const startDate = new Date(date)
      const endDateOfWeek = new Date(selectedWeekMonday)
      endDateOfWeek.setDate(endDateOfWeek.getDate() + 4) // Friday

      const daysToGenerate = []
      for (let d = new Date(startDate); d <= endDateOfWeek; d.setDate(d.getDate() + 1)) {
        daysToGenerate.push(new Date(d))
      }

      const results: GenerationResult[] = []

      for (const day of daysToGenerate) {
        const dateStr = formatDate(day)
        try {
          const response = await turnosApi.generateDay(dateStr)
          results.push({
            status: response.data.status,
            message: response.data.mensaje,
            dias_con_advertencia: response.data.dias_con_advertencia || [],
            dias_con_error: response.data.dias_con_error || [],
            dias_salteados: response.data.dias_salteados || [],
          })
        } catch (error: any) {
          console.error(`Error generating day ${dateStr}:`, error)
          results.push({
            status: 'error',
            message: `Error en ${dateStr}`,
            dias_con_advertencia: [],
            dias_con_error: [{ fecha: dateStr, error: error.response?.data?.detail || error.message }],
            dias_salteados: [],
          })
        }
      }

      // Aggregate results
      const aggregated: GenerationResult = {
        status: results.some(r => r.status === 'error') ? 'error' : results.some(r => r.status === 'warning') ? 'warning' : 'ok',
        message: `Generación completada para ${daysToGenerate.length} día(s)`,
        dias_con_advertencia: results.flatMap(r => r.dias_con_advertencia),
        dias_con_error: results.flatMap(r => r.dias_con_error),
        dias_salteados: results.flatMap(r => r.dias_salteados),
      }

      setGenerationResult(aggregated)

      // Reload calendar data
      const turnosMap = new Map<string, TurnoAlmuerzoResponse>()
      const weekDays = []
      for (let i = 0; i < 5; i++) {
        const d = new Date(selectedWeekMonday)
        d.setDate(d.getDate() + i)
        weekDays.push(d)
      }

      await Promise.all(
        weekDays.map(async (d) => {
          const dateStr = formatDate(d)
          const res = await turnosApi.list(dateStr)
          res.data.franjas.forEach((turno) => {
            turnosMap.set(`${dateStr}-${turno.franja_horaria_id}`, turno)
          })
        })
      )

      setTurnos(turnosMap)
    } catch (error: any) {
      console.error('Error in handleGenerarDesdeElDia:', error)
      setGenerationResult({
        status: 'error',
        message: 'Error al generar turnos',
        dias_con_advertencia: [],
        dias_con_error: [],
        dias_salteados: [],
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="calendar-view">
      {/* ── Mobile week navigation ── */}
      <div className="md:hidden mb-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePreviousWeek}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 font-bold transition"
            style={{ background: '#f5f5fa', border: '1.5px solid rgba(0,0,0,.06)' }}
          >
            ‹
          </button>
          <div className="text-center">
            <span className="text-sm font-bold text-gray-900">
              {weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              {' – '}
              {weekDays[4].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <button
            onClick={handleNextWeek}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 font-bold transition"
            style={{ background: '#f5f5fa', border: '1.5px solid rgba(0,0,0,.06)' }}
          >
            ›
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCurrentWeek}
            className="flex-1 h-8 rounded-xl text-xs font-semibold transition"
            style={{ background: '#ede9fe', color: '#4f46e5' }}
          >
            Esta semana
          </button>
          {user?.rol === 'admin' && (
            <button
              onClick={handleGenerarSemana}
              disabled={isGenerating}
              className="flex-1 h-8 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {isGenerating ? 'Generando...' : 'Generar semana'}
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop week navigation ── */}
      <div className="hidden md:flex flex-col gap-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Calendario de Turnos</h2>
        <div className="flex gap-3">
          <button onClick={handlePreviousWeek} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition">
            ← Semana Anterior
          </button>
          <button onClick={handleCurrentWeek} className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl transition">
            Semana Actual
          </button>
          <button onClick={handleNextWeek} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition">
            Semana Siguiente →
          </button>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3" style={{ border: '1.5px solid rgba(0,0,0,.05)' }}>
          <span className="text-sm text-gray-700 font-medium">
            Semana del {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' })} al{' '}
            {weekDays[4].toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' })}
          </span>
          {user?.rol === 'admin' && (
            <button
              onClick={handleGenerarSemana}
              disabled={isGenerating}
              className={`px-4 py-1.5 text-white text-sm font-medium rounded-xl transition ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isGenerating ? 'Generando...' : 'Generar Semana'}
            </button>
          )}
        </div>
      </div>

      <SwapPendingBanner notificaciones={notificaciones} />
      <SwapResponseBanner />

      {/* Mobile view: Day strip + detail view */}
      <div className="md:hidden px-4 mb-4">
        <DayStrip
          weekDays={weekDays}
          selectedDay={selectedDayMobile}
          onSelectDay={setSelectedDayMobile}
          isDiaNoLaborable={isDiaNoLaborable}
          formatDate={formatDate}
          getDayName={getDayName}
        />
        {selectedDayMobile && (() => {
          const [year, month, day] = selectedDayMobile.split('-').map(Number)
          const selectedDate = new Date(year, month - 1, day)
          return (
            <DayDetailView
              selectedDate={selectedDate}
              franjas={franjas}
              turnos={turnos}
              isDiaNoLaborable={isDiaNoLaborable(selectedDate)}
              formatDate={formatDate}
              renderTurnoPills={renderTurnoPills}
              renderVacacionesPills={renderVacacionesPills}
              isAdmin={user?.rol === 'admin'}
              isGenerating={isGenerating}
              onDiaNoLaborableClick={handleDiaNoLaborableClick}
              onGenerarDesdeElDia={handleGenerarDesdeElDia}
            />
          )
        })()}
      </div>

      {/* Desktop view: Full calendar table */}
      <div className="hidden md:block calendar-grid-container">
        <table className="calendar-grid">
          <thead>
            <tr>
              <th className="franja-col">Franja</th>
              {weekDays.map((date) => (
                <th
                  key={formatDate(date)}
                  className={`day-col ${isDiaNoLaborable(date) ? 'no-laborable' : ''}`}
                  onClick={() => handleDiaNoLaborableClick(date)}
                  style={{ cursor: user?.rol === 'admin' ? 'pointer' : 'default' }}
                >
                  <div className="day-header">
                    <div>
                      <div className="day-name">{getDayName(date)}</div>
                      <div className="day-date">{date.getDate()}</div>
                    </div>
                    {user?.rol === 'admin' && (
                      <button
                        className="btn-generar-dia"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGenerarDesdeElDia(date)
                        }}
                        disabled={isGenerating}
                        title="Generar desde este día"
                      >
                        ↻
                      </button>
                    )}
                  </div>
                  {isDiaNoLaborable(date) && <div className="no-laborable-badge">No laborable</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Vacation row */}
            <tr className="vacation-row">
              <td className="franja-col vacation-label">
                <div className="franja-time">De vacaciones</div>
              </td>
              {weekDays.map((date) => (
                <td key={`vacation-${formatDate(date)}`} className="vacation-cell">
                  <div className="vacation-content">
                    {renderVacacionesPills(date)}
                  </div>
                </td>
              ))}
            </tr>

            {/* Franjas rows */}
            {franjas.map((franja) => (
              <tr key={franja.id}>
                <td className="franja-col">
                  <div className="franja-time">
                    {franja.hora_inicio} – {franja.hora_fin}
                  </div>
                </td>
                {weekDays.map((date) => {
                  const dateStr = formatDate(date)
                  const isSinTurno = getAsignados(date, franja.id) === 'Sin turno'
                  return (
                    <td
                      key={`${dateStr}-${franja.id}`}
                      className={`turno-cell ${isDiaNoLaborable(date) ? 'no-laborable-cell' : ''} ${isSinTurno ? 'sin-turno-cell' : ''}`}
                    >
                      <div className="turno-content">
                        {renderTurnoPills(date, franja.id)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for marking non-working day */}
      {showDiaNoLaborableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Marcar día no laborable</h3>
            <p>Fecha: {new Date(showDiaNoLaborableModal).toLocaleDateString('es-ES')}</p>
            <div className="form-group">
              <label htmlFor="motivo">Motivo:</label>
              <input
                id="motivo"
                type="text"
                value={diaNoLaborableMotivo}
                onChange={(e) => setDiaNoLaborableMotivo(e.target.value)}
                placeholder="Ej: Feriado, cierre"
                disabled={diaNoLaborableLoading}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddDiaNoLaborable}
                disabled={diaNoLaborableLoading}
              >
                {diaNoLaborableLoading ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDiaNoLaborableModal(null)}
                disabled={diaNoLaborableLoading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for generation result */}
      {generationResult && (
        <div className="modal-overlay" onClick={() => setGenerationResult(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Resultado de Generación</h3>
              <button
                className="modal-close"
                onClick={() => setGenerationResult(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-message">{generationResult.message}</p>

              {generationResult.dias_salteados.length > 0 && (
                <div className="result-section">
                  <h4>Días Saltados ({generationResult.dias_salteados.length})</h4>
                  <ul>
                    {generationResult.dias_salteados.map((d) => (
                      <li key={d.fecha}>
                        <strong>{d.fecha}</strong>: {d.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {generationResult.dias_con_advertencia.length > 0 && (
                <div className="result-section warning">
                  <h4>Días con Advertencia ⚠️ ({generationResult.dias_con_advertencia.length})</h4>
                  <ul>
                    {generationResult.dias_con_advertencia.map((d) => (
                      <li key={d.fecha}>
                        <strong>{d.fecha}</strong>:
                        <ul>
                          {d.advertencias.map((adv, idx) => (
                            <li key={`${d.fecha}-adv-${idx}`}>{adv}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {generationResult.dias_con_error.length > 0 && (
                <div className="result-section error">
                  <h4>Días con Error ❌ ({generationResult.dias_con_error.length})</h4>
                  <ul>
                    {generationResult.dias_con_error.map((d) => (
                      <li key={d.fecha}>
                        <strong>{d.fecha}</strong>: {d.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setGenerationResult(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {swapConfirmModal && (
        <SwapConfirmModal
          {...swapConfirmModal}
          onClose={() => setSwapConfirmModal(null)}
          onSuccess={() => {
            setSwapConfirmModal(null)
            reloadTurnos()
          }}
        />
      )}

      {swapStatusModal && (
        <SwapStatusModal
          swap={swapStatusModal}
          onClose={() => setSwapStatusModal(null)}
          onSuccess={() => {
            setSwapStatusModal(null)
            reloadTurnos()
          }}
        />
      )}

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-box">—</div>
          <span>Sin turnos generados</span>
        </div>
        {Array.from(sectores.values()).map((sector) => (
          <div key={sector.id} className="legend-item">
            <div
              className="legend-box pill"
              style={{
                backgroundColor: sector.color,
                color: 'white',
                borderRadius: '12px',
                border: 'none'
              }}
            >
              {sector.nombre.substring(0, 3)}
            </div>
            <span>{sector.nombre}</span>
          </div>
        ))}
        <div className="legend-item">
          <div className="legend-box pill pill-vacation">Vac</div>
          <span>De vacaciones</span>
        </div>
      </div>
    </div>
  )
}
