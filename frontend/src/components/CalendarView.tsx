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
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

  const handleGenerarSemana = async () => {
    try {
      setIsLoading(true)
      const monday = getMonday(new Date(selectedWeekMonday))
      const mondayFormatted = formatDate(monday)
      console.log('📅 Generando semana para:', mondayFormatted)
      console.log('   Día de semana:', monday.getDay(), '(0=dom, 1=lun)')
      console.log('   selectedWeekMonday:', selectedWeekMonday)

      const response = await turnosApi.generateWeek(mondayFormatted)
      console.log('✅ Respuesta de generación:', response.data)
      console.log('   Turnos generados:', response.data.turnos_generados?.length || 0)
      console.log('   Días con error:', response.data.dias_con_error)
      console.log('   Mensaje:', response.data.mensaje)

      if (response.data.dias_con_error?.length > 0) {
        alert('⚠️ Generación con errores:\n' + JSON.stringify(response.data.dias_con_error, null, 2))
      } else {
        alert('✅ Semana generada: ' + response.data.mensaje)
      }

      // Reload calendar after generation
      const turnosMap = new Map<string, TurnoAlmuerzoResponse>()
      const weekDays = []
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday)
        date.setDate(date.getDate() + i)
        weekDays.push(date)
      }

      console.log('📥 Recargando datos para:', weekDays.map(d => formatDate(d)))

      await Promise.all(
        weekDays.map(async (date) => {
          const dateStr = formatDate(date)
          console.log('  Leyendo turnos para:', dateStr)
          const res = await turnosApi.list(dateStr)
          console.log('    Respuesta:', res.data.franjas.length, 'franjas')
          res.data.franjas.forEach((turno) => {
            turnosMap.set(`${dateStr}-${turno.franja_horaria_id}`, turno)
            console.log(`      Turno: ${dateStr}-${turno.franja_horaria_id} = ${turno.asignaciones.length} asignaciones`)
          })
        })
      )

      console.log('Total turnos en mapa:', turnosMap.size)
      setTurnos(turnosMap)
    } catch (error: any) {
      console.error('❌ Error generating week:', error)
      console.error('Response data:', error.response?.data)
      console.error('Message:', error.message)
      alert('❌ Error: ' + (error.response?.data?.detail || error.message || 'Error desconocido'))
    } finally {
      setIsLoading(false)
    }
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
          <button className="btn btn-primary btn-small" onClick={handleGenerarSemana}>Generar Semana</button>
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
