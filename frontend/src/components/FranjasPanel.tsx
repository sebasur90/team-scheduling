import React, { useState, useEffect } from 'react';
import { franjasApi, type FranjaHoraria, type FranjaCreate } from '../api/franjas';
import './AdminPanel.css';
import './FormFranja.css';
import './FranjasPanel.css';

export const FranjasPanel: React.FC = () => {
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

  useEffect(() => {
    franjasApi
      .list()
      .then((res) => setFranjas(res.data.sort((a, b) => a.orden - b.orden)))
      .catch(() => setFranjas([]))
      .finally(() => setFranjasLoading(false));
  }, []);

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

  return (
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
        <div className="admin-form-card">
          <div className="admin-form-header">
            <h3 className="admin-form-title">
              {editingFranjaId ? 'Editar Franja Horaria' : 'Nueva Franja Horaria'}
            </h3>
            <p className="admin-form-subtitle">Completa los campos para {editingFranjaId ? 'actualizar' : 'crear'} una franja horaria</p>
          </div>
          <div className="admin-form-body">
            <form onSubmit={editingFranjaId ? handleUpdateFranja : handleCreateFranja}>
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

              <div className="admin-form-actions">
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
                <button type="submit" className="btn btn-primary" disabled={franjaFormLoading}>
                  {franjaFormLoading ? 'Guardando...' : editingFranjaId ? 'Actualizar Franja' : 'Crear Franja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {franjasLoading ? (
        <div className="loading">Cargando franjas...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {franjas.map((franja) => (
              <div
                key={franja.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">Orden {franja.orden}</span>
                    <p className="font-semibold text-gray-900 text-lg">
                      {franja.hora_inicio} – {franja.hora_fin}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-md transition"
                      onClick={() => handleEditFranja(franja)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-red-50 rounded-md transition"
                      onClick={() => handleDeleteFranja(franja.id)}
                      title="Eliminar"
                    >
                      🗑
                    </button>
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
