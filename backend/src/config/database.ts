import dotenv from 'dotenv'
dotenv.config()

import mysql from 'mysql2/promise'
// Log environment variables to debug
console.log('\n=== Database Configuration ===')
console.log(`MYSQL_HOST: ${process.env.MYSQL_HOST || 'NOT SET'}`)
console.log(`MYSQL_USER: ${process.env.MYSQL_USER || 'NOT SET'}`)
console.log(`MYSQL_DATABASE: ${process.env.MYSQL_DATABASE || 'NOT SET'}`)
console.log(`MYSQL_PASSWORD: ${process.env.MYSQL_PASSWORD ? '****SET****' : 'NOT SET'}`)
console.log('==============================\n')

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'Exited_crm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
  // SSL configuration for AWS RDS
  ssl: process.env.MYSQL_HOST?.includes('rds.amazonaws.com') ? {
    rejectUnauthorized: false
  } : undefined
})

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...')
    const connection = await pool.getConnection()
    console.log('Database connected successfully!')
    connection.release()
    return true
  } catch (error: any) {
    console.error('\n*** DATABASE CONNECTION FAILED ***')
    console.error(`Error Code: ${error.code}`)
    console.error(`Error Message: ${error.message}`)
    if (error.code === 'ENOTFOUND') {
      console.error('The database host could not be found. Check MYSQL_HOST.')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection was refused. Check if MySQL server is running.')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Check MYSQL_USER and MYSQL_PASSWORD.')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('Database does not exist. Check MYSQL_DATABASE.')
    }
    console.error('**********************************\n')
    return false
  }
}

export default pool
