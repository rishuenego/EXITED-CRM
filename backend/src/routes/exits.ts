import { Router, Response } from "express";
import pool from "../config/database.js";
import { authenticateSession, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Get all exit records
router.get(
  "/",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    try {
      const { exit_type, search } = req.query;
      let query = `
      SELECT er.*, 
             e.full_name as employee_name, 
             e.employee_id as emp_code,
             sg.full_name as sim_given_to_name,
             lg.full_name as laptop_given_to_name,
             u.full_name as processed_by_name
      FROM exitrecords_table er
      JOIN employees_table e ON er.employee_id = e.id
      LEFT JOIN employees_table sg ON er.sim_given_to = sg.id
      LEFT JOIN employees_table lg ON er.laptop_given_to = lg.id
      LEFT JOIN users_exit u ON er.processed_by = u.id
      WHERE 1=1
    `;
      const params: any[] = [];

      if (exit_type && exit_type !== "all") {
        query += " AND er.exit_type = ?";
        params.push(exit_type);
      }

      if (search) {
        query += " AND (e.full_name LIKE ? OR e.employee_id LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      query += " ORDER BY er.created_at DESC";

      const [rows] = await pool.execute(query, params);
      res.json(rows);
    } catch (error) {
      console.error("Get exit records error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get single exit record with credentials
router.get(
  "/:id",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    try {
      const [exitRows] = await pool.execute(
        `SELECT er.*, 
              e.full_name as employee_name, 
              e.employee_id as emp_code,
              sg.full_name as sim_given_to_name,
              lg.full_name as laptop_given_to_name
       FROM exitrecords_table er
       JOIN employees_table e ON er.employee_id = e.id
       LEFT JOIN employees_table sg ON er.sim_given_to = sg.id
       LEFT JOIN employees_table lg ON er.laptop_given_to = lg.id
       WHERE er.id = ?`,
        [req.params.id],
      );
      const exits = exitRows as any[];

      if (exits.length === 0) {
        return res.status(404).json({ error: "Exit record not found" });
      }

      // Get credentials and parse JSON stored values
      const [credRows] = await pool.execute(
        "SELECT * FROM exit_credentials WHERE exit_record_id = ?",
        [req.params.id],
      );

      // Parse credentials - support both new JSON format and old format
      const credentials = (credRows as any[]).map((cred) => {
        if (cred.field_type === "credential") {
          try {
            return JSON.parse(cred.field_value);
          } catch {
            return cred;
          }
        }
        // Old format - convert to new structure
        return {
          label: cred.field_name,
          url: "",
          username: cred.field_type === "id" ? cred.field_value : "",
          password: cred.field_type === "password" ? cred.field_value : "",
          notes: cred.notes || "",
        };
      });

      res.json({ ...exits[0], credentials });
    } catch (error) {
      console.error("Get exit record error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Create exit record
router.post(
  "/",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        employee_id,
        exit_type,
        exit_date,
        sim_taken,
        whatsapp_logged_out,
        crm_mail_removed,
        dialer_removed,
        laptop_taken,
        sim_given_to,
        laptop_given_to,
        accessories,
        remarks,
        reason,
        credentials,
      } = req.body;

      if (!employee_id || !exit_type || !exit_date) {
        return res
          .status(400)
          .json({ error: "Employee, exit type, and exit date are required" });
      }

      // Create exit record
      const [result] = await connection.execute(
        `INSERT INTO exitrecords_table 
       (employee_id, exit_type, exit_date, sim_taken, whatsapp_logged_out, crm_mail_removed, dialer_removed, laptop_taken, 
        sim_given_to, laptop_given_to, accessories, remarks, reason, processed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee_id,
          exit_type,
          exit_date,
          sim_taken || false,
          whatsapp_logged_out || false,
          crm_mail_removed || false,
          dialer_removed || false,
          laptop_taken || null,
          sim_given_to || null,
          laptop_given_to || null,
          accessories || null,
          remarks || null,
          reason || null,
          req.user?.id,
        ],
      );

      const exitRecordId = (result as any).insertId;

      // Insert credentials if provided - store each credential as one row with JSON structure
      if (credentials && Array.isArray(credentials) && credentials.length > 0) {
        for (const cred of credentials) {
          // New format with label, url, username, password, notes
          const label = cred.label || "Account";
          const credentialData = JSON.stringify({
            label: cred.label || "",
            url: cred.url || "",
            username: cred.username || "",
            password: cred.password || "",
            notes: cred.notes || "",
          });

          await connection.execute(
            `INSERT INTO exit_credentials (exit_record_id, field_name, field_type, field_value, notes)
           VALUES (?, ?, ?, ?, ?)`,
            [
              exitRecordId,
              label,
              "credential",
              credentialData,
              cred.notes || null,
            ],
          );
        }
      }

      // Update employee status to exited
      await connection.execute(
        "UPDATE employees_table SET status = ? WHERE id = ?",
        ["exited", employee_id],
      );

      await connection.commit();
      res
        .status(201)
        .json({
          id: exitRecordId,
          message: "Exit record created successfully",
        });
    } catch (error) {
      await connection.rollback();
      console.error("Create exit record error:", error);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      connection.release();
    }
  },
);

// Update exit record
router.put(
  "/:id",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        exit_type,
        exit_date,
        sim_taken,
        whatsapp_logged_out,
        crm_mail_removed,
        dialer_removed,
        laptop_taken,
        sim_given_to,
        laptop_given_to,
        accessories,
        remarks,
        reason,
        credentials,
      } = req.body;

      await connection.execute(
        `UPDATE exitrecords_table SET 
       exit_type = ?, exit_date = ?, sim_taken = ?, whatsapp_logged_out = ?, 
       crm_mail_removed = ?, dialer_removed = ?, laptop_taken = ?, sim_given_to = ?, 
       laptop_given_to = ?, accessories = ?, remarks = ?, reason = ?
       WHERE id = ?`,
        [
          exit_type,
          exit_date,
          sim_taken,
          whatsapp_logged_out,
          crm_mail_removed || false,
          dialer_removed || false,
          laptop_taken,
          sim_given_to || null,
          laptop_given_to || null,
          accessories || null,
          remarks || null,
          reason || null,
          req.params.id,
        ],
      );

      // Update credentials - delete old and insert new
      await connection.execute(
        "DELETE FROM exit_credentials WHERE exit_record_id = ?",
        [req.params.id],
      );

      if (credentials && Array.isArray(credentials) && credentials.length > 0) {
        for (const cred of credentials) {
          const label = cred.label || "Account";
          const credentialData = JSON.stringify({
            label: cred.label || "",
            url: cred.url || "",
            username: cred.username || "",
            password: cred.password || "",
            notes: cred.notes || "",
          });

          await connection.execute(
            `INSERT INTO exit_credentials (exit_record_id, field_name, field_type, field_value, notes)
           VALUES (?, ?, ?, ?, ?)`,
            [
              req.params.id,
              label,
              "credential",
              credentialData,
              cred.notes || null,
            ],
          );
        }
      }

      await connection.commit();
      res.json({ message: "Exit record updated successfully" });
    } catch (error) {
      await connection.rollback();
      console.error("Update exit record error:", error);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      connection.release();
    }
  },
);

// Delete exit record
router.delete(
  "/:id",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    try {
      // Get employee_id before deleting
      const [rows] = await pool.execute(
        "SELECT employee_id FROM exitrecords_table WHERE id = ?",
        [req.params.id],
      );
      const exits = rows as any[];

      if (exits.length > 0) {
        // Optionally reactivate employee
        await pool.execute(
          "UPDATE employees_table SET status = ? WHERE id = ?",
          ["active", exits[0].employee_id],
        );
      }

      await pool.execute("DELETE FROM exitrecords_table WHERE id = ?", [
        req.params.id,
      ]);
      res.json({ message: "Exit record deleted successfully" });
    } catch (error) {
      console.error("Delete exit record error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Bulk upload exit records
router.post(
  "/bulk",
  authenticateSession,
  async (req: AuthRequest, res: Response) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "No data provided" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as { row: number; error: string }[],
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const connection = await pool.getConnection();

        try {
          const { employee_name, exit_date, department, reason } = row;

          if (!employee_name || !exit_date) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              error: "Employee name and exit date are required",
            });
            connection.release();
            continue;
          }

          // Find employee by name
          const [employees] = await connection.execute(
            "SELECT id FROM employees_table WHERE full_name LIKE ? AND status = ? LIMIT 1",
            [`%${employee_name.trim()}%`, "active"]
          );
          const empRows = employees as any[];

          if (empRows.length === 0) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              error: `Employee "${employee_name}" not found or already exited`,
            });
            connection.release();
            continue;
          }

          const employeeId = empRows[0].id;

          // Normalize department/exit_type
          let exitType = "sales";
          if (department) {
            const normalizedDept = department.toLowerCase().trim();
            if (
              normalizedDept === "admin" ||
              normalizedDept === "admin_digital" ||
              normalizedDept === "admin/digital" ||
              normalizedDept === "hr" ||
              normalizedDept === "accounts" ||
              normalizedDept === "accountant" ||
              normalizedDept === "director"
            ) {
              exitType = "admin_digital";
            }
          }

          await connection.beginTransaction();

          // Create exit record
          await connection.execute(
            `INSERT INTO exitrecords_table 
             (employee_id, exit_type, exit_date, sim_taken, whatsapp_logged_out, crm_mail_removed, dialer_removed, laptop_taken, reason, processed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              employeeId,
              exitType,
              exit_date,
              false,
              false,
              false,
              false,
              false,
              reason || null,
              req.user?.id,
            ]
          );

          // Update employee status to exited
          await connection.execute(
            "UPDATE employees_table SET status = ? WHERE id = ?",
            ["exited", employeeId]
          );

          await connection.commit();
          results.success++;
        } catch (error: any) {
          await connection.rollback();
          results.failed++;
          results.errors.push({
            row: i + 2,
            error: error.message || "Unknown error",
          });
        } finally {
          connection.release();
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Bulk upload exits error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
