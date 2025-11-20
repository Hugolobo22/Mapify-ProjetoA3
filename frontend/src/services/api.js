// src/services/api.js
const API_BASE = 'http://localhost:3001'

async function apiFetch(path, options = {}, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || data.details || 'Erro na requisição')
  }

  return data
}

export function registerUser({ name, email, password }) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function loginUser({ email, password }) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getPlaces(token) {
  return apiFetch('/places', { method: 'GET' }, token)
}

export function createPlace(place, token) {
  return apiFetch(
    '/places',
    {
      method: 'POST',
      body: JSON.stringify(place),
    },
    token
  )
}

export function requestPasswordReset({ email }) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}
