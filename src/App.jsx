import React, { useState, useEffect, useMemo, useCallback } from 'react'
import MapView from './components/MapView'
import { fetchNearbyPlaces } from './services/places'
import PlaceDetailsModal from './components/PlaceDetailsModal'
import PlaceCreateModal from './components/PlaceCreateModal'

const LS_PLACES = 'custom_places_v1'
const LS_REVIEWS = 'place_reviews_v1' // { [placeId]: Review[] }

export default function App() {
  const [position, setPosition] = useState(null)
  const [apiPlaces, setApiPlaces] = useState([])
  const [customPlaces, setCustomPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [radius, setRadius] = useState(1000)

  // Modal de detalhes
  const [selectedPlace, setSelectedPlace] = useState(null)
  // Modal de criação (coords do clique direito)
  const [creatingCoords, setCreatingCoords] = useState(null)

  // Reviews
  const [reviewsByPlace, setReviewsByPlace] = useState({})

  // carregar custom + reviews
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_PLACES) || '[]')
      setCustomPlaces(Array.isArray(saved) ? saved : [])
    } catch {
      setCustomPlaces([])
    }

    try {
      const rv = JSON.parse(localStorage.getItem(LS_REVIEWS) || '{}')
      setReviewsByPlace(rv && typeof rv === 'object' ? rv : {})
    } catch {
      setReviewsByPlace({})
    }
  }, [])

  // persistência
  useEffect(() => {
    localStorage.setItem(LS_PLACES, JSON.stringify(customPlaces))
  }, [customPlaces])

  useEffect(() => {
    localStorage.setItem(LS_REVIEWS, JSON.stringify(reviewsByPlace))
  }, [reviewsByPlace])

  // geolocalização
  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo navegador.')
      setPosition({ lat: -23.55052, lng: -46.633308 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        console.error(err)
        alert('Não foi possível obter a localização. Usando localização padrão.')
        setPosition({ lat: -23.55052, lng: -46.633308 })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // ====== BUSCA NA API, REUTILIZÁVEL ======
  const fetchPlacesFromApi = useCallback(() => {
    if (!position) return
    setLoadingPlaces(true)
    fetchNearbyPlaces(position.lat, position.lng, radius)
      .then((res) => setApiPlaces(res))
      .catch((err) => {
        console.error(err)
        alert('Erro ao buscar pontos turísticos. Veja o console.')
      })
      .finally(() => setLoadingPlaces(false))
  }, [position, radius])

  // chama sempre que posição ou raio mudarem
  useEffect(() => {
    fetchPlacesFromApi()
  }, [fetchPlacesFromApi])

  // adicionar ponto custom (usado pelo modal de criação)
  const handleAddPlace = (place) => {
    const normalized = {
      id: place.id ?? `custom-${Date.now()}`,
      name: place.name || 'Novo ponto',
      lat: place.lat,
      lon: place.lon,
      type: place.type || 'custom',
      address: place.address,
      dist: place.dist,
    }
    setCustomPlaces((prev) => [normalized, ...prev])
  }

  // ====== FILTRAR PONTOS DA API PELO RAIO ======
  const filteredApiPlaces = useMemo(
    () =>
      apiPlaces.filter((p) => {
        if (p.dist == null) return true
        return p.dist <= radius
      }),
    [apiPlaces, radius]
  )

  // lista combinada (custom + API dentro do raio)
  const allPlaces = useMemo(
    () => [...customPlaces, ...filteredApiPlaces],
    [customPlaces, filteredApiPlaces]
  )

  // abrir/fechar modal de detalhes
  const openDetails = (p) => setSelectedPlace(p)
  const closeDetails = () => setSelectedPlace(null)

  // abrir modal de criação (chamado pelo MapView ao clicar com botão direito)
  const startCreatePlace = (coords) => {
    setCreatingCoords(coords)
  }

  // adicionar review
  const addReview = (review) => {
    if (!selectedPlace?.id) return
    setReviewsByPlace((prev) => {
      const arr = prev[selectedPlace.id] || []
      return { ...prev, [selectedPlace.id]: [review, ...arr] }
    })
  }

  const selectedReviews = selectedPlace ? reviewsByPlace[selectedPlace.id] || [] : []

  return (
    <div className="app-root">
      <header className="topbar">
        <h1>Site Turismo — Encontre pontos turísticos próximos</h1>
        <div className="controls">
          <label>
            Raio (m):
            <input
              type="range"
              min="200"
              max="5000"
              step="100"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            />
            <span>{radius} m</span>
          </label>
          <button onClick={fetchPlacesFromApi}>Atualizar</button>
        </div>
      </header>

      <main className="main-content">
        <MapView
          center={position}
          places={allPlaces}
          loadingPlaces={loadingPlaces}
          radius={radius}
          onRequestNewPlace={startCreatePlace}   // clique direito abre modal de criação
          onSelectPlace={openDetails}            // clique no marcador abre detalhes
        />

        <aside className="sidebar">
          <h2>Locais encontrados</h2>
          <p style={{ marginTop: 0, color: '#666', fontSize: '.9rem' }}>
            Dica: clique com o <b>botão direito</b> no mapa para adicionar um ponto.
          </p>

          {loadingPlaces && <p>Buscando pontos turísticos...</p>}
          {!loadingPlaces && allPlaces.length === 0 && <p>Nenhum local encontrado.</p>}

          <ul>
            {allPlaces.map((p) => (
              <li key={p.id} onClick={() => openDetails(p)} style={{ cursor: 'pointer' }}>
                <strong>{p.name}</strong>
                <div className="meta">
                  {(p.kinds || p.type || '').toString()} {p.dist ? `— ${Math.round(p.dist)} m` : ''}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="footer" />

      {/* Modal de detalhes */}
      {selectedPlace && (
        <PlaceDetailsModal
          place={selectedPlace}
          reviews={selectedReviews}
          onAddReview={addReview}
          onClose={closeDetails}
        />
      )}

      {/* Modal de criação de novo ponto */}
      {creatingCoords && (
        <PlaceCreateModal
          coords={creatingCoords}
          onClose={() => setCreatingCoords(null)}
          onSave={(data) => {
            // data: { name, type, address }
            handleAddPlace({
              ...data,
              lat: creatingCoords.lat,
              lon: creatingCoords.lon,
            })
            setCreatingCoords(null)
          }}
        />
      )}
    </div>
  )
}
