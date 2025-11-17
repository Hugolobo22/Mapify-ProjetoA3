// src/components/AuthModal.jsx
import React, { useState } from 'react'
import { loginUser, registerUser } from '../services/api'

export default function AuthModal({ open, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        const res = await registerUser({ name, email, password })
        onAuthSuccess(res.user, res.token)
      } else {
        const res = await loginUser({ email, password })
        onAuthSuccess(res.user, res.token)
      }
      resetForm()
    } catch (err) {
      setError(err.message || 'Erro na autenticação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: '0 0 4px 0' }}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </h3>
            <div className="modal-sub">
              {mode === 'login'
                ? 'Acesse sua conta para salvar pontos turísticos.'
                : 'Crie sua conta para salvar e gerenciar seus pontos.'}
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-section">
          <div className="auth-toggle">
            <button
              type="button"
              className={mode === 'login' ? 'auth-toggle-btn active' : 'auth-toggle-btn'}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'auth-toggle-btn active' : 'auth-toggle-btn'}
              onClick={() => setMode('register')}
            >
              Cadastro
            </button>
          </div>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-row">
              <label>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="form-row">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="voce@exemplo.com"
            />
          </div>

          <div className="form-row">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading
                ? 'Enviando...'
                : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
