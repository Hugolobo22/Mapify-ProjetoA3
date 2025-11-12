const OTM_API_KEY = import.meta.env.VITE_OTM_API_KEY || '' // set in .env as VITE_OTM_API_KEY=your_key


async function fetchOTMPlaces(lat, lon, radius) {
if (!OTM_API_KEY) {
console.warn('OpenTripMap API key não fornecida. Retornando dados mockados vazios.')
return []
}


// 1) get list of places' ids within radius
const kinds = 'interesting_places,tourist_facilities,sights'
const listUrl = `https://api.opentripmap.com/0.1/en/places/radius?apikey=${OTM_API_KEY}&radius=${radius}&lon=${lon}&lat=${lat}&kinds=${encodeURIComponent(kinds)}&limit=50`


const listRes = await fetch(listUrl)
if (!listRes.ok) throw new Error('Falha ao buscar lista de lugares: ' + listRes.status)
const listJson = await listRes.json()


// listJson.features is an array
if (!listJson || !Array.isArray(listJson.features)) return []


// 2) For each feature, optionally fetch details (to get name, address)
const places = await Promise.all(listJson.features.map(async (f) => {
const id = f.properties.xid
try {
const detailRes = await fetch(`https://api.opentripmap.com/0.1/en/places/xid/${id}?apikey=${OTM_API_KEY}`)
const detail = await detailRes.json()
return {
id: id,
name: detail.name || detail.preview?.source || f.properties.name || 'Sem nome',
lat: detail.point?.lat || f.geometry.coordinates[1],
lon: detail.point?.lon || f.geometry.coordinates[0],
kinds: detail.kinds,
address: detail.address?.road ? `${detail.address.road}${detail.address.house_number ? ', ' + detail.address.house_number: ''}` : undefined,
dist: f.properties.dist
}
} catch (err) {
console.error('Erro ao buscar detalhes do lugar', id, err)
return null
}
}))


return places.filter(Boolean)
}


// Fallback: mock data (useful during development without API key)
function mockPlaces(lat, lon) {
return [
{ id: 'mock-1', name: 'Praça Central', lat: lat + 0.002, lon: lon + 0.002, kinds: 'sight', dist: 200 },
{ id: 'mock-2', name: 'Museu Local', lat: lat - 0.003, lon: lon - 0.0015, kinds: 'museum', dist: 400 },
]
}


export async function fetchNearbyPlaces(lat, lon, radius) {
// try OTM first
try {
const res = await fetchOTMPlaces(lat, lon, radius)
if (res && res.length) return res
// if empty, return mock
return mockPlaces(lat, lon)
} catch (err) {
console.error('Erro ao usar OpenTripMap:', err)
// fallback to mock data
return mockPlaces(lat, lon)
}
}