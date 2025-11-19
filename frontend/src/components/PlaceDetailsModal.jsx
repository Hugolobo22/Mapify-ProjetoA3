// src/components/PlaceDetailsModal.jsx
import React, { useMemo, useState } from 'react'

function Stars({ value = 0 }) {
  const full = Math.round(value)
  return (
    <span
      className="stars-display"
      aria-label={`nota ${value.toFixed(1)} de 5`}
      title={`${value.toFixed(1)} / 5`}
    >
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  )
}

export default function PlaceDetailsModal({
  place,
  reviews = [],
  onAddReview,
  onClose,
  onRoute,        // chamada pra traçar rota
  onClearRoute,   // chamada pra limpar rota
  hasRoute,       // true/false se a rota está ativa
  routeInfo,      // { distance: m, duration: s } opcional
}) {
  const [author, setAuthor] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')

  const avg = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
  }, [reviews])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddReview?.({
      author: author.trim() || 'Anônimo',
      rating: Number(rating),
      text: text.trim(),
      ts: Date.now(),
    })
    setAuthor('')
    setRating(5)
    setText('')
  }

  if (!place) return null

  // ====== INFO DE DISTÂNCIA / TEMPO ======
  let distanceMeters = null
  let distanceKm = null
  let walkTimeMin = null
  let carTimeMin = null

  if (routeInfo && typeof routeInfo.distance === 'number') {
    // dados reais da rota (OSRM / OpenRouteService etc.)
    distanceMeters = routeInfo.distance
    distanceKm = distanceMeters / 1000
    walkTimeMin = Math.round((routeInfo.duration || 0) / 60) // duração real em segundos
    // carro: aproximação simples
    carTimeMin = Math.round((distanceKm / 40) * 60) // 40 km/h
  } else if (typeof place.dist === 'number') {
    // fallback usando place.dist, como era antes
    distanceMeters = place.dist
    distanceKm = distanceMeters / 1000
    walkTimeMin = Math.round((distanceKm / 5) * 60)   // 5 km/h
    carTimeMin = Math.round((distanceKm / 40) * 60)   // 40 km/h
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{place.name}</h3>
            <div className="modal-sub">
              {(place.kinds || place.type || '').toString()}
              {distanceMeters != null ? ` • ${Math.round(distanceMeters)} m` : ''}
              {place.address ? ` • ${place.address}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* ====== SEÇÃO ROTA ====== */}
          <div className="modal-section route-section">
            <div className="route-info">
              {distanceKm != null ? (
                <>
                  <div className="route-distance">
                    Distância aproximada: {distanceKm.toFixed(2)} km
                  </div>
                  <div className="route-times">
                    {walkTimeMin != null && (
                      <>
                        {walkTimeMin} min a pé
                        {carTimeMin != null && ` • ${carTimeMin} min de carro (estimado)`}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="route-distance">Distância indisponível</div>
              )}
            </div>

            <div className="route-actions">
              {!hasRoute ? (
                <button
                  type="button"
                  className="route-btn"
                  onClick={onRoute}
                >
                  Traçar rota
                </button>
              ) : (
                <button
                  type="button"
                  className="route-btn route-btn-secondary"
                  onClick={onClearRoute}
                >
                  Limpar rota
                </button>
              )}
            </div>
          </div>

          {/* ====== AVALIAÇÕES ====== */}
          <div className="modal-section">
            <strong>Avaliações:</strong>{' '}
            <Stars value={avg} />{' '}
            {reviews.length ? (
              <span className={avg ? 'rating-pill' : 'rating-pill rating-pill--empty'}>
                {avg.toFixed(1)} ({reviews.length} avaliações)
              </span>
            ) : (
              <span className="rating-pill rating-pill--empty">(sem avaliações)</span>
            )}
          </div>

          {/* ====== COMENTÁRIOS ====== */}
          <div className="modal-section">
            <strong>Comentários</strong>
            {reviews.length === 0 && (
              <p style={{ marginTop: 6, color: '#666' }}>Ainda não há comentários.</p>
            )}
            <ul className="reviews-list">
              {reviews.map((r, idx) => (
                <li key={idx} className="review-item">
                  <div className="review-avatar">
                    {r.author?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="review-content">
                    <div className="review-head">
                      <span className="review-author">{r.author}</span>
                      <span className="review-stars">★{r.rating}</span>
                    </div>
                    <div className="review-text">{r.text}</div>
                    <div className="review-date">
                      {new Date(r.ts).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ====== FORM NOVA AVALIAÇÃO ====== */}
        <form className="modal-form" onSubmit={submit}>
          <div className="form-row">
            <label>Seu nome</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="form-row form-row-inline">
            <div style={{ flex: 1 }}>
              <label>Nota</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label>Comentário</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              required
              placeholder="Como foi sua experiência?"
            />
          </div>

          <div className="form-actions">
            <button type="submit">Enviar avaliação</button>
          </div>
        </form>
      </div>
    </div>
  )
}
