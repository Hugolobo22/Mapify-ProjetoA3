import React, { useState } from 'react'

export default function PlaceCreateModal({ coords, onSave, onClose }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Ponto turístico')
  const [address, setAddress] = useState('')

  if (!coords) return null

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave?.({
      name: name.trim(),
      type: type.trim() || 'Ponto turístico',
      address: address.trim() || undefined,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Novo ponto turístico</h3>
            <div className="modal-sub">
              Latitude: {coords.lat.toFixed(5)} • Longitude: {coords.lon.toFixed(5)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="modal-form" onSubmit={submit}>
          <div className="form-row">
            <label>Nome do local *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mirante do Sol"
              required
            />
          </div>

          <div className="form-row">
            <label>Tipo / categoria</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Ex: Praça, Museu, Mirante..."
            />
          </div>

          <div className="form-row">
            <label>Endereço (opcional)</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro..."
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} style={{ marginRight: 8, background: '#ccc', color: '#333' }}>
              Cancelar
            </button>
            <button type="submit">
              Salvar ponto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
