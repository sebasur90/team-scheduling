import React, { useState } from 'react'
import { swapsApi } from '../api/swaps'
import { AsignacionResponse } from '../api/turnos'

interface Props {
  asignacionOrigen: AsignacionResponse
  asignacionReceptor: AsignacionResponse
  receptorNombre: string
  franjaOrigen: string
  franjaReceptor: string
  fecha: string
  onClose: () => void
  onSuccess: () => void
}

export const SwapConfirmModal: React.FC<Props> = ({
  asignacionOrigen,
  asignacionReceptor,
  receptorNombre,
  franjaOrigen,
  franjaReceptor,
  fecha,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fechaLegible = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleConfirmar = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await swapsApi.create(asignacionOrigen.id, asignacionReceptor.id)
      onSuccess()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Error al solicitar el intercambio')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Solicitar intercambio</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Fecha</span>
            <span className="text-sm text-gray-900">{fechaLegible}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Tu turno</span>
            <span className="text-sm font-semibold text-sky-700">{franjaOrigen}</span>
          </div>

          <div className="flex justify-center py-2">
            <span className="text-2xl">⇅</span>
          </div>

          <div className="flex justify-between items-start py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Turno de</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{receptorNombre}</div>
              <div className="text-xs text-sky-700">{franjaReceptor}</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {isLoading ? 'Enviando...' : 'Confirmar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
