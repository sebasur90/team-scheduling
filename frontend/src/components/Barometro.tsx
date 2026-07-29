import { useBarometro } from '../hooks/useBarometro';
import './Barometro.css';

export function Barometro() {
  const { barometro, loading, error } = useBarometro();

  if (loading) {
    return <div className="barometro barometro--loading">Cargando barometro...</div>;
  }

  if (error) {
    return <div className="barometro barometro--error">Error: {error}</div>;
  }

  if (!barometro) {
    return <div className="barometro barometro--empty">Sin datos</div>;
  }

  const colorClass = `barometro--${barometro.estado}`;
  const stateLabel = {
    verde: '✓ VERDE',
    amarillo: '⚠ AMARILLO',
    rojo: '✗ ROJO',
  }[barometro.estado];

  return (
    <div className={`barometro ${colorClass}`}>
      <div className="barometro__circle">
        <div className="barometro__indicator"></div>
        <span className="barometro__label">{stateLabel}</span>
        <span className="barometro__count">{barometro.incidencias_activas} incidencias</span>
      </div>

      <div className="barometro__franjas">
        {barometro.franjas.map((franja) => (
          <div key={franja.orden} className={`franja franja--${franja.estado}`}>
            <div className="franja__time">{franja.hora}</div>
            <div className="franja__status">
              {franja.estado === 'ok' && '✓'}
              {franja.estado === 'riesgo' && '⚠'}
              {franja.estado === 'critico' && '✗'}
            </div>
            <div className="franja__coverage">
              C:{franja.comercial_libre} O:{franja.operativo_libre}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
