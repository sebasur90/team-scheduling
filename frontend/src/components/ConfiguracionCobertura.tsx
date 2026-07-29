import React, { useState, useEffect } from 'react';
import { configuracionApi, type ConfiguracionCobertura, type ConfiguracionCoberturaUpdate } from '../api/configuracion';

export function ConfiguracionCobertura() {
  const [config, setConfig] = useState<ConfiguracionCobertura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minimo_tipo_a, setMinimoTipoA] = useState<number>(1);
  const [minimo_tipo_b, setMinimoTipoB] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await configuracionApi.getCobertura();
        setConfig(response.data);
        setMinimoTipoA(response.data.minimo_tipo_a);
        setMinimoTipoB(response.data.minimo_tipo_b);
      } catch (err) {
        setError('Error al cargar la configuración de cobertura');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    // Validate inputs
    if (minimo_tipo_a < 0 || minimo_tipo_b < 0) {
      setError('Los mínimos no pueden ser negativos');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const data: ConfiguracionCoberturaUpdate = {
        minimo_tipo_a,
        minimo_tipo_b,
      };

      const response = await configuracionApi.updateCobertura(data);
      setConfig(response.data);
      setSuccess('Configuración actualizada correctamente');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al guardar la configuración');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="configuracion-container">Cargando configuración...</div>;
  }

  return (
    <div className="configuracion-container">
      <h2>Configuración de Cobertura</h2>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✓ {success}
        </div>
      )}

      <div className="configuracion-form">
        <div className="form-group">
          <label htmlFor="minimo_tipo_a">
            Mínimo Tipo A (Comercial):
          </label>
          <input
            id="minimo_tipo_a"
            type="number"
            min="0"
            max="99"
            value={minimo_tipo_a}
            onChange={(e) => setMinimoTipoA(parseInt(e.target.value) || 0)}
            disabled={saving}
          />
          <small>Mínimo requerido de colaboradores tipo_a por franja</small>
        </div>

        <div className="form-group">
          <label htmlFor="minimo_tipo_b">
            Mínimo Tipo B (Operativo):
          </label>
          <input
            id="minimo_tipo_b"
            type="number"
            min="0"
            max="99"
            value={minimo_tipo_b}
            onChange={(e) => setMinimoTipoB(parseInt(e.target.value) || 0)}
            disabled={saving}
          />
          <small>Mínimo requerido de colaboradores tipo_b por franja</small>
        </div>
      </div>

      <div className="configuracion-actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {config && (
        <div className="configuracion-info">
          <p>
            <strong>Última actualización:</strong>{' '}
            {new Date(config.updated_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
