import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import { config as dotenvConfig } from 'dotenv';
import { resolve as pathResolve } from 'path';
// Load .env.local first (overrides), then fall back to .env
dotenvConfig({ path: pathResolve(process.cwd(), '.env.local') });
dotenvConfig({ path: pathResolve(process.cwd(), '.env') });

import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// ── Task DB (readonly) ────────────────────────────────────
const DB_PATH = path.resolve(import.meta.dirname, 'db/mechanik.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Users DB (writable) ───────────────────────────────────
const USERS_DB_PATH = process.env.USERS_DB_PATH || path.resolve(import.meta.dirname, 'db/users.db');
const usersDb = new Database(USERS_DB_PATH);
usersDb.pragma('journal_mode = WAL');
usersDb.pragma('foreign_keys = ON');

// Init schema
const schemaSql = fs.readFileSync(
  path.resolve(import.meta.dirname, 'db/users-schema.sql'),
  'utf-8'
);
usersDb.exec(schemaSql);

// Column migrations (safe to run multiple times)
try { usersDb.exec(`ALTER TABLE user_task_progress ADD COLUMN check_state TEXT NOT NULL DEFAULT 'none'`); } catch { /* column already exists */ }

// Migrate user_formulas from old title/latex schema to new task_id/note schema
try {
  const cols = usersDb.prepare('PRAGMA table_info(user_formulas)').all() as { name: string }[];
  if (cols.some(c => c.name === 'title')) {
    usersDb.exec('DROP TABLE user_formulas');
    usersDb.exec(`CREATE TABLE user_formulas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id    INTEGER,
      subtask_id INTEGER,
      note       TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`);
  }
} catch { /* table doesn't exist yet, schema will create it */ }

// Add category column to user_formulas for chapter-mode formulas
try { usersDb.exec(`ALTER TABLE user_formulas ADD COLUMN category TEXT DEFAULT NULL`); } catch { /* column already exists */ }

// Make usersDb accessible in route handlers via globalThis
(globalThis as any).__usersDb = usersDb;

// ── Middleware ────────────────────────────────────────────
if (!isProd) {
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:7862',
    credentials: true,
  }));
}
app.use(express.json());
app.use(cookieParser());
app.use('/images', express.static(path.resolve(import.meta.dirname, '../public/images')));

// ── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Routes ────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/user', userRouter);

// ── GET /api/tasks — list all tasks ──────────────────────
app.get('/api/tasks', (_req, res) => {
  const tasks = db.prepare('SELECT id, title, total_points, category FROM tasks ORDER BY id').all();
  res.json({ tasks, total: tasks.length });
});

// ── GET /api/tasks/by-category/:code ─────────────────────
app.get('/api/tasks/by-category/:code', (req, res) => {
  const code = req.params.code;
  const tasks = db.prepare('SELECT * FROM tasks WHERE category = ? ORDER BY id').all(code) as any[];
  const result = tasks.map((task) => {
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY ff_index').all(task.id);
    return { ...task, subtasks };
  });
  res.json({ tasks: result });
});

// ── GET /api/tasks/by-index/:index ───────────────────────
app.get('/api/tasks/by-index/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0) {
    res.status(400).json({ error: 'Invalid index' });
    return;
  }

  const task = db
    .prepare('SELECT * FROM tasks ORDER BY id LIMIT 1 OFFSET ?')
    .get(index) as any;

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY ff_index')
    .all(task.id);

  const total = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;

  res.json({ task, subtasks, total });
});

// ── GET /api/tasks/:id ────────────────────────────────────
app.get('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY ff_index')
    .all(task.id);

  const total = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;

  res.json({ task, subtasks, total });
});

// ── PUT /api/tasks/:id/given — update given variables for a task
app.put('/api/tasks/:id/given', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const { given_variables, given_latex } = req.body;

  if (given_variables !== undefined) {
    db.prepare('UPDATE tasks SET given_variables = ? WHERE id = ?')
      .run(JSON.stringify(given_variables), id);
  }

  if (given_latex !== undefined) {
    db.prepare('UPDATE tasks SET given_latex = ? WHERE id = ?')
      .run(given_latex, id);
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ task: updated });
});

// ── Serve frontend in production ─────────────────────────
if (isProd) {
  const distPath = path.resolve(import.meta.dirname, '../dist');
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  const count = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
  console.log(`Serving ${count} tasks from ${DB_PATH}`);
  console.log(`Users DB: ${USERS_DB_PATH}`);
});
