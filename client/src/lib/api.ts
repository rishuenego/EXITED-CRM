import axios, { AxiosError } from 'axios'

// Use relative URL for API calls (proxy handles it in development)
// In production, set VITE_API_URL to your backend URL (e.g., http://localhost:5000)
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Log the API base URL for debugging
console.log('[v0] API Base URL configured as:', API_BASE_URL || '(empty - using proxy/relative paths)')

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout
})

// Add session ID to requests and log request details
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId')
  if (sessionId) {
    config.headers['x-session-id'] = sessionId
  }
  
  // Debug logging for requests
  console.log(`[v0] API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
  
  return config
}, (error) => {
  console.error('[v0] API Request Error:', error)
  return Promise.reject(error)
})

// Handle response errors with better error messages
api.interceptors.response.use(
  (response) => {
    console.log(`[v0] API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error: AxiosError) => {
    // Log detailed error information
    console.error('[v0] API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      message: error.message
    })

    // Check for network errors (backend not reachable)
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error('[v0] Cannot connect to backend. Make sure the backend server is running on port 5000.')
      error.message = 'Cannot connect to server. Please ensure the backend is running.'
    }
    
    // Check for timeout
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please try again.'
    }

    // Handle auth errors - but not on login page to avoid redirect loops
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem('sessionId')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
