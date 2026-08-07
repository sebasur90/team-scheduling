import React, { useState, useEffect } from 'react';
import { tareasEspecialesApi } from '../api/tareasEspeciales';
import { sectoresApi, type Sector } from '../api/sectores';
import { franjasApi, type FranjaHoraria } from '../api/franjas';
import FormTareaEspecial from './FormTareaEspecial';
import './AdminPanel.css';
import './TareasEspecialesPanel.css';

export const TareasEspecialesPanel: React.FC = () => {
  const [tareasEspeciales, setTareasEspeciales] = useState<any[]>([]);
  const [tareasLoading, setTareasLoading] = useState(true);
  const [showTareaForm, setShowTareaForm] = useState(false);
  const [editingTareaId, setEditingTareaId] = useState<number | null>(null);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [franjas, setFranjas] = useState<FranjaHoraria[]>([]);

  useEffect(() => {
    setTareasLoading(true);
    tareasEspecialesApi
      .listTipos()
      .then((res) => setTareasEspeciales(res.data))
      .catch(() => setTareasEspeciales([]))
      .finally(() => setTareasLoading(false));

    sectoresApi
      .list()
      .then((res) => setSectores(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => setSectores([]));

    franjasApi
      .list()
      .then((res) => setFranjas(res.data.sort((a, b) => a.orden - b.orden)))
      .catch(() => setFranjas([]));
  }, []);

  const handleEditTarea = (tarea: any) => {
    setEditingTareaId(tarea.id);
  };

  const handleDeleteTarea = async (tareaId: number) => {
    if (!window.confirm('¿Eliminar esta tarea especial?')) return;

    try {
      await tareasEspecialesApi.deleteTipo(tareaId);
      setTareasEspeciales(tareasEspeciales.filter((t) => t.id !== tareaId));
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="admin-tab-content">
      <div className="tab-header">
        <h3>Tareas Especiales</h3>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setShowTareaForm(!showTareaForm)}
        >
          + Nueva Tarea Especial
        </button>
      </div>

      {(showTareaForm || editingTareaId) && (
        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <FormTareaEspecial
            sectores={sectores}
            initialData={editingTareaId ? tareasEspeciales.find((t) => t.id === editingTareaId) : undefined}
            onSave={async (data) => {
              try {
                if (editingTareaId) {
                  await tareasEspecialesApi.updateTipo(editingTareaId, data);
                } else {
                  await tareasEspecialesApi.createTipo(data);
                }
                setShowTareaForm(false);
                setEditingTareaId(null);
                setTareasLoading(true);
                const res = await tareasEspecialesApi.listTipos();
                setTareasEspeciales(res.data);
                setTareasLoading(false);
              } catch (err) {
                throw err;
              }
            }}
            onCancel={() => {
              setShowTareaForm(false);
              setEditingTareaId(null);
            }}
          />
        </div>
      )}

      {tareasLoading ? (
        <div className="loading">Cargando tareas especiales...</div>
      ) : tareasEspeciales.length === 0 ? (
        <div className="empty-state">No hay tareas especiales creadas</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Hora Inicio</th>
                  <th>Hora Fin</th>
                  <th>Días Aplicables</th>
                  <th>Frecuencia</th>
                  <th>Inhabilita Almuerzo</th>
                  <th>Fija Almuerzo</th>
                  <th>Franja Almuerzo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tareasEspeciales.map((tarea) => {
                  const diasNombres = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
                  const diasAplicables = diasNombres
                    .map((d, idx) => (tarea.dia_semana_aplicable?.includes(idx) ? d : null))
                    .filter(Boolean)
                    .join(', ');
                  const franjaAlmuerzo = franjas.find((f) => f.id === tarea.franja_almuerzo_id);
                  return (
                    <tr key={tarea.id}>
                      <td>{tarea.nombre}</td>
                      <td>{tarea.hora_inicio}</td>
                      <td>{tarea.hora_fin}</td>
                      <td>{diasAplicables || '–'}</td>
                      <td>{tarea.frecuencia === 'quincenal' ? 'Quincenal' : 'Semanal'}</td>
                      <td>{tarea.inhabilita_almuerzo ? 'Sí' : 'No'}</td>
                      <td>{tarea.fija_almuerzo ? 'Sí' : 'No'}</td>
                      <td>{franjaAlmuerzo ? `${franjaAlmuerzo.hora_inicio} - ${franjaAlmuerzo.hora_fin}` : '–'}</td>
                      <td>
                        <button
                          className="btn btn-small btn-info"
                          onClick={() => handleEditTarea(tarea)}
                          disabled={editingTareaId === tarea.id}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteTarea(tarea.id)}
                        >
                          Eliminar
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
            {tareasEspeciales.map((tarea) => {
              const diasNombres = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
              const diasAplicables = diasNombres
                .map((d, idx) => (tarea.dia_semana_aplicable?.includes(idx) ? d : null))
                .filter(Boolean)
                .join(', ');
              const franjaAlmuerzo = franjas.find((f) => f.id === tarea.franja_almuerzo_id);
              return (
                <div
                  key={tarea.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{tarea.nombre}</h4>
                        <p className="text-sm text-gray-500">
                          {tarea.hora_inicio} – {tarea.hora_fin}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-md transition"
                          onClick={() => handleEditTarea(tarea)}
                          disabled={editingTareaId === tarea.id}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="p-2 hover:bg-red-50 rounded-md transition"
                          onClick={() => handleDeleteTarea(tarea.id)}
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Días:</span>
                        <p className="font-medium text-gray-900">{diasAplicables || '–'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Frecuencia:</span>
                        <p className="font-medium text-gray-900">
                          {tarea.frecuencia === 'quincenal' ? 'Quincenal' : 'Semanal'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Inhabilita Almuerzo:</span>
                        <p className="font-medium text-gray-900">{tarea.inhabilita_almuerzo ? 'Sí' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Fija Almuerzo:</span>
                        <p className="font-medium text-gray-900">{tarea.fija_almuerzo ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                    {franjaAlmuerzo && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                        <span className="text-gray-500">Franja Almuerzo:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {franjaAlmuerzo.hora_inicio} - {franjaAlmuerzo.hora_fin}
                        </span>
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
};
