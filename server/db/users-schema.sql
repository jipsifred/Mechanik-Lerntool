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
  category   TEXT DEFAULT NULL,
  note       TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_custom_prompts (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context  TEXT NOT NULL,
  value    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, context)
);

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
  raw_json        TEXT NOT NULL,
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
  solution      TEXT NOT NULL,
  points        INTEGER NOT NULL DEFAULT 0,
  raw_formula   TEXT NOT NULL DEFAULT '',
  formula_group INTEGER NOT NULL DEFAULT 0,
  UNIQUE(task_id, ff_index)
);
