// src/components/PlaceDetailsModal.jsx
import React, { useMemo, useState, useEffect } from 'react'

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

const getUserKey = (user) => user?.email ?? user?.id ?? user?.name ?? null

export default function PlaceDetailsModal({
  place,
  reviews = [],
  onAddReview,
  onClose,
  onRoute,
  onClearRoute,
  hasRoute,
  routeInfo,
  user,
  onDeleteReview,
  visitedPlaces = [],
  onToggleVisited,
}) {
  const canReview = !!user
  const userKey = getUserKey(user)

  // review do usuário logado (se existir)
  const myReview = useMemo(() => {
    if (!userKey) return null
    return reviews.find((r) => {
      const reviewKey = r.userKey ?? r.userId ?? null
      return reviewKey === userKey
    }) || null
  }, [reviews, userKey])

  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')

  // sempre que mudar a review do usuário, sincroniza no formulário
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating ?? 5)
      setText(myReview.text ?? '')
    } else {
      setRating(5)
      setText('')
    }
  }, [myReview])

  const avg = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
  }, [reviews])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return

    if (!canReview) {
      alert('Faça login para avaliar este local.')
      return
    }

    const authorName = user?.name?.trim() || 'Visitante'

    onAddReview?.({
      author: authorName,
      rating: Number(rating),
      text: text.trim(),
      ts: Date.now(),
    })
  }

  const handleEditClick = (review) => {
    setRating(review.rating ?? 5)
    setText(review.text ?? '')
  }

  const handleDeleteClick = () => {
    if (!canReview) return
    if (!window.confirm('Tem certeza que deseja remover sua avaliação?')) return
    onDeleteReview?.()
  }

  if (!place) return null

  // cartão postal / visitado
  const isVisited = visitedPlaces.includes(place.id)

  // ====== INFO DE DISTÂNCIA / TEMPO ======
  let distanceMeters = null
  let distanceKm = null
  let walkTimeMin = null
  let carTimeMin = null

  if (routeInfo && typeof routeInfo.distance === 'number') {
    distanceMeters = routeInfo.distance
    distanceKm = distanceMeters / 1000
    walkTimeMin = Math.round((routeInfo.duration || 0) / 60)
    carTimeMin = Math.round((distanceKm / 40) * 60)
  } else if (typeof place.dist === 'number') {
    distanceMeters = place.dist
    distanceKm = distanceMeters / 1000
    walkTimeMin = Math.round((distanceKm / 5) * 60)
    carTimeMin = Math.round((distanceKm / 40) * 60)
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

          {/* ====== CARTÃO POSTAL ====== */}
          <div className="modal-section">
            <strong>Cartão postal: </strong>
            {canReview ? (
              <>
                {isVisited ? (
                  <>
                    Você já visitou este local{' '}
                    <button
                      type="button"
                      className="tag-btn tag-btn-danger"
                      onClick={() => onToggleVisited?.(place.id)}
                    >
                      Remover dos visitados
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="tag-btn"
                    onClick={() => onToggleVisited?.(place.id)}
                  >
                    Marcar como visitado
                  </button>
                )}
              </>
            ) : (
              <span style={{ color: '#666' }}>
                faça login para marcar como visitado.
              </span>
            )}
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
              {reviews.map((r, idx) => {
                const reviewKey = r.userKey ?? r.userId ?? null
                const isMine = userKey && reviewKey === userKey
                return (
                  <li key={idx} className="review-item">
                    <div className="review-avatar">
                      {r.author?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="review-content">
                      <div className="review-head">
                        <span className="review-author">{r.author}</span>
                        <span className="review-stars">★{r.rating}</span>
                        {isMine && (
                          <div className="review-actions-inline">
                            <button
                              type="button"
                              className="review-action-btn"
                              onClick={() => handleEditClick(r)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="review-action-btn review-action-btn--danger"
                              onClick={handleDeleteClick}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="review-text">{r.text}</div>
                      <div className="review-date">
                        {new Date(r.ts).toLocaleString()}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* ====== FORM NOVA AVALIAÇÃO / EDIÇÃO ====== */}
        <form className="modal-form" onSubmit={submit}>
          {!canReview && (
            <p style={{ marginBottom: 8, fontSize: '.85rem', color: '#666' }}>
              Faça login para deixar sua avaliação.
            </p>
          )}

          <div className="form-row form-row-inline">
            <div style={{ flex: 1 }}>
              <label>Nota</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                disabled={!canReview}
              >
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
              disabled={!canReview}
              placeholder={
                canReview
                  ? myReview
                    ? 'Atualize sua avaliação sobre este local'
                    : `Como foi sua experiência, ${user.name}?`
                  : 'Entre para deixar sua opinião sobre este local'
              }
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={!canReview}>
              {myReview ? 'Salvar alterações' : 'Enviar avaliação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
