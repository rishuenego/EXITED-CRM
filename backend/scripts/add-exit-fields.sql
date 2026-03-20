-- Add new fields to exitrecords_table for CRM/Mail and Dialer tracking
-- Run this migration to add the new columns

USE Exited_crm;

-- Add crm_mail_removed column (for both Sales and Admin/Digital)
ALTER TABLE exitrecords_table
ADD COLUMN crm_mail_removed BOOLEAN DEFAULT FALSE AFTER whatsapp_logged_out;

-- Add dialer_removed column (for Sales only)
ALTER TABLE exitrecords_table
ADD COLUMN dialer_removed BOOLEAN DEFAULT FALSE AFTER crm_mail_removed;
