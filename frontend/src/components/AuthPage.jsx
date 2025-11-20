// src/components/AuthPage.jsx
import React, { useState } from 'react'
import { loginUser, registerUser, requestPasswordReset } from '../services/api'

export default function AuthPage({ onBack, onAuthSuccess }) {
  // 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await registerUser({ name, email, password })
        onAuthSuccess(res.user, res.token)
      } else if (mode === 'login') {
        const res = await loginUser({ email, password })
        onAuthSuccess(res.user, res.token)
      } else if (mode === 'forgot') {
        await requestPasswordReset({ email })
        setInfo(
          'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
        )
      }
    } catch (err) {
      setError(err.message || 'Erro na autenticação')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    setMode('login')
    setError('')
    setInfo('')
    setPassword('')
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
          {/* Tabs só para login/cadastro */}
          {mode !== 'forgot' ? (
            <div className="auth-card-header">
              <button
                type="button"
                className={mode === 'login' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => {
                  setMode('login')
                  setError('')
                  setInfo('')
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'auth-tab-btn active' : 'auth-tab-btn'}
                onClick={() => {
                  setMode('register')
                  setError('')
                  setInfo('')
                }}
              >
                Criar conta
              </button>
            </div>
          ) : (
            <div className="auth-card-header">
              <button type="button" className="auth-tab-btn active">
                Recuperar senha
              </button>
            </div>
          )}

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

            {mode !== 'forgot' && (
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
            )}

            {error && <div className="form-error">{error}</div>}
            {info && !error && <div className="form-info">{info}</div>}

            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading
                ? 'Enviando...'
                : mode === 'login'
                ? 'Entrar'
                : mode === 'register'
                ? 'Criar conta'
                : 'Enviar link de recuperação'}
            </button>

            {/* Textos auxiliares / links */}
            {mode === 'login' && (
              <>
                <p className="auth-hint">
                  Ainda não tem conta? Clique em <b>Criar conta</b> para se cadastrar.
                </p>
                <p className="auth-hint">
                  Esqueceu sua senha?{' '}
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => {
                      setMode('forgot')
                      setError('')
                      setInfo('')
                    }}
                  >
                    Recuperar acesso
                  </button>
                </p>
              </>
            )}

            {mode === 'forgot' && (
              <p className="auth-hint">
                Informe seu e-mail e enviaremos instruções para redefinir sua senha.{' '}
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={goToLogin}
                >
                  Voltar para login
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p className="auth-hint">
                Já tem conta?{' '}
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={goToLogin}
                >
                  Entrar
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
