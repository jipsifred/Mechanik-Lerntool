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
import { tryGetUserId } from './middleware/auth.js';
import {
  isCustomCategoryCode,
  isSyntheticCustomTaskId,
  parseCustomCategoryId,
  toRawCustomTaskId,
  toSyntheticSubtaskId,
  toSyntheticTaskId,
} from './utils/customTasks.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const devAuthBypassEnabled = !isProd && process.env.DEV_AUTH_BYPASS === '1';
const devAuthBypassUser = {
  id: 999001,
  email: 'local-dev-auth@mechanik.local',
  username: 'Local Dev',
  passwordHash: 'dev-auth-bypass',
};

// ── Task DB (readonly) ────────────────────────────────────
const DB_PATH = path.resolve(import.meta.dirname, 'db/mechanik.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ── Users DB (writable) ───────────────────────────────────
const USERS_DB_PATH = process.env.USERS_DB_PATH || path.resolve(import.meta.dirname, 'db/users.db');
const usersDb = new Database(USERS_DB_PATH);
usersDb.pragma('journal_mode = WAL');
usersDb.pragma('foreign_keys = ON');

function ensureCustomLibrarySchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_custom_categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS user_custom_tasks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id     INTEGER NOT NULL REFERENCES user_custom_categories(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      total_points    INTEGER NOT NULL DEFAULT 0,
      description     TEXT NOT NULL,
      given_latex     TEXT NOT NULL DEFAULT '',
      given_variables TEXT NOT NULL DEFAULT '{}',
      image_url       TEXT DEFAULT NULL,
      raw_json        TEXT NOT NULL DEFAULT '{}',
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS user_custom_subtasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       INTEGER NOT NULL REFERENCES user_custom_tasks(id) ON DELETE CASCADE,
      ff_index      INTEGER NOT NULL,
      label         TEXT NOT NULL DEFAULT '',
      description   TEXT NOT NULL DEFAULT '',
      math_prefix   TEXT NOT NULL DEFAULT '',
      math_suffix   TEXT NOT NULL DEFAULT '',
      solution      TEXT NOT NULL DEFAULT '',
      points        INTEGER NOT NULL DEFAULT 0,
      raw_formula   TEXT NOT NULL DEFAULT '',
      formula_group INTEGER NOT NULL DEFAULT 0,
      UNIQUE(task_id, ff_index)
    );
  `);

  try { db.exec(`ALTER TABLE user_custom_categories ADD COLUMN description TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_categories ADD COLUMN created_at INTEGER DEFAULT (unixepoch())`); } catch { /* column already exists */ }

  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN description TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN given_latex TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN given_variables TEXT NOT NULL DEFAULT '{}'`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN image_url TEXT DEFAULT NULL`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN raw_json TEXT NOT NULL DEFAULT '{}'`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_tasks ADD COLUMN created_at INTEGER DEFAULT (unixepoch())`); } catch { /* column already exists */ }

  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN label TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN description TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN math_prefix TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN math_suffix TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN solution TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN points INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN raw_formula TEXT NOT NULL DEFAULT ''`); } catch { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_custom_subtasks ADD COLUMN formula_group INTEGER NOT NULL DEFAULT 0`); } catch { /* column already exists */ }
}

// Init schema
const schemaSql = fs.readFileSync(
  path.resolve(import.meta.dirname, 'db/users-schema.sql'),
  'utf-8'
);
usersDb.exec(schemaSql);
ensureCustomLibrarySchema(usersDb);

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

if (devAuthBypassEnabled) {
  const existingUser = usersDb.prepare('SELECT id FROM users WHERE id = ?').get(devAuthBypassUser.id);
  if (!existingUser) {
    usersDb.prepare(
      'INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)'
    ).run(
      devAuthBypassUser.id,
      devAuthBypassUser.email,
      devAuthBypassUser.username,
      devAuthBypassUser.passwordHash
    );
  }
}

// Make usersDb accessible in route handlers via globalThis
(globalThis as any).__usersDb = usersDb;

function listDefaultTasks() {
  return db.prepare('SELECT id, title, total_points, category FROM tasks ORDER BY id').all() as Array<{
    id: number;
    title: string;
    total_points: number;
    category: string;
  }>;
}

function listCustomTasks(userId: number) {
  const rows = usersDb.prepare(`
    SELECT
      t.id,
      t.title,
      t.total_points,
      c.code AS category
    FROM user_custom_tasks t
    JOIN user_custom_categories c ON c.id = t.category_id
    WHERE t.user_id = ?
    ORDER BY c.sort_order, c.id, t.sort_order, t.id
  `).all(userId) as Array<{
    id: number;
    title: string;
    total_points: number;
    category: string;
  }>;

  return rows.map((row) => ({
    ...row,
    id: toSyntheticTaskId(row.id),
  }));
}

function getMergedTaskList(userId: number | null) {
  const defaults = listDefaultTasks();
  return userId ? [...defaults, ...listCustomTasks(userId)] : defaults;
}

function getDefaultTaskDetail(taskId: number) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) return null;

  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY ff_index')
    .all(task.id);

  return { task, subtasks };
}

function getCustomTaskDetail(userId: number, syntheticTaskId: number) {
  const rawTaskId = toRawCustomTaskId(syntheticTaskId);
  const task = usersDb.prepare(`
    SELECT
      t.id,
      t.title,
      t.total_points,
      t.description,
      t.given_latex,
      t.given_variables,
      t.image_url,
      c.code AS category
    FROM user_custom_tasks t
    JOIN user_custom_categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.id = ?
    LIMIT 1
  `).get(userId, rawTaskId) as any;

  if (!task) return null;

  const subtasks = usersDb
    .prepare('SELECT * FROM user_custom_subtasks WHERE task_id = ? ORDER BY ff_index')
    .all(rawTaskId) as any[];

  return {
    task: {
      id: syntheticTaskId,
      page_start: 0,
      title: task.title,
      total_points: task.total_points,
      description: task.description,
      given_latex: task.given_latex,
      given_variables: task.given_variables,
      image_url: task.image_url,
      image_bbox: null,
      category: task.category,
    },
    subtasks: subtasks.map((subtask) => ({
      ...subtask,
      id: toSyntheticSubtaskId(subtask.id),
      task_id: syntheticTaskId,
    })),
  };
}

// ── Middleware ────────────────────────────────────────────
if (!isProd) {
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:7862',
    credentials: true,
  }));
}
app.use(express.json({ limit: '12mb' }));
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
app.get('/api/tasks', (req, res) => {
  const userId = tryGetUserId(req);
  const tasks = getMergedTaskList(userId);
  res.json({ tasks, total: tasks.length });
});

// ── GET /api/tasks/by-category/:code ─────────────────────
app.get('/api/tasks/by-category/:code', (req, res) => {
  const code = req.params.code;
  const userId = tryGetUserId(req);

  if (isCustomCategoryCode(code)) {
    if (!userId) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    const categoryId = parseCustomCategoryId(code);
    if (!categoryId) {
      res.status(400).json({ error: 'Invalid category code' });
      return;
    }

    const tasks = usersDb.prepare(`
      SELECT
        t.id,
        t.title,
        t.total_points,
        t.description,
        t.given_latex,
        t.given_variables,
        t.image_url,
        c.code AS category
      FROM user_custom_tasks t
      JOIN user_custom_categories c ON c.id = t.category_id
      WHERE t.user_id = ? AND c.id = ?
      ORDER BY t.sort_order, t.id
    `).all(userId, categoryId) as any[];

    const result = tasks.map((task) => {
      const syntheticTaskId = toSyntheticTaskId(task.id);
      const subtasks = usersDb
        .prepare('SELECT * FROM user_custom_subtasks WHERE task_id = ? ORDER BY ff_index')
        .all(task.id)
        .map((subtask: any) => ({
          ...subtask,
          id: toSyntheticSubtaskId(subtask.id),
          task_id: syntheticTaskId,
        }));

      return {
        id: syntheticTaskId,
        page_start: 0,
        title: task.title,
        total_points: task.total_points,
        description: task.description,
        given_latex: task.given_latex,
        given_variables: task.given_variables,
        image_url: task.image_url,
        image_bbox: null,
        category: task.category,
        subtasks,
      };
    });

    res.json({ tasks: result });
    return;
  }

  const tasks = db.prepare('SELECT * FROM tasks WHERE category = ? ORDER BY id').all(code) as any[];
  const result = tasks.map((task) => ({
    ...task,
    subtasks: db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY ff_index').all(task.id),
  }));
  res.json({ tasks: result });
});

// ── GET /api/tasks/by-index/:index ───────────────────────
app.get('/api/tasks/by-index/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index) || index < 0) {
    res.status(400).json({ error: 'Invalid index' });
    return;
  }

  const userId = tryGetUserId(req);
  const tasks = getMergedTaskList(userId);
  const entry = tasks[index];

  if (!entry) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const detail = isSyntheticCustomTaskId(entry.id)
    ? (userId ? getCustomTaskDetail(userId, entry.id) : null)
    : getDefaultTaskDetail(entry.id);

  if (!detail) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json({ task: detail.task, subtasks: detail.subtasks, total: tasks.length });
});

// ── GET /api/tasks/:id ────────────────────────────────────
app.get('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const userId = tryGetUserId(req);
  const detail = isSyntheticCustomTaskId(id)
    ? (userId ? getCustomTaskDetail(userId, id) : null)
    : getDefaultTaskDetail(id);

  if (!detail) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json({ task: detail.task, subtasks: detail.subtasks, total: getMergedTaskList(userId).length });
});

// ── PUT /api/tasks/:id/given — update given variables for a task
app.put('/api/tasks/:id/given', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  const { given_variables, given_latex } = req.body;

  if (isSyntheticCustomTaskId(id)) {
    const userId = tryGetUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }

    const rawTaskId = toRawCustomTaskId(id);
    const task = usersDb.prepare('SELECT id FROM user_custom_tasks WHERE user_id = ? AND id = ?').get(userId, rawTaskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (given_variables !== undefined) {
      usersDb.prepare('UPDATE user_custom_tasks SET given_variables = ? WHERE id = ?')
        .run(JSON.stringify(given_variables), rawTaskId);
    }

    if (given_latex !== undefined) {
      usersDb.prepare('UPDATE user_custom_tasks SET given_latex = ? WHERE id = ?')
        .run(given_latex, rawTaskId);
    }

    const detail = getCustomTaskDetail(userId, id);
    res.json({ task: detail?.task ?? null });
    return;
  }

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

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
  if (devAuthBypassEnabled) {
    console.log(`Dev auth bypass active for user ${devAuthBypassUser.username} (#${devAuthBypassUser.id})`);
  }
});
