import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

let accessToken = null
let refreshing = null

export function setAccessToken(token) {
  accessToken = token
}

export function clearAccessToken() {
  accessToken = null
}

// Attach token to every request
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// On 401, try refreshing once
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!refreshing) {
        refreshing = axios.post('/api/auth/refresh', {}, { withCredentials: true })
          .then(res => {
            accessToken = res.data.accessToken
            refreshing = null
            return accessToken
          })
          .catch(() => {
            accessToken = null
            refreshing = null
            window.dispatchEvent(new Event('auth:logout'))
            return null
          })
      }
      const newToken = await refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }
    }
    return Promise.reject(error)
  }
)

export default client
