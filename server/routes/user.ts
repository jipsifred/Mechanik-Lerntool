import { Router } from 'express';
import type { Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

function getDb(): import('better-sqlite3').Database {
  return (globalThis as any).__usersDb;
}

// ── Progress ──────────────────────────────────────────────

router.get('/progress', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const taskProgress = db
    .prepare('SELECT task_id, status, last_seen_at FROM user_task_progress WHERE user_id = ?')
    .all(req.userId);
  const subtaskProgress = db
    .prepare('SELECT subtask_id, is_solved, solved_at FROM user_subtask_progress WHERE user_id = ?')
    .all(req.userId);
  res.json({ taskProgress, subtaskProgress });
});

router.put('/progress/task/:id', (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { status } = req.body as { status?: string };
  const allowed = ['untouched', 'in_progress', 'done'];
  if (!allowed.includes(status ?? '')) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO user_task_progress (user_id, task_id, status, last_seen_at)
     VALUES (?, ?, ?, unixepoch())
     ON CONFLICT(user_id, task_id) DO UPDATE SET status = excluded.status, last_seen_at = excluded.last_seen_at`
  ).run(req.userId, taskId, status);
  res.json({ ok: true });
});

router.put('/progress/subtask/:id', (req: AuthRequest, res: Response) => {
  const subtaskId = parseInt(req.params.id, 10);
  const { is_solved } = req.body as { is_solved?: boolean };
  const db = getDb();
  db.prepare(
    `INSERT INTO user_subtask_progress (user_id, subtask_id, is_solved, solved_at)
     VALUES (?, ?, ?, CASE WHEN ? = 1 THEN unixepoch() ELSE NULL END)
     ON CONFLICT(user_id, subtask_id) DO UPDATE SET
       is_solved = excluded.is_solved,
       solved_at = excluded.solved_at`
  ).run(req.userId, subtaskId, is_solved ? 1 : 0, is_solved ? 1 : 0);
  res.json({ ok: true });
});

// ── Flashcards ────────────────────────────────────────────

router.get('/flashcards', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const cards = db
    .prepare('SELECT * FROM flashcards WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId);
  res.json({ flashcards: cards });
});

router.post('/flashcards', (req: AuthRequest, res: Response) => {
  const { front, back, task_id } = req.body as { front?: string; back?: string; task_id?: number };
  if (!front || !back) {
    res.status(400).json({ error: 'front and back are required' });
    return;
  }
  const db = getDb();
  const result = db
    .prepare('INSERT INTO flashcards (user_id, front, back, task_id) VALUES (?, ?, ?, ?)')
    .run(req.userId, front, back, task_id ?? null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/flashcards/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id, 10),
    req.userId
  );
  res.json({ ok: true });
});

// ── Errors ────────────────────────────────────────────────

router.get('/errors', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const errors = db
    .prepare('SELECT * FROM user_errors WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId);
  res.json({ errors });
});

router.post('/errors', (req: AuthRequest, res: Response) => {
  const { task_id, subtask_id, note } = req.body as {
    task_id?: number;
    subtask_id?: number;
    note?: string;
  };
  const db = getDb();
  const result = db
    .prepare('INSERT INTO user_errors (user_id, task_id, subtask_id, note) VALUES (?, ?, ?, ?)')
    .run(req.userId, task_id ?? null, subtask_id ?? null, note ?? null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/errors/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM user_errors WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id, 10),
    req.userId
  );
  res.json({ ok: true });
});

// ── Formulas ──────────────────────────────────────────────

router.get('/formulas', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const formulas = db
    .prepare('SELECT * FROM user_formulas WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.userId);
  res.json({ formulas });
});

router.post('/formulas', (req: AuthRequest, res: Response) => {
  const { title, latex } = req.body as { title?: string; latex?: string };
  if (!title || !latex) {
    res.status(400).json({ error: 'title and latex are required' });
    return;
  }
  const db = getDb();
  const result = db
    .prepare('INSERT INTO user_formulas (user_id, title, latex) VALUES (?, ?, ?)')
    .run(req.userId, title, latex);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/formulas/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM user_formulas WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id, 10),
    req.userId
  );
  res.json({ ok: true });
});

export default router;
