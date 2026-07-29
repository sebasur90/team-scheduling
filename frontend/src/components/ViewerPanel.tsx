import React from 'react'
import { CalendarView } from './CalendarView'
import './ViewerPanel.css'

export const ViewerPanel: React.FC = () => {
  return (
    <div className="viewer-panel">
      <div className="viewer-banner">
        📋 Modo lectura — No puedes hacer cambios
      </div>
      <div className="viewer-calendar-container">
        <CalendarView />
      </div>
    </div>
  )
}
