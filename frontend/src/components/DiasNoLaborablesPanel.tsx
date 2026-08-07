import React, { useState, useEffect } from 'react';
import { diasNolaborablesApi, type DiaNoLaborable, type DiaNoLaborableCreate } from '../api/diasNolaborables';
import './AdminPanel.css';
import './DiasNoLaborablesPanel.css';

export const DiasNoLaborablesPanel: React.FC = () => {
  const [diasNoLaborables, setDiasNoLaborables] = useState<DiaNoLaborable[]>([]);
  const [showDiaForm, setShowDiaForm] = useState(false);
  const [diaFormError, setDiaFormError] = useState<string | null>(null);
  const [diaFormLoading, setDiaFormLoading] = useState(false);
  const [diaFormData, setDiaFormData] = useState<DiaNoLaborableCreate>({
    fecha: '',
    motivo: '',
  });

  useEffect(() => {
    const now = new Date();
    const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    diasNolaborablesApi
      .list(mes)
      .then((res) => setDiasNoLaborables(res.data))
      .catch(() => setDiasNoLaborables([]));
  }, []);

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

  return (
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
  );
};
