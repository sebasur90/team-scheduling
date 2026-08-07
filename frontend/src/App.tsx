import React, { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { SplashScreen } from './components/SplashScreen'
import './App.css'

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splash_shown'))

  useEffect(() => {
    sessionStorage.setItem('splash_shown', '1')
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
          }
        })
        .catch(() => {})
    }
  }, [])

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />
  }

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #4f46e5, #7c3aed)' }}
      >
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />
  return <Dashboard />
}

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
)

export default App
