import { Router, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all employees with filters
router.get('/', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { status, department, search } = req.query
    let query = 'SELECT * FROM employees_table WHERE 1=1'
    const params: any[] = []

    if (status && status !== 'all') {
      query += ' AND status = ?'
      params.push(status)
    }

    if (department && department !== 'all') {
      query += ' AND department = ?'
      params.push(department)
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    query += ' ORDER BY created_at DESC'

    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (error) {
    console.error('Get employees error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single employee
router.get('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM employees_table WHERE id = ?', [req.params.id])
    const employees = rows as any[]

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json(employees[0])
  } catch (error) {
    console.error('Get employee error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create employee
router.post('/', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, full_name, email, phone, department, designation, joining_date, status } = req.body

    if (!full_name || !department) {
      return res.status(400).json({ error: 'Full name and department are required' })
    }

    // Auto-generate employee_id if not provided
    let finalEmployeeId = employee_id
    if (!finalEmployeeId || finalEmployeeId.trim() === '') {
      const prefix = department === 'sales' ? 'SAL' : 'ADM'
      const timestamp = Date.now().toString().slice(-6)
      finalEmployeeId = `${prefix}${timestamp}`
    }

    const [result] = await pool.execute(
      `INSERT INTO employees_table (employee_id, full_name, email, phone, department, designation, joining_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalEmployeeId, full_name, email || null, phone || null, department, designation || null, joining_date || null, status || 'active']
    )

    const insertResult = result as any
    res.status(201).json({ id: insertResult.insertId, message: 'Employee created successfully' })
  } catch (error: any) {
    console.error('Create employee error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Employee ID already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update employee
router.put('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, full_name, email, phone, department, designation, joining_date, status } = req.body

    await pool.execute(
      `UPDATE employees_table SET employee_id = ?, full_name = ?, email = ?, phone = ?, department = ?, 
       designation = ?, joining_date = ?, status = ? WHERE id = ?`,
      [employee_id, full_name, email, phone, department, designation, joining_date, status, req.params.id]
    )

    res.json({ message: 'Employee updated successfully' })
  } catch (error: any) {
    console.error('Update employee error:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Employee ID already exists' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete employee
router.delete('/:id', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    await pool.execute('DELETE FROM employees_table WHERE id = ?', [req.params.id])
    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Delete employee error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Bulk upload employees
router.post('/bulk', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No data provided' })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; error: string }[]
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const { employee_id, full_name, email, phone, department, designation, joining_date } = row

        if (!full_name || !department) {
          results.failed++
          results.errors.push({ row: i + 2, error: 'Full name and department are required' })
          continue
        }

        // Normalize department value
        let normalizedDepartment = department.toLowerCase().trim()
        if (normalizedDepartment === 'admin/digital' || normalizedDepartment === 'admin_digital' || normalizedDepartment === 'admin') {
          normalizedDepartment = 'admin_digital'
        } else if (normalizedDepartment === 'sales') {
          normalizedDepartment = 'sales'
        } else {
          results.failed++
          results.errors.push({ row: i + 2, error: 'Department must be "sales" or "admin_digital"' })
          continue
        }

        // Auto-generate employee_id if not provided
        let finalEmployeeId = employee_id
        if (!finalEmployeeId || finalEmployeeId.trim() === '') {
          const prefix = normalizedDepartment === 'sales' ? 'SAL' : 'ADM'
          const timestamp = Date.now().toString().slice(-6) + i.toString()
          finalEmployeeId = `${prefix}${timestamp}`
        }

        await pool.execute(
          `INSERT INTO employees_table (employee_id, full_name, email, phone, department, designation, joining_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [finalEmployeeId, full_name, email || null, phone || null, normalizedDepartment, designation || null, joining_date || null, 'active']
        )
        results.success++
      } catch (error: any) {
        results.failed++
        if (error.code === 'ER_DUP_ENTRY') {
          results.errors.push({ row: i + 2, error: 'Employee ID already exists' })
        } else {
          results.errors.push({ row: i + 2, error: error.message || 'Unknown error' })
        }
      }
    }

    res.json(results)
  } catch (error) {
    console.error('Bulk upload employees error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get active employees for dropdown
router.get('/active/list', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, employee_id, full_name FROM employees_table WHERE status = ? ORDER BY full_name',
      ['active']
    )
    res.json(rows)
  } catch (error) {
    console.error('Get active employees error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
