// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import MapView from './components/MapView'
import { fetchNearbyPlaces } from './services/places'
import PlaceDetailsModal from './components/PlaceDetailsModal'
import PlaceCreateModal from './components/PlaceCreateModal'
import AuthModal from './components/AuthModal'
import { getPlaces, createPlace } from './services/api'

const LS_AUTH = 'mapify_auth_v1'
const LS_REVIEWS = 'place_reviews_v1' // { [placeId]: Review[] }

export default function App() {
  const [position, setPosition] = useState(null)
  const [apiPlaces, setApiPlaces] = useState([])
  const [backendPlaces, setBackendPlaces] = useState([]) // vindos do backend
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [radius, setRadius] = useState(1000)

  // Auth
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Modais de lugar
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState(null)

  // Reviews (segue local por enquanto)
  const [reviewsByPlace, setReviewsByPlace] = useState({})

  // carregar auth + reviews do localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_AUTH) || 'null')
      if (saved && saved.token && saved.user) {
        setToken(saved.token)
        setCurrentUser(saved.user)
      }
    } catch {
      // ignore
    }

    try {
      const rv = JSON.parse(localStorage.getItem(LS_REVIEWS) || '{}')
      setReviewsByPlace(rv && typeof rv === 'object' ? rv : {})
    } catch {
      setReviewsByPlace({})
    }
  }, [])

  // persistir auth
  useEffect(() => {
    if (token && currentUser) {
      localStorage.setItem(LS_AUTH, JSON.stringify({ token, user: currentUser }))
    } else {
      localStorage.removeItem(LS_AUTH)
    }
  }, [token, currentUser])

  // persistir reviews
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

  // busca na API externa
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

  useEffect(() => {
    fetchPlacesFromApi()
  }, [fetchPlacesFromApi])

  // carregar lugares do backend quando logar
  const loadBackendPlaces = useCallback(async () => {
    if (!token) {
      setBackendPlaces([])
      return
    }
    try {
      const data = await getPlaces(token)
      setBackendPlaces(data || [])
    } catch (err) {
      console.error('Erro ao buscar lugares do backend:', err)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadBackendPlaces()
    }
  }, [token, loadBackendPlaces])

  // ====== FILTRAR PONTOS DA API PELO RAIO ======
  const filteredApiPlaces = useMemo(
    () =>
      apiPlaces.filter((p) => {
        if (p.dist == null) return true
        return p.dist <= radius
      }),
    [apiPlaces, radius]
  )

  // lista combinada (backend + API)
  const allPlaces = useMemo(
    () => [...backendPlaces, ...filteredApiPlaces],
    [backendPlaces, filteredApiPlaces]
  )

  // abrir/fechar modal detalhes
  const openDetails = (p) => setSelectedPlace(p)
  const closeDetails = () => setSelectedPlace(null)

  // adicionar review
  const addReview = (review) => {
    if (!selectedPlace?.id) return
    setReviewsByPlace((prev) => {
      const arr = prev[selectedPlace.id] || []
      return { ...prev, [selectedPlace.id]: [review, ...arr] }
    })
  }

  const selectedReviews = selectedPlace ? reviewsByPlace[selectedPlace.id] || [] : []

  // clique com botão direito no mapa -> abrir modal criar
  const handleAddPlaceRequest = (placeDraft) => {
    if (!token) {
      alert('Faça login para salvar pontos turísticos.')
      setAuthModalOpen(true)
      return
    }
    setCreateDraft(placeDraft)
    setCreateModalOpen(true)
  }

  // confirmar criação no modal
  const handleConfirmCreatePlace = async (values) => {
    if (!token || !createDraft) return
    try {
      const payload = {
        name: values.name,
        type: values.type,
        address: values.address,
        lat: createDraft.lat,
        lon: createDraft.lon,
      }
      const created = await createPlace(payload, token)
      setBackendPlaces((prev) => [created, ...prev])
      setCreateModalOpen(false)
      setCreateDraft(null)
    } catch (err) {
      console.error('Erro ao criar lugar no backend:', err)
      alert(err.message || 'Erro ao criar lugar')
    }
  }

  // sucesso na autenticação
  const handleAuthSuccess = (user, tokenValue) => {
    setCurrentUser(user)
    setToken(tokenValue)
    setAuthModalOpen(false)
    loadBackendPlaces()
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setToken(null)
    setBackendPlaces([])
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
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
        </div>

        <div className="topbar-right">
          {currentUser ? (
            <div className="user-info">
              <span className="user-name">Olá, {currentUser.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                Sair
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setAuthModalOpen(true)}>
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <MapView
          center={position}
          places={allPlaces}
          loadingPlaces={loadingPlaces}
          radius={radius}
          onAddPlace={handleAddPlaceRequest} // botão direito chama isso
          onSelectPlace={openDetails}
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

      {/* Modal de criação de ponto */}
      {createModalOpen && createDraft && (
        <PlaceCreateModal
          open={createModalOpen}
          defaultValues={{
            name: '',
            type: '',
            address: '',
          }}
          onConfirm={handleConfirmCreatePlace}
          onClose={() => {
            setCreateModalOpen(false)
            setCreateDraft(null)
          }}
        />
      )}

      {/* Modal de login/cadastro */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  )
}
