import React, { useState, useEffect } from 'react';
import { useIncidencias, type IncidenciaData } from '../hooks/useIncidencias';
import { useAuthContext } from '../contexts/AuthContext';
import { colaboradoresApi, type ColaboradorCreate } from '../api/colaboradores';
import { franjasApi, type FranjaHoraria, type FranjaCreate } from '../api/franjas';
import { sectoresApi, type Sector, type SectorCreate, type SectorUpdate } from '../api/sectores';
import { turnosApi, type TurnoListResponse, type TurnoAlmuerzoResponse } from '../api/turnos';
import { diasNolaborablesApi, type DiaNoLaborable, type DiaNoLaborableCreate } from '../api/diasNolaborables';
import { tareasEspecialesApi, type TareaEspecialTipo } from '../api/tareasEspeciales';
import { ConfiguracionCobertura } from './ConfiguracionCobertura';
import { Vacaciones } from './Vacaciones';
import { Colaborador } from '../api/auth';
import client from '../api/client';
import './AdminPanel.css';

const API_URL = import.meta.env.VITE_API_URL;

type Tab = 'colaboradores' | 'sectores' | 'franjas' | 'asignacion' | 'dias-no-laborables' | 'vacaciones' | 'configuracion' | 'incidencias' | 'preferencias';
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
    sector_id: 1,
    estado_atencion: 'activo',
    rol: 'usuario',
    tarea_tipo_ids: [],
  });
  const [tareasEspeciales, setTareasEspeciales] = useState<any[]>([]);

  // Sectores state
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [sectoresLoading, setSectoresLoading] = useState(true);
  const [showSectorForm, setShowSectorForm] = useState(false);
  const [sectorFormError, setSectorFormError] = useState<string | null>(null);
  const [sectorFormLoading, setSectorFormLoading] = useState(false);
  const [sectorFormData, setSectorFormData] = useState<SectorCreate>({
    nombre: '',
    capacidad_maxima: 10,
    participa_almuerzo: true,
    acceso_rol: 'gestion',
    minimo_cobertura: 1,
    color: '#000000',
  });
  const [editingSectorId, setEditingSectorId] = useState<number | null>(null);
  const [editingSectorData, setEditingSectorData] = useState<Partial<SectorUpdate> | null>(null);

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

  // Load colaboradores and tareas especiales
  useEffect(() => {
    if (activeTab === 'colaboradores' || activeTab === 'asignacion') {
      colaboradoresApi
        .list()
        .then((res) => setColaboradores(res.data))
        .catch(() => setColaboradores([]))
        .finally(() => setColabLoading(false));

      // Load tareas especiales
      tareasEspecialesApi
        .listTipos()
        .then((res) => setTareasEspeciales(res.data))
        .catch(() => setTareasEspeciales([]));
    }
  }, [activeTab]);

  // Load sectores
  useEffect(() => {
    if (activeTab === 'sectores' || activeTab === 'colaboradores') {
      sectoresApi
        .list()
        .then((res) => setSectores(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre))))
        .catch(() => setSectores([]))
        .finally(() => setSectoresLoading(false));
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

  // Helper to get sector name by ID
  const getSectorName = (sectorId: number): string => {
    return sectores.find((s) => s.id === sectorId)?.nombre || `Sector ${sectorId}`;
  };

  // Colaboradores handlers
  const handleColabFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith('tarea_tipo_')) {
      const tipoId = parseInt(name.split('_')[2]);
      setColabFormData((prev) => ({
        ...prev,
        tarea_tipo_ids: checked
          ? [...(prev.tarea_tipo_ids || []), tipoId]
          : (prev.tarea_tipo_ids || []).filter((id) => id !== tipoId),
      }));
    } else {
      setColabFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
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
        sector_id: sectores.length > 0 ? sectores[0].id : 1,
        estado_atencion: 'activo',
        rol: 'usuario',
        tarea_tipo_ids: [],
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

  // Sectores handlers
  const handleSectorFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setSectorFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'capacidad_maxima' || name === 'minimo_cobertura' ? parseInt(value) || 1 : value,
    }));
    setSectorFormError(null);
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectorFormLoading(true);
    setSectorFormError(null);

    try {
      const newSector = await sectoresApi.create(sectorFormData);
      setSectores([...sectores, newSector.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setSectorFormData({
        nombre: '',
        capacidad_maxima: 10,
        participa_almuerzo: true,
        acceso_rol: 'gestion',
        minimo_cobertura: 1,
        color: '#000000',
      });
      setShowSectorForm(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear sector';
      setSectorFormError(errorMessage);
    } finally {
      setSectorFormLoading(false);
    }
  };

  const handleEditSector = (sector: Sector) => {
    setEditingSectorId(sector.id);
    setEditingSectorData({
      nombre: sector.nombre,
      capacidad_maxima: sector.capacidad_maxima,
      participa_almuerzo: sector.participa_almuerzo,
      acceso_rol: sector.acceso_rol,
      minimo_cobertura: sector.minimo_cobertura,
      color: sector.color,
    });
  };

  const handleEditSectorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setEditingSectorData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'capacidad_maxima' || name === 'minimo_cobertura' ? parseInt(value) || 1 : value,
    }));
  };

  const handleUpdateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectorId || !editingSectorData) return;

    try {
      setSectorFormLoading(true);
      const updated = await sectoresApi.update(editingSectorId, editingSectorData);
      setSectores(
        sectores.map((s) => (s.id === editingSectorId ? updated.data : s)).sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setEditingSectorId(null);
      setEditingSectorData(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar sector';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSectorFormLoading(false);
    }
  };

  const handleDeleteSector = async (sectorId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este sector?')) return;

    try {
      await sectoresApi.delete(sectorId);
      setSectores(sectores.filter((s) => s.id !== sectorId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al eliminar sector';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleEditColaborador = (colab: Colaborador) => {
    setEditingColabId(colab.id);
    setEditingColabData({
      nombre: colab.nombre,
      email: colab.email,
      sector_id: colab.sector_id,
      estado_atencion: colab.estado_atencion as 'activo' | 'desafectado',
      rol: colab.rol as 'admin' | 'usuario',
      tarea_tipo_ids: colab.tarea_tipo_ids || [],
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

    if (name.startsWith('tarea_tipo_')) {
      const tipoId = parseInt(name.split('_')[2]);
      setEditingColabData((prev) => ({
        ...prev,
        tarea_tipo_ids: checked
          ? [...(prev?.tarea_tipo_ids || []), tipoId]
          : (prev?.tarea_tipo_ids || []).filter((id) => id !== tipoId),
      }));
    } else {
      setEditingColabData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
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
          className={`tab-button ${activeTab === 'sectores' ? 'active' : ''}`}
          onClick={() => setActiveTab('sectores')}
        >
          Sectores
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
                  <label htmlFor="sector_id">Sector *</label>
                  <select
                    id="sector_id"
                    name="sector_id"
                    value={editingColabId ? editingColabData?.sector_id || '' : colabFormData.sector_id}
                    onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                    required
                    disabled={colabFormLoading || sectoresLoading}
                  >
                    <option value="">-- Seleccionar sector --</option>
                    {sectores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
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
                <fieldset className="form-group">
                  <legend>Tareas Especiales Habilitadas</legend>
                  {tareasEspeciales.length === 0 ? (
                    <p style={{ fontSize: '0.9em', color: '#666' }}>No hay tareas especiales disponibles</p>
                  ) : (
                    tareasEspeciales.map((tarea) => {
                      const tareaIds = editingColabId ? (editingColabData?.tarea_tipo_ids || []) : (colabFormData.tarea_tipo_ids || []);
                      return (
                        <div key={tarea.id} className="form-group checkbox">
                          <label htmlFor={`tarea_tipo_${tarea.id}`}>
                            <input
                              type="checkbox"
                              id={`tarea_tipo_${tarea.id}`}
                              name={`tarea_tipo_${tarea.id}`}
                              checked={tareaIds.includes(tarea.id)}
                              onChange={editingColabId ? handleEditColabChange : handleColabFormChange}
                              disabled={colabFormLoading}
                            />
                            {tarea.nombre}
                          </label>
                        </div>
                      );
                    })
                  )}
                </fieldset>
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
                    <th>Tareas Especiales</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((colab) => {
                    const tareasHabilitadas = tareasEspeciales
                      .filter((t) => colab.tarea_tipo_ids?.includes(t.id))
                      .map((t) => t.nombre)
                      .join(', ');
                    return (
                      <tr key={colab.id}>
                        <td>{colab.nombre}</td>
                        <td>{getSectorName(colab.sector_id)}</td>
                        <td>{colab.rol}</td>
                        <td>{colab.estado_atencion}</td>
                        <td>{tareasHabilitadas || '–'}</td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTORES TAB */}
      {activeTab === 'sectores' && (
        <div className="admin-tab-content">
          <div className="tab-header">
            <h3>Sectores</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowSectorForm(!showSectorForm)}
            >
              + Nuevo Sector
            </button>
          </div>

          {(showSectorForm || editingSectorId) && (
            <form onSubmit={editingSectorId ? handleUpdateSector : handleCreateSector} className="admin-form">
              {sectorFormError && <div className="form-error">{sectorFormError}</div>}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={editingSectorId ? editingSectorData?.nombre || '' : sectorFormData.nombre}
                    onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                    required
                    disabled={sectorFormLoading}
                    placeholder="Ej: Operativos A"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="capacidad_maxima">Capacidad Máxima *</label>
                  <input
                    type="number"
                    id="capacidad_maxima"
                    name="capacidad_maxima"
                    value={editingSectorId ? editingSectorData?.capacidad_maxima || 10 : sectorFormData.capacidad_maxima}
                    onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                    required
                    disabled={sectorFormLoading}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="minimo_cobertura">Mínimo de Cobertura *</label>
                  <input
                    type="number"
                    id="minimo_cobertura"
                    name="minimo_cobertura"
                    value={editingSectorId ? editingSectorData?.minimo_cobertura || 1 : sectorFormData.minimo_cobertura}
                    onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                    required
                    disabled={sectorFormLoading}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="acceso_rol">Acceso al Sistema</label>
                  <select
                    id="acceso_rol"
                    name="acceso_rol"
                    value={editingSectorId ? editingSectorData?.acceso_rol || 'gestion' : sectorFormData.acceso_rol}
                    onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                    disabled={sectorFormLoading}
                  >
                    <option value="gestion">Gestión Completa</option>
                    <option value="viewer">Solo Lectura</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="color">Color Identificador</label>
                  <input
                    type="color"
                    id="color"
                    name="color"
                    value={editingSectorId ? editingSectorData?.color || '#000000' : sectorFormData.color}
                    onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                    disabled={sectorFormLoading}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="participa_almuerzo"
                      checked={editingSectorId ? editingSectorData?.participa_almuerzo || false : sectorFormData.participa_almuerzo}
                      onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                      disabled={sectorFormLoading}
                    />
                    Participa en turnos de almuerzo
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={sectorFormLoading}>
                  {sectorFormLoading ? 'Guardando...' : editingSectorId ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowSectorForm(false);
                    setEditingSectorId(null);
                    setEditingSectorData(null);
                  }}
                  disabled={sectorFormLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {sectoresLoading ? (
            <div className="loading">Cargando sectores...</div>
          ) : sectores.length === 0 ? (
            <div className="empty-state">No hay sectores creados</div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Capacidad Máx.</th>
                    <th>Mín. Cobertura</th>
                    <th>Acceso</th>
                    <th>Almuerzo</th>
                    <th>Color</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sectores.map((sector) => (
                    <tr key={sector.id}>
                      <td>{sector.nombre}</td>
                      <td>{sector.capacidad_maxima}</td>
                      <td>{sector.minimo_cobertura}</td>
                      <td>{sector.acceso_rol === 'gestion' ? '✓ Gestión' : '👁 Lectura'}</td>
                      <td>{sector.participa_almuerzo ? '✓ Sí' : '✗ No'}</td>
                      <td>
                        <div
                          style={{
                            display: 'inline-block',
                            width: '20px',
                            height: '20px',
                            backgroundColor: sector.color,
                            borderRadius: '3px',
                            border: '1px solid #ccc',
                          }}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-small btn-info"
                          onClick={() => handleEditSector(sector)}
                          disabled={editingSectorId === sector.id}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteSector(sector.id)}
                        >
                          Eliminar
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
                            title={`${colab.nombre} - ${getSectorName(colab.sector_id)}`}
                          >
                            <span className="chip__icon">
                              {state === 'assigned' && '✓'}
                              {state === 'conflict' && '⚠'}
                              {state === 'available' && '+'}
                            </span>
                            <span className="chip__text">
                              <span className="chip__name">{colab.nombre}</span>
                              <span className="chip__sector">{getSectorName(colab.sector_id)}</span>
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
                  <strong>{overrideModal.colaborador.nombre}</strong> es <strong>{getSectorName(overrideModal.colaborador.sector_id)}</strong> y ya hay un{' '}
                  <strong>{getSectorName(overrideModal.colaborador.sector_id)}</strong> asignado en esta franja (
                  <strong>{overrideModal.conflictingColaborador.nombre}</strong>).
                  <br />
                  <br />
                  La función <strong>{getSectorName(overrideModal.colaborador.sector_id)}</strong> quedaría sin cobertura durante el almuerzo. ¿Igualmente asignar?
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
                          <td>{getSectorName(colab.sector_id)}</td>
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
