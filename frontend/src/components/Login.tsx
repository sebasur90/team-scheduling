import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

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
    <div className="login-container">
      <div className="login-card">
        <h1>Gestión de Turnos de Almuerzo</h1>
        <p className="subtitle">Ingresa tu email para continuar</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!email.trim() || isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="info-text">
          Inicia sesión con tu email registrado para acceder al sistema.
        </p>
      </div>
    </div>
  )
}
