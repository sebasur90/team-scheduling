import React, { useState, useRef, useEffect } from 'react';
import { useIncidencias, type IncidenciaData } from '../hooks/useIncidencias';
import { useAuthContext } from '../contexts/AuthContext';
import { colaboradoresApi, type ColaboradorCreate } from '../api/colaboradores';
import { franjasApi, type FranjaHoraria, type FranjaCreate } from '../api/franjas';
import { turnosApi, type TurnoListResponse } from '../api/turnos';
import { Colaborador } from '../api/auth';
import client from '../api/client';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL;

type Tab = 'colaboradores' | 'franjas' | 'asignacion' | 'incidencias';

export function AdminPanel() {
  const { user } = useAuthContext();
  const { incidencias, loading: incidenciasLoading, error: incidenciasError } = useIncidencias();
  const [activeTab, setActiveTab] = useState<Tab>('colaboradores');
  const [selectedIncidencia, setSelectedIncidencia] = useState<IncidenciaData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Colaboradores state
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colabLoading, setColabLoading] = useState(true);
  const [showColabForm, setShowColabForm] = useState(false);
  const [colabFormError, setColabFormError] = useState<string | null>(null);
  const [colabFormLoading, setColabFormLoading] = useState(false);
  const [colabFormData, setColabFormData] = useState<ColaboradorCreate>({
    nombre: '',
    email: '',
    sector: 'comercial',
    estado_atencion: 'activo',
    rol: 'usuario',
    habilitado_orientador: false,
    habilitado_gestion_externa: false,
  });

  // Franjas state
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([]);
  const [franjasLoading, setFranjasLoading] = useState(true);
  const [showFranjaForm, setShowFranjaForm] = useState(false);
  const [franjaFormError, setFranjaFormError] = useState<string | null>(null);
  const [franjaFormLoading, setFranjaFormLoading] = useState(false);
  const [franjaFormData, setFranjaFormData] = useState<FranjaCreate>({
    hora_inicio: '12:00',
    hora_fin: '12:45',
    orden: 1,
  });
  const [editingFranjaId, setEditingFranjaId] = useState<number | null>(null);
  const [editingFranjaData, setEditingFranjaData] = useState<Partial<FranjaCreate> | null>(null);

  // Colaboradores edit state
  const [editingColabId, setEditingColabId] = useState<number | null>(null);
  const [editingColabData, setEditingColabData] = useState<Partial<ColaboradorCreate> | null>(null);

  // Asignación de turnos state
  const [asignacionFecha, setAsignacionFecha] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [turnosData, setTurnosData] = useState<TurnoListResponse | null>(null);
  const [turnosLoading, setTurnosLoading] = useState(false);
  const [turnosError, setTurnosError] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState<number | null>(null);

  if (!user || user.rol !== 'admin') {
    return null;
  }

  // Load colaboradores
  useEffect(() => {
    if (activeTab === 'colaboradores' || activeTab === 'asignacion') {
      colaboradoresApi
        .list()
        .then((res) => setColaboradores(res.data))
        .catch(() => setColaboradores([]))
        .finally(() => setColabLoading(false));
    }
  }, [activeTab]);

  // Load franjas
  useEffect(() => {
    if (activeTab === 'franjas') {
      franjasApi
        .list()
        .then((res) => setFranjas(res.data.sort((a, b) => a.orden - b.orden)))
        .catch(() => setFranjas([]))
        .finally(() => setFranjasLoading(false));
    }
  }, [activeTab]);

  // Load turnos for asignacion
  useEffect(() => {
    if (activeTab === 'asignacion') {
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
    }
  }, [activeTab, asignacionFecha]);

  // Colaboradores handlers
  const handleColabFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setColabFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setColabFormError(null);
  };

  const handleCreateColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    setColabFormLoading(true);
    setColabFormError(null);

    try {
      const newColab = await colaboradoresApi.create(colabFormData);
      setColaboradores([...colaboradores, newColab.data]);
      setColabFormData({
        nombre: '',
        email: '',
        sector: 'comercial',
        estado_atencion: 'activo',
        rol: 'usuario',
        habilitado_orientador: false,
        habilitado_gestion_externa: false,
      });
      setShowColabForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear colaborador';
      setColabFormError(errorMessage);
    } finally {
      setColabFormLoading(false);
    }
  };

  // Franjas handlers
  const handleFranjaFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFranjaFormData((prev) => ({
      ...prev,
      [name]: name === 'orden' ? parseInt(value) || 1 : value,
    }));
    setFranjaFormError(null);
  };

  const handleCreateFranja = async (e: React.FormEvent) => {
    e.preventDefault();
    setFranjaFormLoading(true);
    setFranjaFormError(null);

    try {
      const newFranja = await franjasApi.create(franjaFormData);
      setFranjas([...franjas, newFranja.data].sort((a, b) => a.orden - b.orden));
      setFranjaFormData({
        hora_inicio: '12:00',
        hora_fin: '12:45',
        orden: 1,
      });
      setShowFranjaForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear franja';
      setFranjaFormError(errorMessage);
    } finally {
      setFranjaFormLoading(false);
    }
  };

  const handleDeleteFranja = async (franjaId: number) => {
    if (!window.confirm('¿Eliminar esta franja?')) return;

    try {
      await franjasApi.delete(franjaId);
      setFranjas(franjas.filter((f) => f.id !== franjaId));
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEditFranja = (franja: FranjaHoraria) => {
    setEditingFranjaId(franja.id);
    setEditingFranjaData({
      hora_inicio: franja.hora_inicio,
      hora_fin: franja.hora_fin,
      orden: franja.orden,
    });
  };

  const handleUpdateFranja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFranjaId || !editingFranjaData) return;

    try {
      setFranjaFormLoading(true);
      const updated = await franjasApi.update(editingFranjaId, editingFranjaData);
      setFranjas(
        franjas.map((f) => (f.id === editingFranjaId ? updated.data : f)).sort((a, b) => a.orden - b.orden)
      );
      setEditingFranjaId(null);
      setEditingFranjaData(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar franja';
      alert(`Error: ${errorMessage}`);
    } finally {
      setFranjaFormLoading(false);
    }
  };

  const handleEditFranjaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingFranjaData((prev) => ({
      ...prev,
      [name]: name === 'orden' ? parseInt(value) || 1 : value,
    }));
  };

  const handleEditColaborador = (colab: Colaborador) => {
    setEditingColabId(colab.id);
    setEditingColabData({
      nombre: colab.nombre,
      email: colab.email,
      sector: colab.sector as 'comercial' | 'operativo',
      estado_atencion: colab.estado_atencion as 'activo' | 'desafectado',
      rol: colab.rol as 'admin' | 'usuario',
      habilitado_orientador: colab.habilitado_orientador,
      habilitado_gestion_externa: colab.habilitado_gestion_externa,
    });
  };

  const handleUpdateColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColabId || !editingColabData) return;

    try {
      setColabFormLoading(true);
      const updated = await colaboradoresApi.update(editingColabId, editingColabData);
      setColaboradores(colaboradores.map((c) => (c.id === editingColabId ? updated.data : c)));
      setEditingColabId(null);
      setEditingColabData(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar colaborador';
      alert(`Error: ${errorMessage}`);
    } finally {
      setColabFormLoading(false);
    }
  };

  const handleEditColabChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setEditingColabData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAsignacionChange = async (asignacionId: number, nuevoColaboradorId: number) => {
    setAssignmentLoading(asignacionId);
    try {
      await turnosApi.updateAsignacion(asignacionId, nuevoColaboradorId);
      turnosApi
        .list(asignacionFecha)
        .then((res) => setTurnosData(res.data))
        .catch((err) => setTurnosError(err.message));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al asignar';
      alert(`Error: ${errorMessage}`);
    } finally {
      setAssignmentLoading(null);
    }
  };

  const handleGenerarTurnos = async () => {
    try {
      setTurnosLoading(true);
      // Get Monday of the week containing the selected date
      const fecha = new Date(asignacionFecha + 'T00:00:00');
      const dia = fecha.getDay();
      // Calculate days to subtract to get to Monday (1 = Monday, 0 = Sunday)
      const diasAlunes = dia === 0 ? 6 : dia - 1;
      const lunes = new Date(fecha);
      lunes.setDate(lunes.getDate() - diasAlunes);
      const lunesStr = lunes.toISOString().split('T')[0];

      await client.post(`/admin/turnos/generar-semana?semana=${lunesStr}`);
      turnosApi
        .list(asignacionFecha)
        .then((res) => setTurnosData(res.data))
        .catch((err) => setTurnosError(err.message));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al generar turnos';
      alert(`Error: ${errorMessage}`);
    } finally {
      setTurnosLoading(false);
    }
  };

  // Incidencias handlers
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
    <div className="admin-panel">
      <h2>Panel de Admin</h2>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'colaboradores' ? 'active' : ''}`}
          onClick={() => setActiveTab('colaboradores')}
        >
          Colaboradores
        </button>
        <button
          className={`tab-button ${activeTab === 'franjas' ? 'active' : ''}`}
          onClick={() => setActiveTab('franjas')}
        >
          Franjas
        </button>
        <button
          className={`tab-button ${activeTab === 'asignacion' ? 'active' : ''}`}
          onClick={() => setActiveTab('asignacion')}
        >
          Asignación de Turnos
        </button>
        <button
          className={`tab-button ${activeTab === 'incidencias' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidencias')}
        >
          Incidencias
        </button>
      </div>

      {/* COLABORADORES TAB */}
      {activeTab === 'colaboradores' && (
        <div className="admin-tab-content">
          <div className="tab-header">
            <h3>Colaboradores</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowColabForm(!showColabForm)}
            >
              + Nuevo Colaborador
            </button>
          </div>

          {(showColabForm || editingColabId) && (
            <form onSubmit={editingColabId ? handleUpdateColaborador : handleCreateColaborador} className="admin-form">
              {colabFormError && <div className="form-error">{colabFormError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={editingColabId ? editingColabData?.nombre || '' : colabFormData.nombre}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    required
                    disabled={colabFormLoading}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editingColabId ? editingColabData?.email || '' : colabFormData.email}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    required={!editingColabId}
                    disabled={editingColabId || colabFormLoading}
                    placeholder="Ej: juan@example.com"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sector">Sector *</label>
                  <select
                    id="sector"
                    name="sector"
                    value={editingColabId ? editingColabData?.sector || '' : colabFormData.sector}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    required
                    disabled={colabFormLoading}
                  >
                    <option value="comercial">Comercial</option>
                    <option value="operativo">Operativo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="rol">Rol</label>
                  <select
                    id="rol"
                    name="rol"
                    value={editingColabId ? editingColabData?.rol || '' : colabFormData.rol}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    disabled={colabFormLoading}
                  >
                    <option value="usuario">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="estado_atencion">Estado</label>
                  <select
                    id="estado_atencion"
                    name="estado_atencion"
                    value={editingColabId ? editingColabData?.estado_atencion || '' : colabFormData.estado_atencion}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    disabled={colabFormLoading}
                  >
                    <option value="activo">Activo</option>
                    <option value="desafectado">Desafectado</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox">
                  <label htmlFor="habilitado_orientador">
                    <input
                      type="checkbox"
                      id="habilitado_orientador"
                      name="habilitado_orientador"
                      checked={editingColabId ? editingColabData?.habilitado_orientador || false : colabFormData.habilitado_orientador}
                      onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                      disabled={colabFormLoading}
                    />
                    Habilitado Orientador
                  </label>
                </div>

                <div className="form-group checkbox">
                  <label htmlFor="habilitado_gestion_externa">
                    <input
                      type="checkbox"
                      id="habilitado_gestion_externa"
                      name="habilitado_gestion_externa"
                      checked={editingColabId ? editingColabData?.habilitado_gestion_externa || false : colabFormData.habilitado_gestion_externa}
                      onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                      disabled={colabFormLoading}
                    />
                    Habilitado Gestión Externa
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={colabFormLoading}>
                  {colabFormLoading ? 'Guardando...' : editingColabId ? 'Actualizar Colaborador' : 'Crear Colaborador'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowColabForm(false);
                    setEditingColabId(null);
                    setEditingColabData(null);
                    setColabFormError(null);
                  }}
                  disabled={colabFormLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {colabLoading ? (
            <div className="loading">Cargando colaboradores...</div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Sector</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Orientador</th>
                    <th>Gest. Externa</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((colab) => (
                    <tr key={colab.id}>
                      <td>{colab.nombre}</td>
                      <td>{colab.sector}</td>
                      <td>{colab.rol}</td>
                      <td>{colab.estado_atencion}</td>
                      <td>{colab.habilitado_orientador ? '✓' : '–'}</td>
                      <td>{colab.habilitado_gestion_externa ? '✓' : '–'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleEditColaborador(colab)}
                        >
                          ✏
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FRANJAS TAB */}
      {activeTab === 'franjas' && (
        <div className="admin-tab-content">
          <div className="tab-header">
            <h3>Franjas Horarias</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowFranjaForm(!showFranjaForm)}
            >
              + Nueva Franja
            </button>
          </div>

          {(showFranjaForm || editingFranjaId) && (
            <form onSubmit={editingFranjaId ? handleUpdateFranja : handleCreateFranja} className="admin-form">
              {franjaFormError && <div className="form-error">{franjaFormError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="orden">Orden *</label>
                  <input
                    type="number"
                    id="orden"
                    name="orden"
                    value={editingFranjaId ? editingFranjaData?.orden || 1 : franjaFormData.orden}
                    onChange={editingFranjaId ? handleEditFranjaChange : handleFranjaFormChange}
                    required
                    disabled={franjaFormLoading}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hora_inicio">Hora Inicio *</label>
                  <input
                    type="time"
                    id="hora_inicio"
                    name="hora_inicio"
                    value={editingFranjaId ? editingFranjaData?.hora_inicio || '' : franjaFormData.hora_inicio}
                    onChange={editingFranjaId ? handleEditFranjaChange : handleFranjaFormChange}
                    required
                    disabled={franjaFormLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hora_fin">Hora Fin *</label>
                  <input
                    type="time"
                    id="hora_fin"
                    name="hora_fin"
                    value={editingFranjaId ? editingFranjaData?.hora_fin || '' : franjaFormData.hora_fin}
                    onChange={editingFranjaId ? handleEditFranjaChange : handleFranjaFormChange}
                    required
                    disabled={franjaFormLoading}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={franjaFormLoading}>
                  {franjaFormLoading ? 'Guardando...' : editingFranjaId ? 'Actualizar Franja' : 'Crear Franja'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowFranjaForm(false);
                    setEditingFranjaId(null);
                    setEditingFranjaData(null);
                    setFranjaFormError(null);
                  }}
                  disabled={franjaFormLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {franjasLoading ? (
            <div className="loading">Cargando franjas...</div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {franjas.map((franja) => (
                    <tr key={franja.id}>
                      <td>{franja.orden}</td>
                      <td>{franja.hora_inicio}</td>
                      <td>{franja.hora_fin}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleEditFranja(franja)}
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDeleteFranja(franja.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASIGNACIÓN DE TURNOS TAB */}
      {activeTab === 'asignacion' && (
        <div className="admin-tab-content">
          <h3>Asignación de Horarios de Almuerzo</h3>

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
            <div className="form-group">
              <label>&nbsp;</label>
              <button
                onClick={handleGenerarTurnos}
                disabled={turnosLoading}
                className="btn btn-primary"
              >
                {turnosLoading ? 'Generando...' : 'Generar Turnos de la Semana'}
              </button>
            </div>
          </div>

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
                    <h4>
                      {turno.franja_horaria.hora_inicio} - {turno.franja_horaria.hora_fin}
                      <span className="turno-card__orden">(Orden {turno.franja_horaria.orden})</span>
                    </h4>
                    <span className="turno-card__capacidad">
                      {turno.asignaciones.length} / {turno.capacidad_maxima}
                    </span>
                  </div>

                  <div className="turno-card__asignaciones">
                    {turno.asignaciones.map((asignacion) => (
                      <div key={asignacion.id} className="asignacion-item">
                        <div className="asignacion-item__name">
                          {asignacion.colaborador.nombre}
                          <span className="asignacion-item__email">({asignacion.colaborador.email})</span>
                        </div>
                        <select
                          value={asignacion.colaborador_id}
                          onChange={(e) =>
                            handleAsignacionChange(asignacion.id, parseInt(e.target.value))
                          }
                          disabled={assignmentLoading === asignacion.id}
                          className="asignacion-item__select"
                        >
                          {colaboradores.map((colab) => (
                            <option key={`asignacion-${asignacion.id}-colab-${colab.id}`} value={colab.id}>
                              {colab.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {turno.asignaciones.length === 0 && (
                      <div className="asignacion-item__empty">
                        Sin asignaciones para esta franja
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INCIDENCIAS TAB */}
      {activeTab === 'incidencias' && (
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
      )}
    </div>
  );
}
