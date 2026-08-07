import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { colaboradoresApi, type ColaboradorCreate } from '../api/colaboradores';
import { sectoresApi, type Sector } from '../api/sectores';
import { tareasEspecialesApi } from '../api/tareasEspeciales';
import { Colaborador } from '../api/auth';
import './AdminPanel.css';
import './FormColaborador.css';

export function AdminPanel() {
  const { user } = useAuthContext();

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

  // Sectores (necesario para el select de sector y el nombre de sector en la tabla)
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [sectoresLoading, setSectoresLoading] = useState(true);

  // Colaboradores edit state
  const [editingColabId, setEditingColabId] = useState<number | null>(null);
  const [editingColabData, setEditingColabData] = useState<Partial<ColaboradorCreate> | null>(null);

  if (!user || user.rol !== 'admin') {
    return null;
  }

  // Load colaboradores
  useEffect(() => {
    colaboradoresApi
      .list()
      .then((res) => setColaboradores(res.data))
      .catch(() => setColaboradores([]))
      .finally(() => setColabLoading(false));
  }, []);

  // Load tareas especiales (para el checkbox "Tareas Especiales Habilitadas")
  useEffect(() => {
    tareasEspecialesApi
      .listTipos()
      .then((res) => setTareasEspeciales(res.data))
      .catch(() => setTareasEspeciales([]));
  }, []);

  // Load sectores (para el select de sector del form)
  useEffect(() => {
    sectoresApi
      .list()
      .then((res) => setSectores(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => setSectores([]))
      .finally(() => setSectoresLoading(false));
  }, []);

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

  const handleDeleteColaborador = async (colabId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este colaborador?')) return;

    try {
      await colaboradoresApi.delete(colabId);
      setColaboradores(colaboradores.filter((c) => c.id !== colabId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al eliminar colaborador';
      alert(`Error: ${errorMessage}`);
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

  return (
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
        <div className="admin-form-card">
          <div className="admin-form-header">
            <h3 className="admin-form-title">
              {editingColabId ? 'Editar Colaborador' : 'Nuevo Colaborador'}
            </h3>
            <p className="admin-form-subtitle">Completa los campos para {editingColabId ? 'actualizar' : 'crear'} un colaborador</p>
          </div>
          <div className="admin-form-body">
            <form onSubmit={editingColabId ? handleUpdateColaborador : handleCreateColaborador}>
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
                    disabled={!!editingColabId || colabFormLoading}
                    placeholder="Ej: juan@example.com"
                  />
                </div>
              </div>

              <div className="form-row form-row--3col">
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

              <div className="form-row form-row--full">
                <fieldset>
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

              <div className="admin-form-actions">
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
                <button type="submit" className="btn btn-primary" disabled={colabFormLoading}>
                  {colabFormLoading ? 'Guardando...' : editingColabId ? 'Actualizar Colaborador' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {colabLoading ? (
        <div className="loading">Cargando colaboradores...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
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
                      <td>{colab.sector_nombre || getSectorName(colab.sector_id)}</td>
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
                        <button
                          type="button"
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteColaborador(colab.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {colaboradores
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .map((colab) => {
                const sector = sectores.find((s) => s.id === colab.sector_id);
                const sectorColor = sector?.color || '#999999';
                const tareasHabilitadas = tareasEspeciales
                  .filter((t) => colab.tarea_tipo_ids?.includes(t.id))
                  .map((t) => t.nombre)
                  .join(', ');
                return (
                  <div
                    key={colab.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    {/* Sector color bar */}
                    <div
                      className="h-1"
                      style={{ backgroundColor: sectorColor }}
                    />
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{colab.nombre}</h4>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: sectorColor }}
                            />
                            {colab.sector_nombre || getSectorName(colab.sector_id)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-100 rounded-md transition"
                            onClick={() => handleEditColaborador(colab)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="p-2 hover:bg-red-50 rounded-md transition"
                            onClick={() => handleDeleteColaborador(colab.id)}
                            title="Eliminar"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Rol:</span>
                          <p className="font-medium text-gray-900">{colab.rol}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Estado:</span>
                          <p className="font-medium text-gray-900">{colab.estado_atencion}</p>
                        </div>
                      </div>
                      {tareasHabilitadas && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-gray-500 text-sm">Tareas:</span>
                          <p className="text-sm text-gray-700">{tareasHabilitadas}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
