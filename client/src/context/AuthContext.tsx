import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: 'admin' | 'hr'
}

interface AuthContextType {
  user: User | null
  sessionId: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId')
    const storedUser = localStorage.getItem('user')
    
    if (storedSessionId && storedUser) {
      setSessionId(storedSessionId)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { sessionId: newSessionId, user: newUser } = response.data
      
      localStorage.setItem('sessionId', newSessionId)
      localStorage.setItem('user', JSON.stringify(newUser))
      
      setSessionId(newSessionId)
      setUser(newUser as User)
    } catch (error: any) {
      // Extract error message from API response or provide fallback
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Login failed. Please check your credentials.'
      
      // Log for debugging
      console.error('[v0] Login error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
      
      throw new Error(errorMessage)
    }
  }

  const logout = async () => {
    if (sessionId) {
      try {
        await api.post('/auth/logout')
      } catch (e) {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('sessionId')
    localStorage.removeItem('user')
    setSessionId(null)
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, sessionId, login, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
