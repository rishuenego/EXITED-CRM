-- Exited Data CRM Database Schema
-- Database: Exited_crm
-- Tables: employees_table, exit_credentials, exitrecords_table, simcards_table, users_exit

USE Exited_crm;

-- Users table for authentication
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
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department ENUM('sales', 'admin_digital') NOT NULL,
    designation VARCHAR(100),
    joining_date DATE,
    status ENUM('active', 'exited') DEFAULT 'active',
    exit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SIM cards table
CREATE TABLE IF NOT EXISTS simcards_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sim_number VARCHAR(20) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    employee_id INT,
    provider VARCHAR(50),
    status ENUM('active', 'inactive', 'returned') DEFAULT 'active',
    assigned_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_table(id) ON DELETE SET NULL
);

-- Exit records table
CREATE TABLE IF NOT EXISTS exitrecords_table (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    exit_type ENUM('sales', 'admin_digital') NOT NULL,
    exit_date DATE NOT NULL,
    sim_taken BOOLEAN DEFAULT FALSE,
    whatsapp_logged_out BOOLEAN DEFAULT FALSE,
    laptop_taken BOOLEAN,
    sim_given_to INT,
    laptop_given_to INT,
    accessories TEXT,
    remarks TEXT,
    processed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_table(id) ON DELETE CASCADE,
    FOREIGN KEY (sim_given_to) REFERENCES employees_table(id) ON DELETE SET NULL,
    FOREIGN KEY (laptop_given_to) REFERENCES employees_table(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users_exit(id) ON DELETE SET NULL
);

-- Exit credentials table for storing IDs, passwords, URLs etc.
CREATE TABLE IF NOT EXISTS exit_credentials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exit_record_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type ENUM('id', 'password', 'url', 'other') DEFAULT 'other',
    field_value TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exit_record_id) REFERENCES exitrecords_table(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_employees_status ON employees_table(status);
CREATE INDEX idx_employees_department ON employees_table(department);
CREATE INDEX idx_simcards_status ON simcards_table(status);
CREATE INDEX idx_simcards_employee ON simcards_table(employee_id);
CREATE INDEX idx_exitrecords_employee ON exitrecords_table(employee_id);
CREATE INDEX idx_exitrecords_date ON exitrecords_table(exit_date);
CREATE INDEX idx_exit_credentials_record ON exit_credentials(exit_record_id);
