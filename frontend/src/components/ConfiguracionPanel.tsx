import React, { useState } from 'react'
import { ConfiguracionCobertura } from './ConfiguracionCobertura'
import { NotificacionesConfig } from './NotificacionesConfig'
import { PreferenciasUsuarios } from './PreferenciasUsuarios'
import './ConfiguracionPanel.css'

type ConfigTab = 'cobertura' | 'notificaciones' | 'preferencias'

export const ConfiguracionPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('cobertura')

  return (
    <div className="configuracion-panel">
      <h2>Configuración</h2>

      <div className="config-tabs">
        <button
          className={`tab-button ${activeTab === 'cobertura' ? 'active' : ''}`}
          onClick={() => setActiveTab('cobertura')}
        >
          📊 Mínimo de Cobertura
        </button>
        <button
          className={`tab-button ${activeTab === 'notificaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('notificaciones')}
        >
          🔔 Notificaciones
        </button>
        <button
          className={`tab-button ${activeTab === 'preferencias' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferencias')}
        >
          ❤️ Preferencias de Usuarios
        </button>
      </div>

      <div className="config-content">
        {activeTab === 'cobertura' && (
          <div className="config-section">
            <ConfiguracionCobertura />
          </div>
        )}
        {activeTab === 'notificaciones' && (
          <div className="config-section">
            <NotificacionesConfig />
          </div>
        )}
        {activeTab === 'preferencias' && (
          <div className="config-section">
            <PreferenciasUsuarios />
          </div>
        )}
      </div>
    </div>
  )
}
