import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  user?: {
    id: number
    username: string
    role: 'admin' | 'hr'
  }
}

// Simple session storage (in production, use Redis or database sessions)
const sessions: Map<string, AuthRequest['user']> = new Map()

export const createSession = (user: AuthRequest['user']): string => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  sessions.set(sessionId, user)
  return sessionId
}

export const deleteSession = (sessionId: string): void => {
  sessions.delete(sessionId)
}

export const authenticateSession = (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string

  if (!sessionId) {
    return res.status(401).json({ error: 'Session required' })
  }

  const user = sessions.get(sessionId)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  req.user = user
  next()
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export const requireHROrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
    return res.status(403).json({ error: 'Access denied' })
  }
  next()
}
