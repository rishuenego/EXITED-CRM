import { Router, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all SIMs with employee info
router.get('/', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query
    let query = `
      SELECT s.*, e.full_name as employee_name, e.employee_id as emp_code, e.status as employee_status
      FROM simcards_table s
      LEFT JOIN employees_table e ON s.employee_id = e.id
      WHERE 1=1
    `
    const params: any[] = []

    if (status && status !== 'all') {
      query += ' AND s.status = ?'
      params.push(status)
    }

    if (search) {
      query += ' AND (s.sim_number LIKE ? OR s.phone_number LIKE ? OR e.full_name LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    query += ' ORDER BY s.created_at DESC'

    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error('Get SIMs error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single SIM
router.get('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, e.full_name as employee_name 
       FROM simcards_table s 
       LEFT JOIN employees_table e ON s.employee_id = e.id 
       WHERE s.id = ?`,
      [req.params.id]
    )
    const sims = rows as any[]

    if (sims.length === 0) {
      return res.status(404).json({ error: 'SIM not found' })
    }

    res.json(sims[0])
  } catch (error) {
    console.error('Get SIM error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create SIM
router.post('/', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { sim_number, phone_number, employee_id, provider, status, assigned_date, notes } = req.body

    if (!sim_number) {
      return res.status(400).json({ error: 'SIM number is required' })
    }

    const [result] = await pool.execute(
      `INSERT INTO simcards_table (sim_number, phone_number, employee_id, provider, status, assigned_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sim_number, phone_number || null, employee_id || null, provider || null, status || 'active', assigned_date || null, notes || null]
    )

    const insertResult = result as any
    res.status(201).json({ id: insertResult.insertId, message: 'SIM created successfully' })
  } catch (error: any) {
    console.error('Create SIM error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SIM number already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update SIM
router.put('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { sim_number, phone_number, employee_id, provider, status, assigned_date, notes } = req.body

    await pool.execute(
      `UPDATE simcards_table SET sim_number = ?, phone_number = ?, employee_id = ?, provider = ?, 
       status = ?, assigned_date = ?, notes = ? WHERE id = ?`,
      [sim_number, phone_number, employee_id || null, provider, status, assigned_date, notes, req.params.id]
    )

    res.json({ message: 'SIM updated successfully' })
  } catch (error: any) {
    console.error('Update SIM error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'SIM number already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete SIM
router.delete('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM simcards_table WHERE id = ?', [req.params.id])
    res.json({ message: 'SIM deleted successfully' })
  } catch (error) {
    console.error('Delete SIM error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
