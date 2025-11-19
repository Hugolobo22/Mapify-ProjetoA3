// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import MapView from './components/MapView'
import { fetchNearbyPlaces } from './services/places'
import PlaceDetailsModal from './components/PlaceDetailsModal'
import PlaceCreateModal from './components/PlaceCreateModal'
import AuthPage from './components/AuthPage'
import { getPlaces, createPlace } from './services/api'
import { getRoute } from './services/routes'
import { basePlacesNatal } from './data/basePlacesNatal'

const LS_AUTH = 'mapify_auth_v1'
const LS_REVIEWS = 'place_reviews_v1'

// helper simples pra iniciais
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export default function App() {
  const [position, setPosition] = useState(null)
  const [apiPlaces, setApiPlaces] = useState([])
  const [backendPlaces, setBackendPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [radius, setRadius] = useState(1000)

  // 'home' | 'auth' | 'profile'
  const [view, setView] = useState('home')

  // Auth
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(null)

  // Modais de lugar
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState(null)

  // Reviews locais
  const [reviewsByPlace, setReviewsByPlace] = useState({})

  // ROTA
  const [routeTarget, setRouteTarget] = useState(null)
  const [routeGeometry, setRouteGeometry] = useState(null) // [[lat, lon], ...]
  const [routeInfo, setRouteInfo] = useState(null) // { distance, duration }

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

  // busca na API externa (OpenTripMap – hoje pode estar vazio se não tiver key)
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

  // filtrar API pelo raio
  const filteredApiPlaces = useMemo(
    () =>
      apiPlaces.filter((p) => {
        if (p.dist == null) return true
        return p.dist <= radius
      }),
    [apiPlaces, radius]
  )

  // lista combinada: BASE + backend + API
  const allPlaces = useMemo(
    () => [...basePlacesNatal, ...backendPlaces, ...filteredApiPlaces],
    [backendPlaces, filteredApiPlaces] // basePlacesNatal é estático
  )

  // ===== Gamificação / perfil =====
  const profileStats = useMemo(() => {
    const savedPlaces = backendPlaces.length
    const reviewedPlaces = Object.keys(reviewsByPlace).length
    const totalReviews = Object.values(reviewsByPlace).reduce(
      (sum, arr) => sum + arr.length,
      0
    )

    // fórmula simples de XP (pode ajustar depois):
    const xp = savedPlaces * 10 + reviewedPlaces * 5 + totalReviews * 2
    const level = Math.floor(xp / 100) + 1
    const currentLevelXp = xp % 100
    const xpToNext = 100

    return { savedPlaces, reviewedPlaces, totalReviews, xp, level, currentLevelXp, xpToNext }
  }, [backendPlaces, reviewsByPlace])

  // detalhes
  const openDetails = (p) => setSelectedPlace(p)
  const closeDetails = () => setSelectedPlace(null)

  // reviews
  const addReview = (review) => {
    if (!selectedPlace?.id) return
    setReviewsByPlace((prev) => {
      const arr = prev[selectedPlace.id] || []
      return { ...prev, [selectedPlace.id]: [review, ...arr] }
    })
  }

  const selectedReviews = selectedPlace ? reviewsByPlace[selectedPlace.id] || [] : []

  // clique com botão direito no mapa (pedido de criação)
  const handleAddPlaceRequest = (placeDraft) => {
    if (!token) {
      alert('Faça login para salvar pontos turísticos.')
      setView('auth')
      return
    }
    setCreateDraft(placeDraft)
    setCreateModalOpen(true)
  }

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

  // sucesso de auth vindo da AuthPage
  const handleAuthSuccess = (user, tokenValue) => {
    setCurrentUser(user)
    setToken(tokenValue)
    setView('home')
    loadBackendPlaces()
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setToken(null)
    setBackendPlaces([])
    // limpamos também rota quando sair
    setRouteTarget(null)
    setRouteGeometry(null)
    setRouteInfo(null)
  }

  // ====== ROTA REAL ======
  const handleRouteToPlace = async (place) => {
    if (!place || !position) return
    if (typeof place.lat !== 'number' || typeof place.lon !== 'number') {
      alert('Este ponto não possui coordenadas válidas.')
      return
    }

    setRouteTarget(place)
    try {
      const route = await getRoute(position.lat, position.lng, place.lat, place.lon)
      if (!route) {
        alert('Não foi possível traçar a rota.')
        return
      }

      const feature = route.features?.[0]
      if (!feature) {
        alert('Resposta de rota inválida.')
        return
      }

      // converte [lon, lat] -> [lat, lon] para o Leaflet
      const coords = feature.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      const summary = feature.properties.summary

      setRouteGeometry(coords)
      setRouteInfo({
        distance: summary.distance, // metros
        duration: summary.duration, // segundos
      })
    } catch (err) {
      console.error('Erro ao obter rota:', err)
      alert('Erro ao obter rota. Veja o console.')
    }
  }

  const handleClearRoute = () => {
    setRouteTarget(null)
    setRouteGeometry(null)
    setRouteInfo(null)
  }

  const hasRouteForSelected =
    !!routeTarget && !!routeGeometry && selectedPlace && routeTarget.id === selectedPlace.id

  // ====== TELAS ESPECIAIS ======
  if (view === 'auth') {
    return (
      <AuthPage
        onBack={() => setView('home')}
        onAuthSuccess={handleAuthSuccess}
      />
    )
  }

  if (view === 'profile' && currentUser) {
    return (
      <div className="profile-page">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="app-title">Seu perfil — Mapify Turismo</h1>
          </div>
          <div className="topbar-right">
            <button className="login-btn" onClick={() => setView('home')}>
              Voltar para o mapa
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="profile-main">
          <section className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {getInitials(currentUser.name)}
              </div>
              <div className="profile-info">
                <h2>{currentUser.name}</h2>
                <p>{currentUser.email}</p>
                <span className="profile-level-badge">Nível {profileStats.level}</span>
              </div>
            </div>

            <div className="profile-xp-block">
              <div className="profile-xp-label">
                XP: {profileStats.xp} • Próximo nível em {profileStats.xpToNext - profileStats.currentLevelXp} XP
              </div>
              <div className="profile-xp-bar">
                <div
                  className="profile-xp-bar-fill"
                  style={{
                    width: `${(profileStats.currentLevelXp / profileStats.xpToNext) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-label">Locais salvos</span>
                <span className="profile-stat-value">{profileStats.savedPlaces}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-label">Locais avaliados</span>
                <span className="profile-stat-value">{profileStats.reviewedPlaces}</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-label">Avaliações feitas</span>
                <span className="profile-stat-value">{profileStats.totalReviews}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ====== RENDER: TELA PRINCIPAL (HOME) ======
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">Site Turismo — Encontre pontos turísticos próximos</h1>
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
              <button
                type="button"
                className="user-chip"
                onClick={() => setView('profile')}
              >
                <div className="user-avatar">
                  {getInitials(currentUser.name)}
                </div>
                <div className="user-chip-texts">
                  <div className="user-name">{currentUser.name}</div>
                  <div className="user-level">Nível {profileStats.level}</div>
                </div>
              </button>
              <button className="logout-btn" onClick={handleLogout}>
                Sair
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setView('auth')}>
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="map-section">
          <MapView
            center={position}
            places={allPlaces}
            loadingPlaces={loadingPlaces}
            radius={radius}
            onAddPlace={handleAddPlaceRequest}
            onSelectPlace={openDetails}
            routeGeometry={routeGeometry} // <- aqui vai a rota real
          />
        </section>

        <aside className="sidebar">
          <h2>Locais encontrados</h2>
          <p className="sidebar-hint">
            Dica: clique com o <b>botão direito</b> no mapa para adicionar um ponto.
          </p>

          {loadingPlaces && <p>Buscando pontos turísticos...</p>}
          {!loadingPlaces && allPlaces.length === 0 && <p>Nenhum local encontrado.</p>}

          <ul className="places-list">
            {allPlaces.map((p) => (
              <li
                key={p.id}
                onClick={() => openDetails(p)}
                className="place-item"
              >
                <strong>{p.name}</strong>
                <div className="meta">
                  {(p.kinds || p.type || '').toString()}{' '}
                  {p.dist ? `— ${Math.round(p.dist)} m` : ''}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="footer">
        <span>Projeto de turismo interativo — mapa + pontos salvos pelo usuário.</span>
      </footer>

      {/* Modal de detalhes */}
      {selectedPlace && (
        <PlaceDetailsModal
          place={selectedPlace}
          reviews={selectedReviews}
          onAddReview={addReview}
          onClose={closeDetails}
          onRoute={() => handleRouteToPlace(selectedPlace)}
          onClearRoute={handleClearRoute}
          hasRoute={hasRouteForSelected}
          routeInfo={routeInfo}
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
    </div>
  )
}
