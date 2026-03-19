import { Router, Response } from 'express'
import pool from '../config/database.js'
import { authenticateSession, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all dashboard statistics in a single call
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

    // Get monthly exit trends
    const [monthlyData] = await pool.execute(`
      SELECT 
        DATE_FORMAT(exit_date, '%b %Y') as month,
        COUNT(*) as count,
        SUM(CASE WHEN exit_type = 'sales' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN exit_type = 'admin_digital' THEN 1 ELSE 0 END) as admin_digital
      FROM exitrecords_table
      WHERE exit_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(exit_date, '%Y-%m'), DATE_FORMAT(exit_date, '%b %Y')
      ORDER BY DATE_FORMAT(exit_date, '%Y-%m')
    `)

    // Get department distribution
    const [departmentData] = await pool.execute(`
      SELECT 
        department as name,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'exited' THEN 1 ELSE 0 END) as exited
      FROM employees_table
      GROUP BY department
    `)

    // Get recent exits with employee names
    const [recentExits] = await pool.execute(`
      SELECT er.id, e.full_name as employee_name, er.exit_type, er.exit_date
      FROM exitrecords_table er
      JOIN employees_table e ON er.employee_id = e.id
      ORDER BY er.exit_date DESC
      LIMIT 5
    `)

    // Get SIM status distribution
    const [simStatusData] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM simcards_table
      GROUP BY status
    `)

    const empStats = (employeeCounts as any[])[0]
    const simStats = (simCounts as any[])[0]
    const exitStats = (exitCounts as any[])[0]

    res.json({
      stats: {
        totalEmployees: Number(empStats.total) || 0,
        activeEmployees: Number(empStats.active) || 0,
        exitedEmployees: Number(empStats.exited) || 0,
        totalSims: Number(simStats.total) || 0,
        activeSims: Number(simStats.active) || 0,
        inactiveSims: Number(simStats.inactive) || 0,
        returnedSims: Number(simStats.returned) || 0,
        totalExits: Number(exitStats.total) || 0,
        salesExits: Number(exitStats.sales) || 0,
        adminDigitalExits: Number(exitStats.admin_digital) || 0,
      },
      monthlyData: monthlyData as any[],
      departmentData: departmentData as any[],
      recentExits: recentExits as any[],
      simStatusData: simStatusData as any[],
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
