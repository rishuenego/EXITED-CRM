import axios from 'axios'

// Use relative URL for API calls (proxy handles it in development)
// In production, set VITE_API_URL to your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Add session ID to requests
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId')
  if (sessionId) {
    config.headers['x-session-id'] = sessionId
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('sessionId')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
