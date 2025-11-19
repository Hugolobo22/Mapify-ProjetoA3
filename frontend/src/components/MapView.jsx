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

// Corrige os ícones do Leaflet (com Vite)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function Recenter({ center }) {
  const map = useMap()
  if (center) map.setView([center.lat, center.lng], map.getZoom())
  return null
}

// Captura clique com botão direito (contextmenu) no mapa
function RightClickAdd({ onAddPlace }) {
  useMapEvents({
    contextmenu(e) {
      const name = prompt('Nome do ponto turístico:')
      if (!name) return
      const type = prompt('Tipo do local (ex: praça, museu, mirante):') || 'custom'

      onAddPlace?.({
        id: `custom-${Date.now()}`,
        name,
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        type,
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
  routeGeometry, // <- rota real vinda do App
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
              >
                <Popup>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: '.9rem', color: '#555' }}>
                    {p.address || p.kinds || p.type}
                    {p.dist != null ? ` — ${Math.round(p.dist)} m` : ''}
                  </div>
                </Popup>
              </Marker>
            ),
        )}

        {/* Rota REAL: sequência de pontos da API de rotas */}
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
