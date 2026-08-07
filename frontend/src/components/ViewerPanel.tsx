import React, { useState } from 'react'
import { CalendarView } from './CalendarView'
import { CronogramaTareasScreen } from './CronogramaTareasScreen'
import './ViewerPanel.css'

type ViewerTab = 'calendario' | 'tareas-especiales'

export const ViewerPanel: React.FC = () => {
  const [tab, setTab] = useState<ViewerTab>('calendario')

  return (
    <div className="viewer-panel">
      <div className="viewer-banner">
        📋 Modo lectura — No puedes hacer cambios
      </div>
      <div className="viewer-tabs">
        <button
          className={`viewer-tab-button ${tab === 'calendario' ? 'active' : ''}`}
          onClick={() => setTab('calendario')}
        >
          Calendario
        </button>
        <button
          className={`viewer-tab-button ${tab === 'tareas-especiales' ? 'active' : ''}`}
          onClick={() => setTab('tareas-especiales')}
        >
          Tareas Especiales
        </button>
      </div>
      <div className="viewer-calendar-container">
        {tab === 'calendario' ? <CalendarView /> : <CronogramaTareasScreen readOnly />}
      </div>
    </div>
  )
}
