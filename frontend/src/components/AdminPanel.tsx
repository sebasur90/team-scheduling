import React, { useState, useEffect } from 'react';
import { useIncidencias, type IncidenciaData } from '../hooks/useIncidencias';
import { useAuthContext } from '../contexts/AuthContext';
import { colaboradoresApi, type ColaboradorCreate } from '../api/colaboradores';
import { franjasApi, type FranjaHoraria, type FranjaCreate } from '../api/franjas';
import { turnosApi, type TurnoListResponse, type TurnoAlmuerzoResponse } from '../api/turnos';
import { diasNolaborablesApi, type DiaNoLaborable, type DiaNoLaborableCreate } from '../api/diasNolaborables';
import { ConfiguracionCobertura } from './ConfiguracionCobertura';
import { Vacaciones } from './Vacaciones';
import { Colaborador } from '../api/auth';
import client from '../api/client';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL;

type Tab = 'colaboradores' | 'franjas' | 'asignacion' | 'dias-no-laborables' | 'vacaciones' | 'configuracion' | 'incidencias' | 'preferencias';
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
    sector: 'tipo_a',
    estado_atencion: 'activo',
    rol: 'usuario',
    habilitado_tarea_especial_1: false,
    habilitado_tarea_especial_2: false,
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
  const [overrideModal, setOverrideModal] = useState<OverrideModalState | null>(null);
  const [deleteTurnoModal, setDeleteTurnoModal] = useState<DeleteTurnoModalState | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Generation result modal state
  interface GenerationResult {
    status: string;
    message: string;
    dias_con_advertencia: Array<{ fecha: string; advertencias: string[] }>;
    dias_con_error: Array<{ fecha: string; error: string }>;
    dias_salteados: Array<{ fecha: string; motivo: string }>;
  }
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Días no laborables state
  const [diasNoLaborables, setDiasNoLaborables] = useState<DiaNoLaborable[]>([]);
  const [diasLoading, setDiasLoading] = useState(true);
  const [showDiaForm, setShowDiaForm] = useState(false);
  const [diaFormError, setDiaFormError] = useState<string | null>(null);
  const [diaFormLoading, setDiaFormLoading] = useState(false);
  const [diaFormData, setDiaFormData] = useState<DiaNoLaborableCreate>({
    fecha: '',
    motivo: '',
  });
  const [selectedDateDiaNoLaborable, setSelectedDateDiaNoLaborable] = useState<string | null>(null);

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

  // Load días no laborables
  useEffect(() => {
    if (activeTab === 'dias-no-laborables' || activeTab === 'asignacion') {
      const now = new Date();
      const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      diasNolaborablesApi
        .list(mes)
        .then((res) => setDiasNoLaborables(res.data))
        .catch(() => setDiasNoLaborables([]))
        .finally(() => setDiasLoading(false));
    }
  }, [activeTab]);

  // Check if selected asignacion date is a non-working day
  useEffect(() => {
    if (activeTab === 'asignacion' && diasNoLaborables.length > 0) {
      const matchingDia = diasNoLaborables.find((d) => d.fecha === asignacionFecha);
      setSelectedDateDiaNoLaborable(matchingDia?.motivo || null);
    }
  }, [asignacionFecha, diasNoLaborables, activeTab]);

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
        sector: 'tipo_a',
        estado_atencion: 'activo',
        rol: 'usuario',
        habilitado_tarea_especial_1: false,
        habilitado_tarea_especial_2: false,
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
      sector: colab.sector as 'tipo_a' | 'tipo_b',
      estado_atencion: colab.estado_atencion as 'activo' | 'desafectado',
      rol: colab.rol as 'admin' | 'usuario',
      habilitado_tarea_especial_1: colab.habilitado_tarea_especial_1,
      habilitado_tarea_especial_2: colab.habilitado_tarea_especial_2,
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

  const getChipState = (colab: Colaborador, turno: TurnoAlmuerzoResponse): ChipState => {
    const isAssigned = turno.asignaciones.some((a) => a.colaborador_id === colab.id);
    if (isAssigned) return 'assigned';

    const isFull = turno.asignaciones.length >= turno.capacidad_maxima;
    if (isFull) return 'disabled';

    const sectoresOcupados = new Set(turno.asignaciones.map((a) => a.colaborador.sector));
    if (sectoresOcupados.has(colab.sector)) return 'conflict';

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
      const conflictingAsignacion = turno.asignaciones.find((a) => a.colaborador.sector === colab.sector);
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

      const response = await turnosApi.generateWeek(lunesStr);

      // Show result modal
      setGenerationResult({
        status: response.data.status,
        message: response.data.mensaje,
        dias_con_advertencia: response.data.dias_con_advertencia || [],
        dias_con_error: response.data.dias_con_error || [],
        dias_salteados: response.data.dias_salteados || [],
      });

      // Reload turnos data
      turnosApi
        .list(asignacionFecha)
        .then((res) => setTurnosData(res.data))
        .catch((err) => setTurnosError(err.message));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al generar turnos';
      setGenerationResult({
        status: 'error',
        message: `Error: ${errorMessage}`,
        dias_con_advertencia: [],
        dias_con_error: [{ fecha: '', error: errorMessage }],
        dias_salteados: [],
      });
    } finally {
      setTurnosLoading(false);
    }
  };

  // Días no laborables handlers
  const handleDiaFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDiaFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setDiaFormError(null);
  };

  const handleCreateDia = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiaFormLoading(true);
    setDiaFormError(null);

    try {
      const newDia = await diasNolaborablesApi.create(diaFormData);
      setDiasNoLaborables([...diasNoLaborables, newDia.data].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setDiaFormData({ fecha: '', motivo: '' });
      setShowDiaForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear día no laborable';
      setDiaFormError(errorMessage);
    } finally {
      setDiaFormLoading(false);
    }
  };

  const handleDeleteDia = async (fecha: string) => {
    if (!window.confirm('¿Eliminar este día no laborable?')) return;

    try {
      await diasNolaborablesApi.delete(fecha);
      setDiasNoLaborables(diasNoLaborables.filter((d) => d.fecha !== fecha));
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
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
          className={`tab-button ${activeTab === 'dias-no-laborables' ? 'active' : ''}`}
          onClick={() => setActiveTab('dias-no-laborables')}
        >
          Días no laborables
        </button>
        <button
          className={`tab-button ${activeTab === 'vacaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('vacaciones')}
        >
          🏖️ Vacaciones
        </button>
        <button
          className={`tab-button ${activeTab === 'preferencias' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferencias')}
        >
          Preferencias
        </button>
        <button
          className={`tab-button ${activeTab === 'configuracion' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuracion')}
        >
          ⚙️ Configuración
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
                    <option value="tipo_a">Tipo-A</option>
                    <option value="tipo_b">Tipo-B</option>
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
                  <label htmlFor="habilitado_tarea_especial_1">
                    <input
                      type="checkbox"
                      id="habilitado_tarea_especial_1"
                      name="habilitado_tarea_especial_1"
                      checked={editingColabId ? editingColabData?.habilitado_tarea_especial_1 || false : colabFormData.habilitado_tarea_especial_1}
                      onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                      disabled={colabFormLoading}
                    />
                    Habilitado Tarea Especial 1
                  </label>
                </div>

                <div className="form-group checkbox">
                  <label htmlFor="habilitado_tarea_especial_2">
                    <input
                      type="checkbox"
                      id="habilitado_tarea_especial_2"
                      name="habilitado_tarea_especial_2"
                      checked={editingColabId ? editingColabData?.habilitado_tarea_especial_2 || false : colabFormData.habilitado_tarea_especial_2}
                      onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                      disabled={colabFormLoading}
                    />
                    Habilitado Tarea Especial 2
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
                    <th>Tarea Esp. 1</th>
                    <th>Tarea Esp. 2</th>
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
                      <td>{colab.habilitado_tarea_especial_1 ? '✓' : '–'}</td>
                      <td>{colab.habilitado_tarea_especial_2 ? '✓' : '–'}</td>
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
                            title={`${colab.nombre} - ${colab.sector}`}
                          >
                            <span className="chip__icon">
                              {state === 'assigned' && '✓'}
                              {state === 'conflict' && '⚠'}
                              {state === 'available' && '+'}
                            </span>
                            <span className="chip__text">
                              <span className="chip__name">{colab.nombre}</span>
                              <span className="chip__sector">{colab.sector}</span>
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
                  <strong>{overrideModal.colaborador.nombre}</strong> es <strong>{overrideModal.colaborador.sector}</strong> y ya hay un{' '}
                  <strong>{overrideModal.colaborador.sector}</strong> asignado en esta franja (
                  <strong>{overrideModal.conflictingColaborador.nombre}</strong>).
                  <br />
                  <br />
                  La función <strong>{overrideModal.colaborador.sector}</strong> quedaría sin cobertura durante el almuerzo. ¿Igualmente asignar?
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
      )}

      {/* DÍAS NO LABORABLES TAB */}
      {activeTab === 'dias-no-laborables' && (
        <section className="admin-tab-content">
          <h3>Días no laborables</h3>

          {!showDiaForm && (
            <button onClick={() => setShowDiaForm(true)} className="btn btn-primary">
              + Agregar día no laborable
            </button>
          )}

          {showDiaForm && (
            <form onSubmit={handleCreateDia} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dia-fecha">Fecha *</label>
                  <input
                    type="date"
                    id="dia-fecha"
                    name="fecha"
                    value={diaFormData.fecha}
                    onChange={handleDiaFormChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dia-motivo">Motivo *</label>
                  <textarea
                    id="dia-motivo"
                    name="motivo"
                    placeholder="Ej: Feriado, Paro, Reunión importante"
                    value={diaFormData.motivo}
                    onChange={handleDiaFormChange}
                    required
                  />
                </div>
              </div>
              {diaFormError && <div className="form-error">{diaFormError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={diaFormLoading}>
                  {diaFormLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDiaForm(false);
                    setDiaFormData({ fecha: '', motivo: '' });
                    setDiaFormError(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {diasNoLaborables.length > 0 ? (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {diasNoLaborables.map((dia) => (
                    <tr key={dia.fecha}>
                      <td>{new Date(dia.fecha).toLocaleDateString('es-AR')}</td>
                      <td>{dia.motivo}</td>
                      <td>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteDia(dia.fecha)}
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-panel__empty">No hay días no laborables registrados.</div>
          )}
        </section>
      )}

      {/* VACACIONES TAB */}
      {activeTab === 'vacaciones' && (
        <div className="admin-tab-content">
          <Vacaciones mode="admin" />
        </div>
      )}

      {/* PREFERENCIAS TAB */}
      {activeTab === 'preferencias' && (
        <div className="admin-tab-content">
          <div className="tab-header">
            <h3>Preferencias de Franja</h3>
          </div>
          {colabLoading ? (
            <div>Cargando...</div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                {(() => {
                  const activos = colaboradores.filter((c) => c.estado_atencion === 'activo');
                  const conPreferencia = activos.filter((c) => c.franja_preferida_id);
                  const sinPreferencia = activos.length - conPreferencia.length;
                  return (
                    <p>
                      <strong>
                        {conPreferencia.length} de {activos.length}
                      </strong>{' '}
                      colaboradores han configurado su preferencia
                      {sinPreferencia > 0 && ` (${sinPreferencia} sin configurar)`}
                    </p>
                  );
                })()}
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Sector</th>
                    <th>Franja Preferida</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const activos = colaboradores.filter((c) => c.estado_atencion === 'activo');
                    return activos.map((colab) => {
                      const franjaPreferida = franjas.find((f) => f.id === colab.franja_preferida_id);
                      return (
                        <tr key={colab.id}>
                          <td>{colab.nombre}</td>
                          <td>{colab.sector}</td>
                          <td>
                            {franjaPreferida
                              ? `${franjaPreferida.hora_inicio.slice(0, 5)} – ${franjaPreferida.hora_fin.slice(0, 5)}`
                              : 'Sin configurar'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* CONFIGURACION TAB */}
      {activeTab === 'configuracion' && (
        <div className="admin-tab-content">
          <ConfiguracionCobertura />
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

      {/* GENERATION RESULT MODAL */}
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
    </div>
  );
}
