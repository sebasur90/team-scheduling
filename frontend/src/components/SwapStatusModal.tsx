import React, { useState } from 'react'
import { swapsApi, SwapResponse } from '../api/swaps'

interface Props {
  swap: SwapResponse
  onClose: () => void
  onSuccess: () => void
}

export const SwapStatusModal: React.FC<Props> = ({ swap, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false)

  const fechaLegible = swap.fecha
    ? new Date(swap.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const handleCancelar = async () => {
    setIsLoading(true)
    try {
      await swapsApi.cancelar(swap.id)
      onSuccess()
    } catch (err: any) {
      console.error('Error cancelando swap:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Intercambio pendiente</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm text-amber-900">
              Solicitaste intercambiar con <strong>{swap.nombre_receptor}</strong>
            </p>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Fecha</span>
            <span className="text-sm text-gray-900">{fechaLegible}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Tu franja</span>
            <span className="text-sm font-semibold text-sky-700">{swap.franja_origen_hora || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-600">Su franja</span>
            <span className="text-sm font-semibold text-sky-700">{swap.franja_receptor_hora || '—'}</span>
          </div>

          <div className="flex items-center justify-center py-3">
            <div className="animate-pulse flex gap-1">
              <span className="text-amber-500">●</span>
              <span className="text-amber-500">●</span>
              <span className="text-amber-500">●</span>
            </div>
            <p className="ml-3 text-sm text-amber-700">Esperando respuesta...</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition"
          >
            Cerrar
          </button>
          <button
            onClick={handleCancelar}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {isLoading ? 'Cancelando...' : 'Cancelar swap'}
          </button>
        </div>
      </div>
    </div>
  )
}
