import dotenv from 'dotenv'
dotenv.config()

import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'Exited_crm',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.MYSQL_HOST?.includes('rds.amazonaws.com') ? {
    rejectUnauthorized: false
  } : undefined
})

async function initUsers() {
  console.log('\n========================================')
  console.log('    INITIALIZING DEFAULT USERS')
  console.log('========================================\n')

  try {
    // Test connection first
    console.log('Connecting to database...')
    const connection = await pool.getConnection()
    console.log('Connected successfully!\n')

    // Create users_exit table if it doesn't exist
    console.log('Ensuring users_exit table exists...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users_exit (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'hr') NOT NULL DEFAULT 'hr',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    console.log('Table ready.\n')

    // Check if users already exist
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users_exit')
    const userCount = (existingUsers as any)[0].count

    if (userCount > 0) {
      console.log(`Found ${userCount} existing user(s).`)
      
      // Show existing users
      const [users] = await connection.execute('SELECT id, username, email, role, is_active FROM users_exit')
      console.log('\nExisting users:')
      console.table(users)
      
      console.log('\nSkipping user creation. Delete existing users first if you want to recreate them.')
    } else {
      // Insert default users
      console.log('Creating default users...\n')
      
      const defaultUsers = [
        {
          username: 'admin',
          email: 'admin@exitedcrm.com',
          password: 'admin123',
          full_name: 'System Administrator',
          role: 'admin'
        },
        {
          username: 'hr',
          email: 'hr@exitedcrm.com',
          password: 'hr123',
          full_name: 'HR Manager',
          role: 'hr'
        }
      ]

      for (const user of defaultUsers) {
        try {
          await connection.execute(
            `INSERT INTO users_exit (username, email, password, full_name, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [user.username, user.email, user.password, user.full_name, user.role]
          )
          console.log(`Created user: ${user.username} (${user.role})`)
        } catch (err: any) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log(`User ${user.username} already exists, skipping.`)
          } else {
            throw err
          }
        }
      }

      console.log('\n========================================')
      console.log('    DEFAULT CREDENTIALS')
      console.log('========================================')
      console.log('Admin: username=admin, password=admin123')
      console.log('HR:    username=hr, password=hr123')
      console.log('========================================\n')
    }

    connection.release()
    console.log('\nUser initialization complete!')
    
  } catch (error: any) {
    console.error('\n*** ERROR ***')
    console.error(`Code: ${error.code}`)
    console.error(`Message: ${error.message}`)
    
    if (error.code === 'ENOTFOUND') {
      console.error('\nCannot reach database host. Check MYSQL_HOST in .env')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nConnection refused. Is MySQL server running?')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied. Check MYSQL_USER and MYSQL_PASSWORD in .env')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nDatabase does not exist. Create it first with:')
      console.error('  CREATE DATABASE Exited_crm;')
    }
    
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

initUsers()
