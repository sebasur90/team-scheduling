import { useBarometro } from '../hooks/useBarometro'

export function Barometro() {
  const { barometro, loading, error } = useBarometro()

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 text-gray-600">
        Cargando barometro...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-600">
        Error: {error}
      </div>
    )
  }

  if (!barometro) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 text-gray-600">
        Sin datos
      </div>
    )
  }

  const stateStyles = {
    verde: {
      border: 'border-l-4 border-green-500',
      bg: 'bg-green-50',
      indicator: 'bg-green-500',
      glow: 'shadow-lg shadow-green-400/50',
    },
    amarillo: {
      border: 'border-l-4 border-amber-500',
      bg: 'bg-amber-50',
      indicator: 'bg-amber-500',
      glow: 'shadow-lg shadow-amber-400/50',
    },
    rojo: {
      border: 'border-l-4 border-red-500',
      bg: 'bg-red-50',
      indicator: 'bg-red-500',
      glow: 'shadow-lg shadow-red-400/50',
    },
  }

  const styles = stateStyles[barometro.estado]

  const stateLabel = {
    verde: '✓ VERDE',
    amarillo: '⚠ AMARILLO',
    rojo: '✗ ROJO',
  }[barometro.estado]

  const franjaStyles = {
    ok: { border: 'border-green-500', bg: 'bg-green-50' },
    riesgo: { border: 'border-amber-500', bg: 'bg-amber-50' },
    critico: { border: 'border-red-500', bg: 'bg-red-50' },
  }

  return (
    <div className={`${styles.border} ${styles.bg} rounded-lg p-4 mb-6`}>
      {/* Header con indicador */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full ${styles.indicator} ${styles.glow}`}></div>
        <div className="flex-1">
          <div className="font-bold text-lg text-gray-900">{stateLabel}</div>
          <div className="text-sm text-gray-600">{barometro.incidencias_activas} incidencias</div>
        </div>
      </div>

      {/* Grid de franjas */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {barometro.franjas.map((franja) => {
          const style = franjaStyles[franja.estado]
          return (
            <div
              key={franja.orden}
              className={`${style.border} ${style.bg} border rounded p-2 text-center text-xs`}
            >
              <div className="font-bold text-gray-900">{franja.hora}</div>
              <div className="text-lg">
                {franja.estado === 'ok' && '✓'}
                {franja.estado === 'riesgo' && '⚠'}
                {franja.estado === 'critico' && '✗'}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                C:{franja.comercial_libre} O:{franja.operativo_libre}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
