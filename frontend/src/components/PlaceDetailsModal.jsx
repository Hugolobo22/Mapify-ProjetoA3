import React, { useMemo, useState } from 'react'

function Stars({ value = 0 }) {
  const full = Math.round(value)
  return (
    <span
      className="stars-display"
      aria-label={`nota ${value.toFixed(1)} de 5`}
      title={`${value.toFixed(1)} / 5`}
    >
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

export default function PlaceDetailsModal({ place, reviews = [], onAddReview, onClose }) {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEAD */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{place.name}</h3>
            <div className="modal-sub">
              {(place.kinds || place.type || '').toString()}
              {place.dist ? ` • ${Math.round(place.dist)} m` : ''}
              {place.address ? ` • ${place.address}` : ''}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* CORPO SCROLLÁVEL */}
        <div className="modal-body">
          <div className="modal-section">
            <strong>Avaliações:</strong>{' '}
            <Stars value={avg} />{' '}
            {reviews.length ? (
              <span className="rating-pill">{avg.toFixed(1)} / 5 • {reviews.length} avaliação(ões)</span>
            ) : (
              <span className="rating-pill rating-pill--empty">sem avaliações ainda</span>
            )}
          </div>

          <div className="modal-section">
            <strong>Comentários</strong>
            {reviews.length === 0 && (
              <p style={{ marginTop: 6, color: '#666' }}>Seja o primeiro a comentar 😊</p>
            )}

            <ul className="reviews-list">
              {reviews.map((r, idx) => {
                const firstLetter = (r.author || 'A').trim().charAt(0).toUpperCase()
                return (
                  <li key={idx} className="review-item">
                    <div className="review-avatar">{firstLetter}</div>
                    <div className="review-content">
                      <div className="review-head">
                        <span className="review-author">{r.author}</span>
                        <span className="review-stars">★ {r.rating}</span>
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

        {/* FORMULARIO FIXO EMBAIXO */}
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
            <div>
              <label>Nota</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n}</option>
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
              placeholder="Como foi sua experiência nesse local?"
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
