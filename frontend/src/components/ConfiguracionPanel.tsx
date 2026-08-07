import React from 'react';
import { ConfiguracionCobertura } from './ConfiguracionCobertura';
import { NotificacionesConfig } from './NotificacionesConfig';
import './AdminPanel.css';
import './ConfiguracionPanel.css';

export const ConfiguracionPanel: React.FC = () => {
  return (
    <div className="admin-tab-content">
      <div style={{ marginBottom: '40px' }}>
        <h3>Configuración de Cobertura</h3>
        <ConfiguracionCobertura />
      </div>
      <div style={{ borderTop: '1px solid #ddd', paddingTop: '40px' }}>
        <h3>Configuración de Notificaciones</h3>
        <NotificacionesConfig />
      </div>
    </div>
  );
};
