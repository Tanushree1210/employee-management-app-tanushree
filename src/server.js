const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const value = email.trim();
  const atIndex = value.indexOf("@");
  const lastDotIndex = value.lastIndexOf(".");
  const hasSingleAt = atIndex > 0 && atIndex === value.lastIndexOf("@");
  const hasDotAfterAt = lastDotIndex > atIndex + 1;
  const hasTld = lastDotIndex < value.length - 1;
  return hasSingleAt && hasDotAfterAt && hasTld;
}

function validateEmployeeInput(body) {
  const requiredFields = ["name", "email", "department", "role", "hireDate"];
  const missingFields = requiredFields.filter((field) => !String(body[field] || "").trim());

  if (missingFields.length > 0) {
    return { isValid: false, message: `Missing required fields: ${missingFields.join(", ")}` };
  }

  if (!isValidEmail(body.email)) {
    return { isValid: false, message: "Invalid email format" };
  }

  const hireDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!hireDatePattern.test(body.hireDate) || Number.isNaN(Date.parse(body.hireDate))) {
    return { isValid: false, message: "Invalid hire date format. Use YYYY-MM-DD" };
  }

  return { isValid: true };
}

async function createApp(options = {}) {
  const dbPath =
    options.dbPath || path.join(process.cwd(), "data", "employees.db");

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new sqlite3.Database(dbPath);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      hireDate TEXT NOT NULL
    )`
  );

  const app = express();
  app.use(express.json());

  if (!options.disableStatic) {
    app.use("/vendor/react", express.static(path.join(process.cwd(), "node_modules", "react", "umd")));
    app.use(
      "/vendor/react-dom",
      express.static(path.join(process.cwd(), "node_modules", "react-dom", "umd"))
    );
    app.use(
      "/vendor/babel",
      express.static(path.join(process.cwd(), "node_modules", "@babel", "standalone"))
    );
    app.use(express.static(path.join(process.cwd(), "public")));
  }

  app.get("/api/employees", async (req, res, next) => {
    try {
      const { department, search } = req.query;
      const whereClauses = [];
      const params = [];

      if (department) {
        whereClauses.push("department = ?");
        params.push(department);
      }

      if (search) {
        whereClauses.push("(name LIKE ? OR email LIKE ? OR role LIKE ?)");
        const wildcard = `%${search}%`;
        params.push(wildcard, wildcard, wildcard);
      }

      const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const rows = await all(
        db,
        `SELECT id, name, email, department, role, hireDate
         FROM employees
         ${where}
         ORDER BY id DESC`,
        params
      );

      res.json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/employees/:id", async (req, res, next) => {
    try {
      const employee = await get(
        db,
        "SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?",
        [req.params.id]
      );

      if (!employee) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      res.json(employee);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/employees", async (req, res, next) => {
    try {
      const validation = validateEmployeeInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.message });
        return;
      }

      const { name, email, department, role, hireDate } = req.body;
      const result = await run(
        db,
        "INSERT INTO employees(name, email, department, role, hireDate) VALUES(?, ?, ?, ?, ?)",
        [name.trim(), email.trim(), department.trim(), role.trim(), hireDate.trim()]
      );

      const created = await get(
        db,
        "SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?",
        [result.lastID]
      );

      res.status(201).json(created);
    } catch (error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(409).json({ error: "Employee email must be unique" });
        return;
      }
      next(error);
    }
  });

  app.put("/api/employees/:id", async (req, res, next) => {
    try {
      const current = await get(db, "SELECT id FROM employees WHERE id = ?", [req.params.id]);
      if (!current) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      const validation = validateEmployeeInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.message });
        return;
      }

      const { name, email, department, role, hireDate } = req.body;
      await run(
        db,
        "UPDATE employees SET name = ?, email = ?, department = ?, role = ?, hireDate = ? WHERE id = ?",
        [name.trim(), email.trim(), department.trim(), role.trim(), hireDate.trim(), req.params.id]
      );

      const updated = await get(
        db,
        "SELECT id, name, email, department, role, hireDate FROM employees WHERE id = ?",
        [req.params.id]
      );

      res.json(updated);
    } catch (error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        res.status(409).json({ error: "Employee email must be unique" });
        return;
      }
      next(error);
    }
  });

  app.delete("/api/employees/:id", async (req, res, next) => {
    try {
      const result = await run(db, "DELETE FROM employees WHERE id = ?", [req.params.id]);
      if (result.changes === 0) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    } else {
      console.error(`Unhandled server error: ${err?.name || "Error"}`);
    }
    res.status(500).json({ error: "Internal server error" });
  });

  app.locals.db = db;
  return app;
}

async function createServer(options = {}) {
  const app = await createApp(options);
  const port = Number(options.port ?? process.env.PORT ?? 3000);

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve({ app, server, db: app.locals.db });
    });
  });
}

if (require.main === module) {
  createServer().then(({ server }) => {
    const { port } = server.address();
    console.log(`Employee Management System running on http://localhost:${port}`);
  }).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  createServer,
  closeDatabase,
};
