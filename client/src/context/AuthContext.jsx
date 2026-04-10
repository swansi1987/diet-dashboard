import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import client, { setAccessToken, clearAccessToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    try { await client.post('/auth/logout') } catch {}
    clearAccessToken()
    setUser(null)
  }, [])

  // On mount, try to restore session via refresh token (httpOnly cookie)
  useEffect(() => {
    client.post('/auth/refresh')
      .then(res => {
        setAccessToken(res.data.accessToken)
        return client.get('/auth/me')
      })
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Listen for forced logout from interceptor
  useEffect(() => {
    const handler = () => { setUser(null) }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (email, password) => {
    const res = await client.post('/auth/register', { email, password })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
    return res.data.user
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
