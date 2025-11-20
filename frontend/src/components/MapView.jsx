// src/components/MapView.jsx
import React from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// URLs dos ícones coloridos
const SHADOW_URL =
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

// Pacote de markers coloridos (open source)
const ICON_BLUE_2X =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
const ICON_BLUE =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png'
const ICON_GREEN_2X =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
const ICON_GREEN =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
const ICON_RED_2X =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
const ICON_RED =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
const ICON_GREY_2X =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png'
const ICON_GREY =
  'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png'

// Helper pra criar ícone Leaflet
function createColoredIcon(iconUrl, iconRetinaUrl) {
  return new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl: SHADOW_URL,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

// Ícones
const iconDefault = createColoredIcon(ICON_GREY, ICON_GREY_2X)            // não visitado
const iconTouristVisited = createColoredIcon(ICON_BLUE, ICON_BLUE_2X)    // ponto turístico
const iconRestaurantVisited = createColoredIcon(ICON_GREEN, ICON_GREEN_2X) // restaurante
const iconCommerceVisited = createColoredIcon(ICON_RED, ICON_RED_2X)     // comércio

// Decide qual ícone usar com base no tipo + se está visitado
function getMarkerIcon(place, isVisited) {
  if (!isVisited) return iconDefault

  const typeStr = (place.type || place.kinds || '').toLowerCase()

  if (typeStr.includes('restaur')) return iconRestaurantVisited
  if (typeStr.includes('comércio') || typeStr.includes('comercio') || typeStr.includes('shopping')) {
    return iconCommerceVisited
  }
  // default para cartão postal de ponto turístico
  return iconTouristVisited
}

function Recenter({ center }) {
  const map = useMap()
  if (center) map.setView([center.lat, center.lng], map.getZoom())
  return null
}

// Captura clique com botão direito (contextmenu) no mapa
function RightClickAdd({ onAddPlace }) {
  useMapEvents({
    contextmenu(e) {
      onAddPlace?.({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      })
    },
  })
  return null
}

export default function MapView({
  center,
  places,
  loadingPlaces,
  radius,
  onAddPlace,
  onSelectPlace,
  routeGeometry,
  visitedPlaces = [], // 👈 IDs dos locais visitados
}) {
  const defaultCenter = { lat: -23.55052, lng: -46.633308 }

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center || defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {center && (
          <>
            <Marker position={[center.lat, center.lng]}>
              <Popup>Você está aqui</Popup>
            </Marker>
            <Circle center={[center.lat, center.lng]} radius={radius} />
          </>
        )}

        {/* Marcadores dos lugares */}
        {places.map(
          (p) =>
            typeof p.lat === 'number' &&
            typeof p.lon === 'number' && (
              <Marker
                key={p.id}
                position={[p.lat, p.lon]}
                eventHandlers={{ click: () => onSelectPlace?.(p) }}
                icon={getMarkerIcon(p, visitedPlaces.includes(p.id))}
              >
                <Popup>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: '.9rem', color: '#555' }}>
                    {p.address || p.kinds || p.type}
                    {p.dist != null ? ` — ${Math.round(p.dist)} m` : ''}
                  </div>
                </Popup>
              </Marker>
            )
        )}

        {/* Rota REAL */}
        {routeGeometry && routeGeometry.length > 1 && (
          <Polyline
            positions={routeGeometry}
            pathOptions={{ color: '#ff3b30', weight: 5 }}
          />
        )}

        <RightClickAdd onAddPlace={onAddPlace} />
        <Recenter center={center} />
      </MapContainer>
    </div>
  )
}
