// src/components/ProfilePage.jsx
import React from 'react'

export default function ProfilePage({
  user,
  stats,
  onBackToMap,
  onLogout,
  onOpenSavedPlaces,
  onOpenReviewed,
  onOpenVisited,
}) {
  const level = stats.level ?? 1
  const xp = stats.xp ?? 0
  const currentLevelXp = stats.currentLevelXp ?? 0
  const xpToNext = stats.xpToNext ?? 200
  const savedPlaces = stats.savedPlaces ?? 0
  const reviewedPlacesCount = stats.reviewedPlacesCount ?? 0
  const visitedCount = stats.visitedCount ?? 0

  const progressPercent = Math.min(
    100,
    Math.round((currentLevelXp / xpToNext) * 100)
  )

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  return (
    <div className="profile-page">
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">Seu perfil — Mapify Turismo</h1>
        </div>
        <div className="topbar-right">
          <button className="login-btn" onClick={onBackToMap}>
            ← Voltar para o mapa
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="profile-main">
        <section className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {initials}
            </div>
            <div className="profile-info">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="profile-level-badge">Nível {level}</span>
            </div>
          </div>

          <div className="profile-xp-block">
            <div className="profile-xp-label">
              XP total: {xp} • Próximo nível em {xpToNext - currentLevelXp} XP
            </div>
            <div className="profile-xp-bar">
              <div
                className="profile-xp-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="profile-stats-grid">
            <div className="profile-stat-card" onClick={onOpenSavedPlaces}>
              <span className="profile-stat-label">Locais criados</span>
              <span className="profile-stat-value">{savedPlaces}</span>
            </div>

            <div className="profile-stat-card" onClick={onOpenReviewed}>
              <span className="profile-stat-label">Locais avaliados</span>
              <span className="profile-stat-value">{reviewedPlacesCount}</span>
            </div>

            <div className="profile-stat-card" onClick={onOpenVisited}>
              <span className="profile-stat-label">Pontos turísticos visitados</span>
              <span className="profile-stat-value">{visitedCount}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
