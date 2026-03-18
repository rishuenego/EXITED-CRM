import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, Database, AlertCircle } from 'lucide-react'

interface HealthStatus {
  status: string
  message: string
  database: string
}

export default function ConnectionStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkHealth = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('[v0] Checking API health...')
      const response = await api.get('/health')
      console.log('[v0] Health check response:', response.data)
      setHealth(response.data)
    } catch (err: any) {
      console.error('[v0] Health check failed:', err)
      setError(
        err.response?.data?.error || 
        err.message || 
        'Cannot connect to backend'
      )
      setHealth(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const apiUrl = import.meta.env.VITE_API_URL || '(using proxy)'

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-card p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">Backend Status</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={checkHealth}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">API URL:</span>
          <code className="bg-muted px-1 rounded">{apiUrl}</code>
        </div>

        {error ? (
          <div className="flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : health ? (
          <>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <Badge variant={health.status === 'ok' ? 'default' : 'destructive'}>
                {health.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Database: </span>
              <Badge variant={health.database === 'connected' ? 'default' : 'destructive'}>
                {health.database}
              </Badge>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Checking...</span>
          </div>
        )}
      </div>
    </div>
  )
}
