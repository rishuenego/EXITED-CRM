import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { testConnection } from './config/database.js'
import authRoutes from './routes/auth.js'
import employeeRoutes from './routes/employees.js'
import simRoutes from './routes/sims.js'
import exitRoutes from './routes/exits.js'
import userRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'

const app = express()
const PORT = process.env.PORT || 5000

// CORS configuration for frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean) as string[]

console.log('Allowed CORS origins:', allowedOrigins)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    
    console.warn(`CORS blocked request from origin: ${origin}`)
    return callback(null, true) // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-session-id', 'Authorization']
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/sims', simRoutes)
app.use('/api/exits', exitRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection()
  res.json({ 
    status: dbConnected ? 'ok' : 'error', 
    message: 'Exited Data CRM API',
    database: dbConnected ? 'connected' : 'disconnected'
  })
})

// Start server and test database connection
async function startServer() {
  console.log('\n========================================')
  console.log('       EXITED DATA CRM - BACKEND')
  console.log('========================================\n')
  
  // Test database connection first
  const dbConnected = await testConnection()
  
  if (!dbConnected) {
    console.error('\n*** WARNING: Database is not connected! ***')
    console.error('Please check your .env file and MySQL server.\n')
    console.error('Run this command to initialize the database:')
    console.error('  npm run init-users\n')
  }
  
  app.listen(PORT, () => {
    console.log(`\nServer running on port ${PORT}`)
    console.log(`API available at http://localhost:${PORT}/api`)
    console.log(`Health check at http://localhost:${PORT}/api/health\n`)
  })
}

startServer()

export default app
