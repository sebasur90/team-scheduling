import React, { useState, useEffect } from 'react';
import { colaboradoresApi } from '../api/colaboradores';
import { sectoresApi, type Sector } from '../api/sectores';
import { turnosApi, type TurnoListResponse, type TurnoAlmuerzoResponse } from '../api/turnos';
import { diasNolaborablesApi, type DiaNoLaborable } from '../api/diasNolaborables';
import { Colaborador } from '../api/auth';
import './AdminPanel.css';
import './AsignacionTurnosPanel.css';

type ChipState = 'assigned' | 'available' | 'conflict' | 'disabled';

interface OverrideModalState {
  turnoId: number;
  colaborador: Colaborador;
  conflictingColaborador: Colaborador;
}

interface DeleteTurnoModalState {
  turnoId: number;
  turno: TurnoAlmuerzoResponse;
}

export const AsignacionTurnosPanel: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [asignacionFecha, setAsignacionFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [turnosData, setTurnosData] = useState<TurnoListResponse | null>(null);
  const [turnosLoading, setTurnosLoading] = useState(false);
  const [turnosError, setTurnosError] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<OverrideModalState | null>(null);
  const [deleteTurnoModal, setDeleteTurnoModal] = useState<DeleteTurnoModalState | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [diasNoLaborables, setDiasNoLaborables] = useState<DiaNoLaborable[]>([]);
  const [selectedDateDiaNoLaborable, setSelectedDateDiaNoLaborable] = useState<string | null>(null);

  // Load colaboradores y sectores (una sola vez)
  useEffect(() => {
    colaboradoresApi
      .list()
      .then((res) => setColaboradores(res.data))
      .catch(() => setColaboradores([]));

    sectoresApi
      .list()
      .then((res) => setSectores(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => setSectores([]));
  }, []);

  // Load turnos para la fecha seleccionada
  useEffect(() => {
    setTurnosLoading(true);
    setTurnosError(null);
    turnosApi
      .list(asignacionFecha)
      .then((res) => setTurnosData(res.data))
      .catch((err) => {
        setTurnosError(err.response?.data?.detail || err.message || 'Error al cargar turnos');
        setTurnosData(null);
      })
      .finally(() => setTurnosLoading(false));
  }, [asignacionFecha]);

  // Load días no laborables del mes de la fecha seleccionada
  useEffect(() => {
    const now = new Date();
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    diasNolaborablesApi
      .list(mes)
      .then((res) => setDiasNoLaborables(res.data))
      .catch(() => setDiasNoLaborables([]));
  }, []);

  // Check if selected asignacion date is a non-working day
  useEffect(() => {
    if (diasNoLaborables.length > 0) {
      const matchingDia = diasNoLaborables.find((d) => d.fecha === asignacionFecha);
      setSelectedDateDiaNoLaborable(matchingDia?.motivo || null);
    } else {
      setSelectedDateDiaNoLaborable(null);
    }
  }, [asignacionFecha, diasNoLaborables]);

  const getSectorName = (sectorId: number): string => {
    return sectores.find((s) => s.id === sectorId)?.nombre || `Sector ${sectorId}`;
  };

  const getChipState = (colab: Colaborador, turno: TurnoAlmuerzoResponse): ChipState => {
    const isAssigned = turno.asignaciones.some((a) => a.colaborador_id === colab.id);
    if (isAssigned) return 'assigned';

    const isFull = turno.asignaciones.length >= turno.capacidad_maxima;
    if (isFull) return 'disabled';

    const sectoresOcupados = new Set(turno.asignaciones.map((a) => a.colaborador.sector_id));
    if (sectoresOcupados.has(colab.sector_id)) return 'conflict';

    return 'available';
  };

  const handleChipClick = async (colab: Colaborador, turno: TurnoAlmuerzoResponse) => {
    const state = getChipState(colab, turno);

    if (state === 'assigned') {
      const asignacion = turno.asignaciones.find((a) => a.colaborador_id === colab.id);
      if (!asignacion) return;
      setOperationLoading(true);
      try {
        await turnosApi.deleteAsignacion(asignacion.id);
        turnosApi
          .list(asignacionFecha)
          .then((res) => setTurnosData(res.data))
          .catch((err) => setTurnosError(err.message));
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Error al desasignar';
        alert(`Error: ${errorMessage}`);
      } finally {
        setOperationLoading(false);
      }
    } else if (state === 'available') {
      setOperationLoading(true);
      try {
        await turnosApi.createAsignacion(turno.id, colab.id);
        turnosApi
          .list(asignacionFecha)
          .then((res) => setTurnosData(res.data))
          .catch((err) => setTurnosError(err.message));
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Error al asignar';
        alert(`Error: ${errorMessage}`);
      } finally {
        setOperationLoading(false);
      }
    } else if (state === 'conflict') {
      const conflictingAsignacion = turno.asignaciones.find((a) => a.colaborador.sector_id === colab.sector_id);
      if (conflictingAsignacion) {
        setOverrideModal({
          turnoId: turno.id,
          colaborador: colab,
          conflictingColaborador: conflictingAsignacion.colaborador,
        });
      }
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideModal) return;
    setOperationLoading(true);
    try {
      await turnosApi.createAsignacion(overrideModal.turnoId, overrideModal.colaborador.id);
      turnosApi
        .list(asignacionFecha)
        .then((res) => setTurnosData(res.data))
        .catch((err) => setTurnosError(err.message));
      setOverrideModal(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al asignar';
      alert(`Error: ${errorMessage}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleConfirmDeleteTurno = async () => {
    if (!deleteTurnoModal) return;
    setOperationLoading(true);
    try {
      await turnosApi.deleteTurno(deleteTurnoModal.turnoId);
      turnosApi
        .list(asignacionFecha)
        .then((res) => setTurnosData(res.data))
        .catch((err) => setTurnosError(err.message));
      setDeleteTurnoModal(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al eliminar turno';
      alert(`Error: ${errorMessage}`);
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="admin-tab-content">
      <h3>Asignación de Turnos</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="asignacion-fecha">Seleccionar Fecha:</label>
          <input
            type="date"
            id="asignacion-fecha"
            value={asignacionFecha}
            onChange={(e) => setAsignacionFecha(e.target.value)}
          />
        </div>
      </div>

      {selectedDateDiaNoLaborable && (
        <div className="warning-box">
          <strong>Día no laborable:</strong> {selectedDateDiaNoLaborable}
        </div>
      )}

      {turnosLoading ? (
        <div className="loading">Cargando turnos...</div>
      ) : turnosError ? (
        <div className="admin-panel--error">Error: {turnosError}</div>
      ) : !turnosData || turnosData.franjas.length === 0 ? (
        <div className="admin-panel__empty">No hay turnos para esta fecha</div>
      ) : (
        <div className="turnos-list">
          {turnosData.franjas.map((turno) => (
            <div key={turno.id} className="turno-card">
              <div className="turno-card__header">
                <div>
                  <h4>
                    {turno.franja_horaria.hora_inicio} - {turno.franja_horaria.hora_fin}
                    <span className="turno-card__orden">(Orden {turno.franja_horaria.orden})</span>
                  </h4>
                </div>
                <div className="turno-card__header-right">
                  <span className={`turno-card__capacidad ${turno.asignaciones.length >= turno.capacidad_maxima ? 'full' : ''}`}>
                    {turno.asignaciones.length} / {turno.capacidad_maxima}
                  </span>
                  <button
                    className="btn-delete-turno"
                    onClick={() => setDeleteTurnoModal({ turnoId: turno.id, turno })}
                    disabled={operationLoading}
                    title="Eliminar turno"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="turno-card__asignaciones">
                <div className="chips-container">
                  {colaboradores.map((colab) => {
                    const state = getChipState(colab, turno);
                    return (
                      <button
                        key={`chip-${turno.id}-${colab.id}`}
                        className={`chip chip--${state}`}
                        onClick={() => handleChipClick(colab, turno)}
                        disabled={operationLoading || state === 'disabled'}
                        title={`${colab.nombre} - ${colab.sector_nombre || getSectorName(colab.sector_id)}`}
                      >
                        <span className="chip__icon">
                          {state === 'assigned' && '✓'}
                          {state === 'conflict' && '⚠'}
                          {state === 'available' && '+'}
                        </span>
                        <span className="chip__text">
                          <span className="chip__name">{colab.nombre}</span>
                          <span className="chip__sector">{colab.sector_nombre || getSectorName(colab.sector_id)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {colaboradores.length === 0 && (
                  <div className="asignacion-item__empty">
                    No hay colaboradores disponibles
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {overrideModal && (
        <div className="modal-overlay" onClick={() => setOverrideModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Superposición de funciones</h3>
            <p>
              <strong>{overrideModal.colaborador.nombre}</strong> es <strong>{overrideModal.colaborador.sector_nombre || getSectorName(overrideModal.colaborador.sector_id)}</strong> y ya hay un{' '}
              <strong>{overrideModal.colaborador.sector_nombre || getSectorName(overrideModal.colaborador.sector_id)}</strong> asignado en esta franja (
              <strong>{overrideModal.conflictingColaborador.nombre}</strong>).
              <br />
              <br />
              La función <strong>{overrideModal.colaborador.sector_nombre || getSectorName(overrideModal.colaborador.sector_id)}</strong> quedaría sin cobertura durante este turno. ¿Igualmente asignar?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setOverrideModal(null)}
                disabled={operationLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmOverride}
                disabled={operationLoading}
              >
                {operationLoading ? 'Asignando...' : 'Asignar igualmente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE TURNO MODAL */}
      {deleteTurnoModal && (
        <div className="modal-overlay" onClick={() => setDeleteTurnoModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🗑 Borrar turno del día</h3>
            <p>
              Se eliminarán todas las asignaciones del turno{' '}
              <strong>
                {deleteTurnoModal.turno.franja_horaria.hora_inicio} – {deleteTurnoModal.turno.franja_horaria.hora_fin}
              </strong>{' '}
              del <strong>{asignacionFecha}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteTurnoModal(null)}
                disabled={operationLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDeleteTurno}
                disabled={operationLoading}
              >
                {operationLoading ? 'Eliminando...' : 'Confirmar borrado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
