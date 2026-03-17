import { Router, Request, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, createSession, deleteSession, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users_exit WHERE username = ? AND is_active = TRUE',
      [username]
    )

    const users = rows as any[]
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = users[0]
    
    // Plain text password comparison (no hashing)
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Create session
    const sessionId = createSession({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    res.json({
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string
  if (sessionId) {
    deleteSession(sessionId)
  }
  res.json({ message: 'Logged out successfully' })
})

// Get current user
router.get('/me', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, role FROM users_exit WHERE id = ?',
      [req.user?.id]
    )

    const users = rows as any[]
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(users[0])
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Change password (plain text)
router.put('/change-password', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    const [rows] = await pool.execute('SELECT password FROM users_exit WHERE id = ?', [req.user?.id])
    const users = rows as any[]

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (currentPassword !== users[0].password) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    await pool.execute('UPDATE users_exit SET password = ? WHERE id = ?', [newPassword, req.user?.id])

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
