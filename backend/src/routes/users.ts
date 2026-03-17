import { Router, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, requireAdmin, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all users (admin only)
router.get('/', authenticateSession, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users_exit ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single user (admin only)
router.get('/:id', authenticateSession, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users_exit WHERE id = ?',
      [req.params.id]
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

// Create user (admin only) - plain text password
router.post('/', authenticateSession, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, full_name, role } = req.body

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'Username, email, password, and full name are required' })
    }

    const [result] = await pool.execute(
      `INSERT INTO users_exit (username, email, password, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, email, password, full_name, role || 'hr']
    )

    const insertResult = result as any
    res.status(201).json({ id: insertResult.insertId, message: 'User created successfully' })
  } catch (error: any) {
    console.error('Create user error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user (admin only) - plain text password
router.put('/:id', authenticateSession, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, full_name, role, is_active } = req.body

    let query = 'UPDATE users_exit SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?'
    let params: any[] = [username, email, full_name, role, is_active]

    if (password) {
      query += ', password = ?'
      params.push(password)
    }

    query += ' WHERE id = ?'
    params.push(req.params.id)

    await pool.execute(query, params)
    res.json({ message: 'User updated successfully' })
  } catch (error: any) {
    console.error('Update user error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user (admin only)
router.delete('/:id', authenticateSession, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Prevent deleting yourself
    if (req.user?.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    await pool.execute('DELETE FROM users_exit WHERE id = ?', [req.params.id])
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
