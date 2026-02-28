import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
const PORT = 7863;

// DB
const DB_PATH = path.resolve(import.meta.dirname, 'db/mechanik.db');
const db = new Database(DB_PATH, { readonly: true });
db.pragma('journal_mode = WAL');

// Middleware
app.use(cors());
app.use('/images', express.static(path.resolve(import.meta.dirname, '../public/images')));

// ── GET /api/tasks — list all tasks
app.get('/api/tasks', (_req, res) => {
  const tasks = db.prepare('SELECT id, title, total_points FROM tasks ORDER BY id').all();
  res.json({ tasks, total: tasks.length });
});

// ── GET /api/tasks/by-index/:index — task by 0-based index
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

// ── GET /api/tasks/:id — task by ID
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const count = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
  console.log(`Serving ${count} tasks from ${DB_PATH}`);
});
