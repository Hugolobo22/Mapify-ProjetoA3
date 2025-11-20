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
import ProfilePage from './components/ProfilePage'
import SavedPlacesPage from './components/SavedPlacesPage'
import ReviewedPlacesPage from './components/ReviewedPlacesPage'
import VisitedPlacesPage from './components/VisitedPlacesPage'

const LS_AUTH = 'mapify_auth_v1'
const LS_REVIEWS_PREFIX = 'place_reviews_v1_'   // reviews por usuário
const LS_VISITED_PREFIX = 'visited_places_v1_'  // locais visitados por usuário

// chave estável por usuário (email → id → name)
const getUserKey = (user) => user?.email ?? user?.id ?? user?.name ?? null

export default function App() {
  const [position, setPosition] = useState(null)
  const [apiPlaces, setApiPlaces] = useState([])
  const [backendPlaces, setBackendPlaces] = useState([])
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [radius, setRadius] = useState(1000)

  // 'home' | 'auth' | 'profile' | 'saved' | 'reviewed' | 'visited'
  const [view, setView] = useState('home')

  // Auth
  const [currentUser, setCurrentUser] = useState(null)
  const [token, setToken] = useState(null)

  // Modais de lugar
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [createCoords, setCreateCoords] = useState(null) // { lat, lon }

  // Reviews locais (por usuário)
  const [reviewsByPlace, setReviewsByPlace] = useState({})

  // Locais visitados (cartão postal) por usuário – array de IDs de lugar
  const [visitedPlaces, setVisitedPlaces] = useState([])

  // ROTA
  const [routeTarget, setRouteTarget] = useState(null)
  const [routeGeometry, setRouteGeometry] = useState(null) // [[lat, lon], ...]
  const [routeInfo, setRouteInfo] = useState(null) // { distance, duration }

  // ------- Helpers de reviews por usuário -------
  function loadReviewsForUser(user) {
    const userKey = getUserKey(user)
    if (!userKey) {
      setReviewsByPlace({})
      return
    }
    const key = `${LS_REVIEWS_PREFIX}${userKey}`
    try {
      const rv = JSON.parse(localStorage.getItem(key) || '{}')
      setReviewsByPlace(rv && typeof rv === 'object' ? rv : {})
    } catch {
      setReviewsByPlace({})
    }
  }

  // ------- Helpers de visitados por usuário -------
  function loadVisitedForUser(user) {
    const userKey = getUserKey(user)
    if (!userKey) {
      setVisitedPlaces([])
      return
    }
    const key = `${LS_VISITED_PREFIX}${userKey}`
    try {
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) : []
      setVisitedPlaces(Array.isArray(arr) ? arr : [])
    } catch {
      setVisitedPlaces([])
    }
  }

  const toggleVisited = (placeId) => {
    if (!currentUser) {
      alert('Faça login para marcar locais como visitados.')
      return
    }
    setVisitedPlaces((prev) =>
      prev.includes(placeId)
        ? prev.filter((id) => id !== placeId)
        : [...prev, placeId]
    )
  }

  // carregar auth + dados do usuário do localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_AUTH) || 'null')
      if (saved && saved.token && saved.user) {
        setToken(saved.token)
        setCurrentUser(saved.user)
        loadReviewsForUser(saved.user)
        loadVisitedForUser(saved.user)
      }
    } catch {
      // ignore
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

  // persistir reviews POR USUÁRIO
  useEffect(() => {
    if (!currentUser) return
    const userKey = getUserKey(currentUser)
    if (!userKey) return
    const key = `${LS_REVIEWS_PREFIX}${userKey}`
    localStorage.setItem(key, JSON.stringify(reviewsByPlace))
  }, [reviewsByPlace, currentUser])

  // persistir visitados POR USUÁRIO
  useEffect(() => {
    if (!currentUser) return
    const userKey = getUserKey(currentUser)
    if (!userKey) return
    const key = `${LS_VISITED_PREFIX}${userKey}`
    localStorage.setItem(key, JSON.stringify(visitedPlaces))
  }, [visitedPlaces, currentUser])

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

  // busca na API externa (OpenTripMap)
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

  // lugares criados pelo usuário logado
  const userPlaces = useMemo(
    () =>
      currentUser
        ? backendPlaces.filter((p) => p.created_by === currentUser.id)
        : [],
    [backendPlaces, currentUser]
  )

  // lista combinada: BASE + backend + API (todos, para o mapa)
  const allPlaces = useMemo(
    () => [...basePlacesNatal, ...backendPlaces, ...filteredApiPlaces],
    [backendPlaces, filteredApiPlaces]
  )

  // ===== Gamificação / perfil (por usuário) =====
  const profileStats = useMemo(() => {
    if (!currentUser) {
      return {
        savedPlaces: 0,
        reviewedPlacesCount: 0,
        totalReviews: 0,
        reviewedPlaces: [],
        visitedCount: 0,
        xp: 0,
        level: 1,
        currentLevelXp: 0,
        xpToNext: 200,
      }
    }

    const userKey = getUserKey(currentUser)

    let reviewedPlaces = []
    let totalReviews = 0

    for (const [placeId, arr] of Object.entries(reviewsByPlace)) {
      arr.forEach((review) => {
        const reviewKey = review.userKey ?? review.userId ?? null
        if (userKey && reviewKey === userKey) {
          reviewedPlaces.push({
            placeId: Number(placeId),
            review,
          })
          totalReviews++
        }
      })
    }

    const savedPlaces = backendPlaces.filter(
      (p) => p.created_by === currentUser.id
    ).length

    const visitedCount = visitedPlaces.length

    // XP balanceado
    const xp =
      savedPlaces * 15 +
      reviewedPlaces.length * 25 +
      totalReviews * 10 +
      visitedCount * 20

    const level = Math.floor(xp / 200) + 1
    const currentLevelXp = xp % 200
    const xpToNext = 200

    return {
      savedPlaces,
      reviewedPlacesCount: reviewedPlaces.length,
      totalReviews,
      reviewedPlaces,
      visitedCount,
      xp,
      level,
      currentLevelXp,
      xpToNext,
    }
  }, [backendPlaces, reviewsByPlace, currentUser, visitedPlaces])

  // detalhes
  const openDetails = (p) => setSelectedPlace(p)
  const closeDetails = () => setSelectedPlace(null)

  // reviews do lugar selecionado
  const selectedReviews = selectedPlace ? reviewsByPlace[selectedPlace.id] || [] : []

  const addReview = (review) => {
    if (!selectedPlace?.id) return

    if (!currentUser) {
      alert('Faça login para avaliar este local.')
      return
    }

    const userKey = getUserKey(currentUser)

    setReviewsByPlace((prev) => {
      const arr = prev[selectedPlace.id] || []

      // garante 1 review por usuário (considerando userKey antigo/novo)
      const filtered = arr.filter((r) => {
        const reviewKey = r.userKey ?? r.userId ?? null
        return !(userKey && reviewKey === userKey)
      })

      const newReview = {
        ...review,
        userKey,              // chave estável
        userId: currentUser.id, // mantido pra compatibilidade
      }

      return {
        ...prev,
        [selectedPlace.id]: [...filtered, newReview],
      }
    })
  }

  const deleteReview = () => {
    if (!selectedPlace?.id || !currentUser) return

    const userKey = getUserKey(currentUser)

    setReviewsByPlace((prev) => {
      const arr = prev[selectedPlace.id] || []
      const filtered = arr.filter((r) => {
        const reviewKey = r.userKey ?? r.userId ?? null
        return !(userKey && reviewKey === userKey)
      })

      return {
        ...prev,
        [selectedPlace.id]: filtered,
      }
    })
  }

  // clique com botão direito no mapa (pedido de criação)
  const handleAddPlaceRequest = (coords) => {
    if (!token) {
      alert('Faça login para salvar pontos turísticos.')
      setView('auth')
      return
    }
    setCreateCoords(coords) // { lat, lon }
  }

  const handleConfirmCreatePlace = async (values) => {
    if (!token || !createCoords) return
    try {
      const payload = {
        name: values.name,
        type: values.type,
        address: values.address,
        lat: createCoords.lat,
        lon: createCoords.lon,
      }
      const created = await createPlace(payload, token)
      setBackendPlaces((prev) => [created, ...prev])
      setCreateCoords(null)
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
    loadReviewsForUser(user)
    loadVisitedForUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setToken(null)
    setBackendPlaces([])
    setRouteTarget(null)
    setRouteGeometry(null)
    setRouteInfo(null)
    setReviewsByPlace({})
    setVisitedPlaces([])
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

      const coords = feature.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      const summary = feature.properties.summary

      setRouteGeometry(coords)
      setRouteInfo({
        distance: summary.distance,
        duration: summary.duration,
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
      <ProfilePage
        user={currentUser}
        stats={profileStats}
        onBackToMap={() => setView('home')}
        onLogout={handleLogout}
        onOpenSavedPlaces={() => setView('saved')}
        onOpenReviewed={() => setView('reviewed')}
        onOpenVisited={() => setView('visited')}
      />
    )
  }

  if (view === 'saved' && currentUser) {
    return (
      <SavedPlacesPage
        user={currentUser}
        places={userPlaces}
        onBackToMap={() => setView('home')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'reviewed' && currentUser) {
    return (
      <ReviewedPlacesPage
        reviews={profileStats.reviewedPlaces}
        places={allPlaces}
        onBackToMap={() => setView('profile')}
      />
    )
  }

  if (view === 'visited' && currentUser) {
    return (
      <VisitedPlacesPage
        places={allPlaces}
        visitedPlaces={visitedPlaces}
        onBack={() => setView('profile')}
      />
    )
  }

  // ====== RENDER: TELA PRINCIPAL (HOME) ======
  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">Mapify — Encontre pontos turísticos próximos</h1>
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
              <div className="user-avatar">
                {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="user-meta">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-level">Nível {profileStats.level}</span>
                <button
                  type="button"
                  className="user-link"
                  onClick={() => setView('profile')}
                >
                  Ver perfil
                </button>
              </div>
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
            routeGeometry={routeGeometry}
            visitedPlaces={visitedPlaces}
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
        <span>Projeto de turismo interativo — Mapify.</span>
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
          user={currentUser}
          onDeleteReview={deleteReview}
          visitedPlaces={visitedPlaces}
          onToggleVisited={toggleVisited}
        />
      )}

      {/* Modal de criação de ponto */}
      {createCoords && (
        <PlaceCreateModal
          coords={createCoords}
          onSave={handleConfirmCreatePlace}
          onClose={() => setCreateCoords(null)}
        />
      )}
    </div>
  )
}
