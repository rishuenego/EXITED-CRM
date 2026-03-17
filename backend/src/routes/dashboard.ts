import { Router, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get dashboard statistics
router.get('/stats', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    // Get employee counts
    const [employeeCounts] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'exited' THEN 1 ELSE 0 END) as exited
      FROM employees_table
    `)

    // Get SIM counts
    const [simCounts] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned
      FROM simcards_table
    `)

    // Get exit records count by type
    const [exitCounts] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN exit_type = 'sales' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN exit_type = 'admin_digital' THEN 1 ELSE 0 END) as admin_digital
      FROM exitrecords_table
    `)

    res.json({
      employees: (employeeCounts as any[])[0],
      sims: (simCounts as any[])[0],
      exits: (exitCounts as any[])[0]
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get monthly exit trends for charts
router.get('/exit-trends', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(exit_date, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(CASE WHEN exit_type = 'sales' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN exit_type = 'admin_digital' THEN 1 ELSE 0 END) as admin_digital
      FROM exitrecords_table
      WHERE exit_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(exit_date, '%Y-%m')
      ORDER BY month
    `)
    res.json(rows)
  } catch (error) {
    console.error('Get exit trends error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get department distribution
router.get('/department-distribution', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        department,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'exited' THEN 1 ELSE 0 END) as exited
      FROM employees_table
      GROUP BY department
    `)
    res.json(rows)
  } catch (error) {
    console.error('Get department distribution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get recent exits
router.get('/recent-exits', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT er.*, e.full_name, e.employee_id as emp_code
      FROM exitrecords_table er
      JOIN employees_table e ON er.employee_id = e.id
      ORDER BY er.exit_date DESC
      LIMIT 5
    `)
    res.json(rows)
  } catch (error) {
    console.error('Get recent exits error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get SIM status distribution
router.get('/sim-distribution', authenticateSession, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM simcards_table
      GROUP BY status
    `)
    res.json(rows)
  } catch (error) {
    console.error('Get SIM distribution error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
