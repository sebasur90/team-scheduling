import React, { useState, useEffect } from 'react'
import { turnosApi, TurnoAlmuerzoResponse } from '../api/turnos'
import { franjasApi, FranjaHoraria } from '../api/franjas'
import { useAuthContext } from '../contexts/AuthContext'
import './CalendarView.css'

export const CalendarView: React.FC = () => {
  const { user } = useAuthContext()
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(getMonday(new Date()))
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([])
  const [turnos, setTurnos] = useState<Map<string, TurnoAlmuerzoResponse>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function getDayName(date: Date, locale: string = 'es-ES'): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab']
    return days[date.getDay()]
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const franjasRes = await franjasApi.list()
        setFranjas(franjasRes.data.sort((a, b) => a.orden - b.orden))

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
  }

  const weekDays = []
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
    if (!turno || turno.asignaciones.length === 0) {
      return '—'
    }
    return turno.asignaciones.map((a) => a.colaborador.nombre.split(' ')[0]).join(', ')
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h2>Calendario de Turnos</h2>
        <div className="week-navigation">
          <button className="btn btn-nav" onClick={handlePreviousWeek}>
            ← Semana Anterior
          </button>
          <button className="btn btn-nav" onClick={handleCurrentWeek}>
            Semana Actual
          </button>
          <button className="btn btn-nav" onClick={handleNextWeek}>
            Semana Siguiente →
          </button>
        </div>
      </div>

      <div className="week-info">
        <span>
          Semana del {weekDays[0].toLocaleDateString('es-ES')} al{' '}
          {weekDays[4].toLocaleDateString('es-ES')}
        </span>
        {user?.rol === 'admin' && (
          <button className="btn btn-primary btn-small">Generar Semana</button>
        )}
      </div>

      <div className="calendar-grid-container">
        <table className="calendar-grid">
          <thead>
            <tr>
              <th className="franja-col">Franja</th>
              {weekDays.map((date) => (
                <th key={formatDate(date)} className="day-col">
                  <div className="day-name">{getDayName(date)}</div>
                  <div className="day-date">{date.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {franjas.map((franja) => (
              <tr key={franja.id}>
                <td className="franja-col">
                  <div className="franja-time">
                    {franja.hora_inicio} – {franja.hora_fin}
                  </div>
                </td>
                {weekDays.map((date) => (
                  <td key={`${formatDate(date)}-${franja.id}`} className="turno-cell">
                    <div className="turno-content">
                      {getAsignados(date, franja.id)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-box">—</div>
          <span>Sin turnos generados</span>
        </div>
        <div className="legend-item">
          <div className="legend-box assigned">Nombre</div>
          <span>Colaborador asignado</span>
        </div>
      </div>
    </div>
  )
}
