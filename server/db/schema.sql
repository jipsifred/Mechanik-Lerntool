CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  page_start   INTEGER NOT NULL,
  title        TEXT NOT NULL,
  total_points INTEGER NOT NULL,
  description  TEXT NOT NULL,
  given_latex  TEXT NOT NULL DEFAULT '',
  image_url    TEXT DEFAULT NULL,
  image_bbox   TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS subtasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id      INTEGER NOT NULL REFERENCES tasks(id),
  ff_index     INTEGER NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  math_prefix  TEXT NOT NULL DEFAULT '',
  math_suffix  TEXT NOT NULL DEFAULT '',
  solution     TEXT NOT NULL,
  points       INTEGER NOT NULL DEFAULT 0,
  raw_formula  TEXT NOT NULL DEFAULT '',
  formula_group INTEGER NOT NULL DEFAULT 0,
  UNIQUE(task_id, ff_index)
);
