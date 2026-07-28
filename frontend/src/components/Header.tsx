import React from 'react'
import { Colaborador } from '../api/auth'
import './Header.css'

interface HeaderProps {
  user: Colaborador
  isAdmin: boolean
  onLogout: () => void
}

export const Header: React.FC<HeaderProps> = ({ user, isAdmin, onLogout }) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="logo">🍽️ Almuerzos</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.nombre}</span>
            <span className={`user-role badge badge-${user.sector}`}>
              {user.sector}
            </span>
            {isAdmin && <span className="admin-badge">Administrador</span>}
          </div>
          <button className="btn-logout" onClick={onLogout}>
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
