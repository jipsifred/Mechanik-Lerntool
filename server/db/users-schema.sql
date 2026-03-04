CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_task_progress (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'untouched',
  check_state  TEXT NOT NULL DEFAULT 'none',
  last_seen_at INTEGER,
  PRIMARY KEY (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS user_subtask_progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtask_id INTEGER NOT NULL,
  is_solved  INTEGER NOT NULL DEFAULT 0,
  solved_at  INTEGER,
  PRIMARY KEY (user_id, subtask_id)
);

CREATE TABLE IF NOT EXISTS flashcards (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  front          TEXT NOT NULL,
  back           TEXT NOT NULL,
  task_id        INTEGER,
  created_at     INTEGER DEFAULT (unixepoch()),
  next_review_at INTEGER,
  ease_factor    REAL DEFAULT 2.5
);

CREATE TABLE IF NOT EXISTS user_errors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    INTEGER,
  subtask_id INTEGER,
  note       TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_formulas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    INTEGER,
  subtask_id INTEGER,
  note       TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
