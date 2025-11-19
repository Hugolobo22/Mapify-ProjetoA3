// src/components/AuthPage.jsx
import React, { useState } from 'react'
import { loginUser, registerUser } from '../services/api'

export default function AuthPage({ onBack, onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    } catch (err) {
      setError(err.message || 'Erro na autenticação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="auth-layout">
        <div className="auth-hero">
          <h1>Mapify Turismo</h1>
          <p>
            Faça login ou crie sua conta para salvar pontos turísticos,
            registrar suas experiências e explorar a cidade de um jeito inteligente.
          </p>
          <button className="auth-back-btn" onClick={onBack}>
            ← Voltar para o mapa
          </button>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <button
              type="button"
              className={
                mode === 'login'
                  ? 'auth-tab-btn active'
                  : 'auth-tab-btn'
              }
              onClick={() => setMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              className={
                mode === 'register'
                  ? 'auth-tab-btn active'
                  : 'auth-tab-btn'
              }
              onClick={() => setMode('register')}
            >
              Criar conta
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-row">
                <label>Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Seu nome completo"
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

            {error && <div className="form-error">{error}</div>}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading
                ? 'Enviando...'
                : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
            </button>

            {mode === 'login' && (
              <p className="auth-hint">
                Ainda não tem conta? Clique em <b>Criar conta</b> para se cadastrar.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
