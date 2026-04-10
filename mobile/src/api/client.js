import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL } from '../constants'

const REFRESH_TOKEN_KEY = 'refreshToken'

// In-memory access token — never persisted to disk
let accessToken = null

export function setAccessToken(token) { accessToken = token }
export function clearAccessToken() { accessToken = null }

export async function getStoredRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
}
export async function storeRefreshToken(token) {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token)
}
export async function removeRefreshToken() {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
}

// Core request function with automatic token refresh on 401
async function request(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
    ...options.headers,
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
  })

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request(path, options, false)
    // Refresh failed — caller (AuthContext) will handle logout
    throw new Error('SESSION_EXPIRED')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

async function tryRefresh() {
  try {
    const refreshToken = await getStoredRefreshToken()
    if (!refreshToken) return false
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const { accessToken: newToken } = await res.json()
    setAccessToken(newToken)
    return true
  } catch {
    return false
  }
}

// Convenience methods
const client = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) =>
    request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body, options) =>
    request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (path, body, options) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
}

export default client
