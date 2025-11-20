// src/components/ReviewedPlacesPage.jsx
import React from 'react'

export default function ReviewedPlacesPage({ reviews = [], places, onBackToMap }) {
  // junta review + place real
  const mapped = reviews
    .map((item) => ({
      ...item,
      place: places.find((p) => p.id === item.placeId),
    }))
    .filter((x) => x.place)

  return (
    <div className="reviewed-page">
      {/* Topbar reaproveitando o estilo de outras páginas do projeto */}
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">Locais avaliados</h1>
        </div>
        <div className="topbar-right">
          <button className="login-btn" onClick={onBackToMap}>
            ← Voltar para o perfil
          </button>
        </div>
      </header>

      <main className="reviewed-main">
        <section className="reviewed-content">
          {mapped.length === 0 ? (
            <p className="reviewed-empty">
              Você ainda não avaliou nenhum local. Que tal explorar o mapa e deixar
              sua opinião nos pontos turísticos?
            </p>
          ) : (
            <div className="reviewed-grid">
              {mapped.map(({ place, review }, i) => (
                <article key={`${place.id}-${i}`} className="reviewed-card">
                  <div className="reviewed-card-header">
                    <h3 className="reviewed-place-name">{place.name}</h3>
                    <span className="reviewed-rating">
                      <span className="reviewed-rating-value">
                        {Number(review.rating).toFixed(1)}
                      </span>
                      <span className="reviewed-rating-star">★</span>
                    </span>
                  </div>

                  {place.address && (
                    <p className="reviewed-address">{place.address}</p>
                  )}

                  <p className="reviewed-text">
                    {review.text || 'Sem comentário escrito.'}
                  </p>

                  <div className="reviewed-card-footer">
                    <span className="reviewed-date">
                      Avaliado em {new Date(review.ts).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
