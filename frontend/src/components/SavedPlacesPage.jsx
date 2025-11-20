// src/components/SavedPlacesPage.jsx
import React, { useState } from 'react'

function SavedPlaceModal({ place, onClose }) {
  if (!place) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{place.name}</h3>
            <div className="modal-sub">
              {(place.type || '').toString()}
              {place.address ? ` • ${place.address}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {place.imageUrl && (
            <div className="saved-modal-image">
              <img src={place.imageUrl} alt={place.name} />
            </div>
          )}

          {place.description && (
            <p className="saved-modal-description">{place.description}</p>
          )}

          {!place.description && !place.imageUrl && (
            <p className="saved-modal-empty">
              Nenhuma descrição ou foto cadastrada para este local ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SavedPlacesPage({ user, places, onBackToMap, onLogout }) {
  const [selected, setSelected] = useState(null)

  const title = user
    ? `Locais salvos de ${user.name.split(' ')[0]}`
    : 'Locais salvos'

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <h1 className="profile-title">{title}</h1>
        <div className="profile-header-actions">
          <button className="profile-back-btn" onClick={onBackToMap}>
            ← Voltar para o mapa
          </button>
          <button className="profile-logout-btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="profile-main">
        <section className="saved-section">
          {places.length === 0 ? (
            <p className="saved-empty">
              Você ainda não salvou nenhum local. No mapa, clique com o{' '}
              <b>botão direito</b> para criar um ponto turístico e ele aparecerá
              aqui.
            </p>
          ) : (
            <div className="saved-grid">
              {places.map((p) => (
                <article
                  key={p.id}
                  className="saved-card"
                  onClick={() => setSelected(p)}
                >
                  <div className="saved-card-image">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} />
                    ) : (
                      <div className="saved-card-placeholder">
                        <span>{p.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="saved-card-body">
                    <h3>{p.name}</h3>
                    <p className="saved-card-type">
                      {p.type || 'Sem categoria'}
                    </p>
                    {p.address && (
                      <p className="saved-card-address">{p.address}</p>
                    )}
                    {p.description && (
                      <p className="saved-card-description">
                        {p.description.length > 110
                          ? p.description.slice(0, 107) + '...'
                          : p.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <SavedPlaceModal place={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
