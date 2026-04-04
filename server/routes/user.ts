import { Router } from 'express';
import type { Response } from 'express';
import { verifyToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { EditableCustomTask } from '../utils/customTasks.js';
import {
  isSyntheticCustomTaskId,
  parseCustomTaskJson,
  toCustomCategoryCode,
  toRawCustomTaskId,
  toSyntheticTaskId,
} from '../utils/customTasks.js';

const router = Router();
router.use(verifyToken);

function getDb(): import('better-sqlite3').Database {
  return (globalThis as any).__usersDb;
}

function isImageDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(value);
}

function createPendingCategoryCode(): string {
  return `__pending__:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function getEditableCustomTask(db: import('better-sqlite3').Database, userId: number, taskId: number): EditableCustomTask | null {
  return db.prepare(`
    SELECT
      t.id,
      t.category_id,
      c.code AS category_code,
      t.raw_json AS task_json,
      t.image_url AS image_data_url
    FROM user_custom_tasks t
    JOIN user_custom_categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.id = ?
    LIMIT 1
  `).get(userId, taskId) as EditableCustomTask | null;
}

// ── Progress ──────────────────────────────────────────────

router.get('/progress', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const taskProgress = db
    .prepare('SELECT task_id, status, check_state, last_seen_at FROM user_task_progress WHERE user_id = ?')
    .all(req.userId);
  const subtaskProgress = db
    .prepare('SELECT subtask_id, is_solved, solved_at FROM user_subtask_progress WHERE user_id = ?')
    .all(req.userId);
  res.json({ taskProgress, subtaskProgress });
});

router.put('/progress/task/:id/check', (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id, 10);
  const { check_state } = req.body as { check_state?: string };
  const allowed = ['none', 'green', 'yellow'];
  if (!allowed.includes(check_state ?? '')) {
    res.status(400).json({ error: 'Invalid check_state' });
    return;
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO user_task_progress (user_id, task_id, status, check_state, last_seen_at)
     VALUES (?, ?, 'untouched', ?, unixepoch())
     ON CONFLICT(user_id, task_id) DO UPDATE SET check_state = excluded.check_state`
  ).run(req.userId, taskId, check_state);
  res.json({ ok: true });
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

router.get('/flashcards/by-task/:taskId', (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  const db = getDb();
  const card = db
    .prepare('SELECT * FROM flashcards WHERE user_id = ? AND task_id = ?')
    .get(req.userId, taskId) as Record<string, unknown> | undefined;
  if (!card) {
    res.status(404).json({ error: 'No flashcard for this task' });
    return;
  }
  res.json({ flashcard: card });
});

router.put('/flashcards/by-task/:taskId', (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { front, back } = req.body as { front?: string; back?: string };
  if (!front || !back) {
    res.status(400).json({ error: 'front and back are required' });
    return;
  }
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM flashcards WHERE user_id = ? AND task_id = ?')
    .get(req.userId, taskId) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE flashcards SET front = ?, back = ? WHERE id = ?')
      .run(front, back, existing.id);
    const updated = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(existing.id);
    res.json({ flashcard: updated });
  } else {
    const result = db
      .prepare('INSERT INTO flashcards (user_id, front, back, task_id) VALUES (?, ?, ?, ?)')
      .run(req.userId, front, back, taskId);
    const created = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ flashcard: created });
  }
});

router.put('/flashcards/:id', (req: AuthRequest, res: Response) => {
  const { front, back } = req.body as { front?: string; back?: string };
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM flashcards WHERE id = ? AND user_id = ?')
    .get(parseInt(req.params.id, 10), req.userId) as { id: number } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Flashcard not found' });
    return;
  }
  if (front !== undefined) {
    db.prepare('UPDATE flashcards SET front = ? WHERE id = ? AND user_id = ?')
      .run(front, existing.id, req.userId);
  }
  if (back !== undefined) {
    db.prepare('UPDATE flashcards SET back = ? WHERE id = ? AND user_id = ?')
      .run(back, existing.id, req.userId);
  }
  const updated = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(existing.id);
  res.json({ flashcard: updated });
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

router.put('/errors/:id', (req: AuthRequest, res: Response) => {
  const { note } = req.body as { note?: string };
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM user_errors WHERE id = ? AND user_id = ?')
    .get(parseInt(req.params.id, 10), req.userId) as { id: number } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Error not found' });
    return;
  }
  db.prepare('UPDATE user_errors SET note = ? WHERE id = ?').run(note ?? null, existing.id);
  const updated = db.prepare('SELECT * FROM user_errors WHERE id = ?').get(existing.id);
  res.json({ error: updated });
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
  const { task_id, subtask_id, note } = req.body as {
    task_id?: number;
    subtask_id?: number;
    note?: string;
  };
  const db = getDb();
  const result = db
    .prepare('INSERT INTO user_formulas (user_id, task_id, subtask_id, note) VALUES (?, ?, ?, ?)')
    .run(req.userId, task_id ?? null, subtask_id ?? null, note ?? null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/formulas/:id', (req: AuthRequest, res: Response) => {
  const { note } = req.body as { note?: string };
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM user_formulas WHERE id = ? AND user_id = ?')
    .get(parseInt(req.params.id, 10), req.userId) as { id: number } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Formula not found' });
    return;
  }
  db.prepare('UPDATE user_formulas SET note = ? WHERE id = ?').run(note ?? null, existing.id);
  const updated = db.prepare('SELECT * FROM user_formulas WHERE id = ?').get(existing.id);
  res.json({ formula: updated });
});

router.delete('/formulas/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM user_formulas WHERE id = ? AND user_id = ?').run(
    parseInt(req.params.id, 10),
    req.userId
  );
  res.json({ ok: true });
});

// ── Chapter Formulas ─────────────────────────────────────

router.get('/formulas/chapter/:category', (req: AuthRequest, res: Response) => {
  const { category } = req.params;
  const db = getDb();
  const formula = db
    .prepare('SELECT * FROM user_formulas WHERE user_id = ? AND category = ? LIMIT 1')
    .get(req.userId, category) as Record<string, unknown> | undefined;
  res.json({ formula: formula ?? null });
});

router.post('/formulas/chapter', (req: AuthRequest, res: Response) => {
  const { category, note } = req.body as { category?: string; note?: string };
  if (!category) {
    res.status(400).json({ error: 'category is required' });
    return;
  }
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM user_formulas WHERE user_id = ? AND category = ?')
    .get(req.userId, category) as { id: number } | undefined;

  if (existing) {
    db.prepare('UPDATE user_formulas SET note = ? WHERE id = ?').run(note ?? '', existing.id);
    const updated = db.prepare('SELECT * FROM user_formulas WHERE id = ?').get(existing.id);
    res.json({ formula: updated });
  } else {
    const result = db
      .prepare('INSERT INTO user_formulas (user_id, category, note) VALUES (?, ?, ?)')
      .run(req.userId, category, note ?? '');
    const created = db.prepare('SELECT * FROM user_formulas WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ formula: created });
  }
});

// ── Custom Task Library ──────────────────────────────────

router.get('/custom-library/categories', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT
      c.id,
      c.code,
      c.title AS titel,
      c.description AS beschreibung,
      c.sort_order,
      COUNT(t.id) AS task_count
    FROM user_custom_categories c
    LEFT JOIN user_custom_tasks t ON t.category_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.sort_order, c.id
  `).all(req.userId) as Array<{
    id: number;
    code: string;
    titel: string;
    beschreibung: string;
    sort_order: number;
    task_count: number;
  }>;

  res.json({ categories });
});

router.post('/custom-library/categories', (req: AuthRequest, res: Response) => {
  const { title, description } = req.body as { title?: string; description?: string };
  const trimmedTitle = title?.trim();

  if (!trimmedTitle) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const db = getDb();
  try {
    const nextSort = db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
      FROM user_custom_categories
      WHERE user_id = ?
    `).get(req.userId) as { next_sort: number };

    const pendingCode = createPendingCategoryCode();
    const result = db.prepare(`
      INSERT INTO user_custom_categories (user_id, code, title, description, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.userId, pendingCode, trimmedTitle, description?.trim() ?? '', nextSort.next_sort);

    const categoryId = Number(result.lastInsertRowid);
    const code = toCustomCategoryCode(categoryId);
    db.prepare('UPDATE user_custom_categories SET code = ? WHERE id = ?').run(code, categoryId);

    const category = db.prepare(`
      SELECT
        id,
        code,
        title AS titel,
        description AS beschreibung,
        sort_order,
        0 AS task_count
      FROM user_custom_categories
      WHERE id = ?
    `).get(categoryId);

    res.status(201).json({ category });
  } catch (error) {
    console.error('Failed to create custom category:', error);
    res.status(500).json({ error: 'Kategorie konnte serverseitig nicht erstellt werden.' });
  }
});

router.post('/custom-library/tasks', (req: AuthRequest, res: Response) => {
  const { category_id, task_json, image_data_url } = req.body as {
    category_id?: number;
    task_json?: string;
    image_data_url?: string | null;
  };

  if (!category_id || !Number.isFinite(category_id)) {
    res.status(400).json({ error: 'category_id is required' });
    return;
  }

  if (!task_json || typeof task_json !== 'string') {
    res.status(400).json({ error: 'task_json is required' });
    return;
  }

  if (image_data_url && (!isImageDataUrl(image_data_url) || image_data_url.length > 8_000_000)) {
    res.status(400).json({ error: 'image_data_url is invalid or too large' });
    return;
  }

  const db = getDb();
  const category = db.prepare(`
    SELECT id, code
    FROM user_custom_categories
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).get(category_id, req.userId) as { id: number; code: string } | undefined;

  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  let parsed;
  try {
    parsed = parseCustomTaskJson(task_json);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ungültiges Aufgaben-JSON' });
    return;
  }

  const nextSort = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
    FROM user_custom_tasks
    WHERE user_id = ? AND category_id = ?
  `).get(req.userId, category.id) as { next_sort: number };

  const insertTask = db.prepare(`
    INSERT INTO user_custom_tasks (
      user_id,
      category_id,
      title,
      total_points,
      description,
      given_latex,
      given_variables,
      image_url,
      raw_json,
      sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubtask = db.prepare(`
    INSERT INTO user_custom_subtasks (
      task_id,
      ff_index,
      label,
      description,
      math_prefix,
      math_suffix,
      solution,
      points,
      raw_formula,
      formula_group
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rawTaskId = db.transaction(() => {
    const result = insertTask.run(
      req.userId,
      category.id,
      parsed.title,
      parsed.totalPoints,
      parsed.description,
      parsed.givenLatex,
      parsed.givenVariables,
      image_data_url ?? null,
      parsed.rawJson,
      nextSort.next_sort
    );

    const taskId = Number(result.lastInsertRowid);

    for (const subtask of parsed.subtasks) {
      insertSubtask.run(
        taskId,
        subtask.ff_index,
        subtask.label,
        subtask.description,
        subtask.math_prefix,
        subtask.math_suffix,
        subtask.solution,
        subtask.points,
        subtask.raw_formula,
        subtask.formula_group
      );
    }

    return taskId;
  })();

  res.status(201).json({
    task: {
      id: toSyntheticTaskId(rawTaskId),
      category: category.code,
      title: parsed.title,
      total_points: parsed.totalPoints,
    },
  });
});

router.get('/custom-library/tasks/:taskId', (req: AuthRequest, res: Response) => {
  const parsedTaskId = parseInt(req.params.taskId, 10);
  if (isNaN(parsedTaskId)) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }
  const taskId = isSyntheticCustomTaskId(parsedTaskId) ? toRawCustomTaskId(parsedTaskId) : parsedTaskId;

  const db = getDb();
  const task = getEditableCustomTask(db, req.userId!, taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json({ task });
});

router.put('/custom-library/tasks/:taskId', (req: AuthRequest, res: Response) => {
  const parsedTaskId = parseInt(req.params.taskId, 10);
  const { category_id, task_json, image_data_url } = req.body as {
    category_id?: number;
    task_json?: string;
    image_data_url?: string | null;
  };

  if (isNaN(parsedTaskId)) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }
  const taskId = isSyntheticCustomTaskId(parsedTaskId) ? toRawCustomTaskId(parsedTaskId) : parsedTaskId;

  if (!category_id || !Number.isFinite(category_id)) {
    res.status(400).json({ error: 'category_id is required' });
    return;
  }

  if (!task_json || typeof task_json !== 'string') {
    res.status(400).json({ error: 'task_json is required' });
    return;
  }

  if (image_data_url && (!isImageDataUrl(image_data_url) || image_data_url.length > 8_000_000)) {
    res.status(400).json({ error: 'image_data_url is invalid or too large' });
    return;
  }

  const db = getDb();
  const existingTask = getEditableCustomTask(db, req.userId!, taskId);
  if (!existingTask) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const category = db.prepare(`
    SELECT id, code
    FROM user_custom_categories
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `).get(category_id, req.userId) as { id: number; code: string } | undefined;

  if (!category) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  let parsed;
  try {
    parsed = parseCustomTaskJson(task_json);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ungültiges Aufgaben-JSON' });
    return;
  }

  const insertSubtask = db.prepare(`
    INSERT INTO user_custom_subtasks (
      task_id,
      ff_index,
      label,
      description,
      math_prefix,
      math_suffix,
      solution,
      points,
      raw_formula,
      formula_group
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    db.prepare(`
      UPDATE user_custom_tasks
      SET
        category_id = ?,
        title = ?,
        total_points = ?,
        description = ?,
        given_latex = ?,
        given_variables = ?,
        image_url = ?,
        raw_json = ?
      WHERE id = ? AND user_id = ?
    `).run(
      category.id,
      parsed.title,
      parsed.totalPoints,
      parsed.description,
      parsed.givenLatex,
      parsed.givenVariables,
      image_data_url ?? null,
      parsed.rawJson,
      taskId,
      req.userId
    );

    db.prepare('DELETE FROM user_custom_subtasks WHERE task_id = ?').run(taskId);

    for (const subtask of parsed.subtasks) {
      insertSubtask.run(
        taskId,
        subtask.ff_index,
        subtask.label,
        subtask.description,
        subtask.math_prefix,
        subtask.math_suffix,
        subtask.solution,
        subtask.points,
        subtask.raw_formula,
        subtask.formula_group
      );
    }
  })();

  res.json({
    task: {
      id: toSyntheticTaskId(taskId),
      category: category.code,
      title: parsed.title,
      total_points: parsed.totalPoints,
    },
  });
});

// ── Custom Prompts ───────────────────────────────────────

router.get('/custom-prompts', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT context, value FROM user_custom_prompts WHERE user_id = ?')
    .all(req.userId) as { context: string; value: string }[];
  const prompts: Record<string, string> = { chat: '', karteikarten: '', fehler: '', formeln: '' };
  for (const row of rows) prompts[row.context] = row.value;
  res.json({ prompts });
});

router.put('/custom-prompts/:context', (req: AuthRequest, res: Response) => {
  const { context } = req.params;
  const allowed = ['chat', 'karteikarten', 'fehler', 'formeln'];
  if (!allowed.includes(context)) {
    res.status(400).json({ error: 'Invalid context' });
    return;
  }
  const { value } = req.body as { value?: string };
  const db = getDb();
  db.prepare(
    `INSERT INTO user_custom_prompts (user_id, context, value) VALUES (?, ?, ?)
     ON CONFLICT(user_id, context) DO UPDATE SET value = excluded.value`
  ).run(req.userId, context, value ?? '');
  res.json({ ok: true });
});

export default router;
