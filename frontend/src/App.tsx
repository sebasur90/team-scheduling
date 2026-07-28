import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import './App.css'

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    // Registrar service worker para push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado:', reg);
          // Solicitar permiso para notificaciones
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        })
        .catch((err) => console.error('Error registrando Service Worker:', err));
    }
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Dashboard />
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
