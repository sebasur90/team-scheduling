import React, { useState } from 'react';
import { useIncidencias, type IncidenciaData } from '../hooks/useIncidencias';
import client from '../api/client';
import './AdminPanel.css';
import './IncidenciasPanel.css';

export const IncidenciasPanel: React.FC = () => {
  const { incidencias, loading: incidenciasLoading, error: incidenciasError } = useIncidencias();
  const [selectedIncidencia, setSelectedIncidencia] = useState<IncidenciaData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleBroadcast = async (incidenciaId: number) => {
    setActionLoading(true);
    try {
      await client.post(`/admin/incidencias/${incidenciaId}/broadcast`);
      alert('Broadcast dispuesto');
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePresencial = async (incidenciaId: number) => {
    setActionLoading(true);
    try {
      await client.post(`/admin/incidencias/${incidenciaId}/presencial`);
      alert('Resuelta presencialmente');
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-tab-content">
      <h3>Incidencias Activas</h3>
      {incidenciasLoading ? (
        <div className="loading">Cargando incidencias...</div>
      ) : incidenciasError ? (
        <div className="admin-panel--error">Error: {incidenciasError}</div>
      ) : incidencias.length === 0 ? (
        <div className="admin-panel__empty">Sin incidencias activas</div>
      ) : (
        <div className="incidencias-list">
          {incidencias.map((inc) => (
            <div
              key={inc.id}
              className={`incidencia-card incidencia-card--${inc.estado}`}
              onClick={() => setSelectedIncidencia(inc)}
            >
              <div className="incidencia-card__header">
                <span className="incidencia-card__id">#{inc.id}</span>
                <span className="incidencia-card__status">{inc.estado}</span>
                <span className="incidencia-card__fecha">{inc.fecha}</span>
              </div>

              <div className="incidencia-card__content">
                <div className="incidencia-card__affected">
                  <strong>{inc.colaborador_afectado.nombre}</strong> rechazó{' '}
                  <span className="incidencia-card__franja">{inc.franja}</span>
                </div>

                {inc.colaborador_reemplazante && (
                  <div className="incidencia-card__replacement">
                    ✓ Cubierto por <strong>{inc.colaborador_reemplazante.nombre}</strong>
                  </div>
                )}

                <div className="incidencia-card__candidates">
                  {inc.candidatos.length > 0 && (
                    <>
                      <strong>Candidatos ({inc.candidatos.length}):</strong>
                      <ul>
                        {inc.candidatos.slice(0, 3).map((c) => (
                          <li key={c.id}>
                            {c.nombre} <span className="candidate-score">({c.reemplazos_semana})</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {selectedIncidencia?.id === inc.id && (
                <div className="incidencia-card__actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBroadcast(inc.id);
                    }}
                    disabled={actionLoading}
                    className="btn btn-primary"
                  >
                    Broadcast
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePresencial(inc.id);
                    }}
                    disabled={actionLoading}
                    className="btn btn-secondary"
                  >
                    Presencial
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
