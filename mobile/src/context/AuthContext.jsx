import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '../constants'
import client, {
  setAccessToken,
  clearAccessToken,
  storeRefreshToken,
  getStoredRefreshToken,
  removeRefreshToken,
} from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On app launch, restore session from stored refresh token
  useEffect(() => {
    async function restoreSession() {
      try {
        let refreshToken = null
        try {
          refreshToken = await getStoredRefreshToken()
        } catch (e) {
          console.warn('SecureStore unavailable:', e?.message)
          setLoading(false)
          return
        }
        if (!refreshToken) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }
        )
        const { accessToken } = await res.json().catch(() => ({}))

        if (!accessToken) {
          setLoading(false)
          return
        }
        setAccessToken(accessToken)
        const { user } = await client.get('/auth/me')
        setUser(user)
      } catch (e) {
        console.warn('restoreSession failed:', e?.message)
        try { await removeRefreshToken() } catch {}
        clearAccessToken()
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await client.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    await storeRefreshToken(data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password) => {
    const data = await client.post('/auth/register', { email, password })
    setAccessToken(data.accessToken)
    await storeRefreshToken(data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getStoredRefreshToken()
      await client.post('/auth/logout', { refreshToken })
    } catch {}
    clearAccessToken()
    await removeRefreshToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
