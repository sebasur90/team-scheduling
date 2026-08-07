import React, { useState, useEffect } from 'react';
import { sectoresApi, type Sector, type SectorCreate, type SectorUpdate } from '../api/sectores';
import './AdminPanel.css';
import './FormSector.css';
import './SectoresPanel.css';

export const SectoresPanel: React.FC = () => {
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

  useEffect(() => {
    sectoresApi
      .list()
      .then((res) => setSectores(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => setSectores([]))
      .finally(() => setSectoresLoading(false));
  }, []);

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

  return (
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
        <div className="admin-form-card">
          <div className="admin-form-header">
            <h3 className="admin-form-title">
              {editingSectorId ? 'Editar Sector' : 'Nuevo Sector'}
            </h3>
            <p className="admin-form-subtitle">Completa los campos para {editingSectorId ? 'actualizar' : 'crear'} un sector</p>
          </div>
          <div className="admin-form-body">
            <form onSubmit={editingSectorId ? handleUpdateSector : handleCreateSector}>
              {sectorFormError && <div className="form-error">{sectorFormError}</div>}

              <div className="form-row form-row--1col">
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
              </div>

              <div className="form-row">
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

              <div className="form-row form-row--3col">
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      name="participa_almuerzo"
                      checked={editingSectorId ? editingSectorData?.participa_almuerzo || false : sectorFormData.participa_almuerzo}
                      onChange={editingSectorId ? handleEditSectorChange : handleSectorFormChange}
                      disabled={sectorFormLoading}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    Participa en turnos
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
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
                <button type="submit" className="btn btn-primary" disabled={sectorFormLoading}>
                  {sectorFormLoading ? 'Guardando...' : editingSectorId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sectoresLoading ? (
        <div className="loading">Cargando sectores...</div>
      ) : sectores.length === 0 ? (
        <div className="empty-state">No hay sectores creados</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Capacidad Máx.</th>
                  <th>Mín. Cobertura</th>
                  <th>Acceso</th>
                  <th>Participa</th>
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {sectores.map((sector) => (
              <div
                key={sector.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="h-1" style={{ backgroundColor: sector.color }} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm border border-gray-300 flex-shrink-0"
                          style={{ backgroundColor: sector.color }}
                        />
                        {sector.nombre}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-md transition"
                        onClick={() => handleEditSector(sector)}
                        disabled={editingSectorId === sector.id}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="p-2 hover:bg-red-50 rounded-md transition"
                        onClick={() => handleDeleteSector(sector.id)}
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Capacidad Máx.:</span>
                      <p className="font-medium text-gray-900">{sector.capacidad_maxima}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mín. Cobertura:</span>
                      <p className="font-medium text-gray-900">{sector.minimo_cobertura}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Acceso:</span>
                      <p className="font-medium text-gray-900">
                        {sector.acceso_rol === 'gestion' ? '✓ Gestión' : '👁 Lectura'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Participa:</span>
                      <p className="font-medium text-gray-900">
                        {sector.participa_almuerzo ? '✓ Sí' : '✗ No'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
