import { useBarometro } from '../hooks/useBarometro'

const gradients = {
  verde: 'linear-gradient(135deg, #059669, #10b981)',
  amarillo: 'linear-gradient(135deg, #d97706, #f59e0b)',
  rojo: 'linear-gradient(135deg, #dc2626, #ef4444)',
}

const stateLabels = {
  verde: 'Cobertura normal',
  amarillo: 'Atención requerida',
  rojo: 'Cobertura crítica',
}

const stateEmojis = {
  verde: '✓',
  amarillo: '⚠',
  rojo: '✗',
}

const franjaStateColors = {
  ok: { bg: 'rgba(255,255,255,.12)', text: 'rgba(255,255,255,.9)' },
  riesgo: { bg: 'rgba(255,255,255,.08)', text: 'rgba(255,255,255,.7)' },
  critico: { bg: 'rgba(220,38,38,.4)', text: '#fff' },
}

export function Barometro() {
  const { barometro, loading, error } = useBarometro()

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(79,70,229,.08)', border: '1.5px solid rgba(79,70,229,.1)' }}>
        <div className="h-4 bg-indigo-100 rounded w-32 mb-2" />
        <div className="h-3 bg-indigo-100 rounded w-24" />
      </div>
    )
  }

  if (error || !barometro) {
    return (
      <div className="rounded-2xl p-5 bg-gray-50" style={{ border: '1.5px solid rgba(0,0,0,.05)' }}>
        <p className="text-sm text-gray-400">{error ? 'Error al cargar cobertura' : 'Sin datos de cobertura'}</p>
      </div>
    )
  }

  const gradient = gradients[barometro.estado]
  const label = stateLabels[barometro.estado]
  const emoji = stateEmojis[barometro.estado]

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
  const todayStr = today.charAt(0).toUpperCase() + today.slice(1)

  const franjaTotal = barometro.franjas.length
  const franjaOk = barometro.franjas.filter(f => f.estado === 'ok').length
  const coberturaPct = franjaTotal > 0 ? Math.round((franjaOk / franjaTotal) * 100) : 0

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: gradient, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}
    >
      {/* Decorative circle */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 200, height: 200, top: -60, right: -40, background: 'radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Cobertura hoy</p>
        <p className="text-white font-bold text-base mt-0.5 tracking-tight">{todayStr}</p>

        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
            <div className="text-2xl font-extrabold text-white tracking-tight">{barometro.franjas.length}</div>
            <div className="text-xs text-white/65 mt-0.5">Franjas activas</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.12)' }}>
            <div className="text-2xl font-extrabold text-white tracking-tight">{emoji} {label.split(' ')[0]}</div>
            <div className="text-xs text-white/65 mt-0.5">{barometro.incidencias_activas} incidencias</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-white/65">Franjas OK</span>
            <span className="text-xs font-bold text-white">{coberturaPct}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${coberturaPct}%`, background: 'rgba(255,255,255,.85)' }}
            />
          </div>
        </div>

        {/* Franjas grid */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {barometro.franjas.map((franja) => {
            const fc = franjaStateColors[franja.estado]
            return (
              <div
                key={franja.orden}
                className="rounded-lg px-2 py-1 text-center"
                style={{ background: fc.bg, minWidth: 52 }}
              >
                <div className="text-[11px] font-bold" style={{ color: fc.text }}>{franja.hora}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,.6)' }}>
                  C:{franja.comercial_libre} O:{franja.operativo_libre}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
