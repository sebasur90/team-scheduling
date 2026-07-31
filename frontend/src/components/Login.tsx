import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setError(null)
      setIsLoading(true)
      await login(email)
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tu email.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-sky-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏢 Organización</h1>
          <p className="text-gray-600">Gestión de Turnos de Almuerzo</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={!email.trim() || isLoading}
              className="w-full bg-sky-700 hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Inicia sesión con tu email registrado para acceder al sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
