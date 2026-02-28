import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(process.cwd(), '..');
const OCR_PATH = path.resolve(ROOT, 'Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_fixed.json');
const DB_PATH = path.resolve(ROOT, 'Code/server/db/mechanik.db');
const SCHEMA_PATH = path.resolve(ROOT, 'Code/server/db/schema.sql');

console.log('Loading fixed JSON...');
const tasksData = JSON.parse(fs.readFileSync(OCR_PATH, 'utf-8'));

const db = new Database(DB_PATH);

// Backup old images based on first 30 chars of description
const oldTasks = db.prepare('SELECT description, image_url, image_bbox, page_start FROM tasks').all();
const imgMap = new Map();
for (const old of oldTasks) {
    if (!old.description) continue;
    const prefix = old.description.substring(0, 40).replace(/\s+/g, '').toLowerCase();
    imgMap.set(prefix, {
        image_url: old.image_url,
        image_bbox: old.image_bbox,
        page_start: old.page_start
    });
}

// Clear DB
db.exec(`
  DELETE FROM subtasks;
  DELETE FROM tasks;
  DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'subtasks');
`);

const insertTask = db.prepare(`
  INSERT INTO tasks (page_start, title, total_points, description, given_latex, image_url, image_bbox)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertSubtask = db.prepare(`
  INSERT INTO subtasks (task_id, ff_index, label, description, math_prefix, math_suffix, solution, points, raw_formula, formula_group)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const transaction = db.transaction(() => {
  let taskId = 1;
  let formulaGroupCounter = 0;

  for (const task of tasksData) {
    const prefix = task.description ? task.description.substring(0, 40).replace(/\s+/g, '').toLowerCase() : '';
    const oldInfo = imgMap.get(prefix) || { page_start: 0, image_url: null, image_bbox: null };

    // Try to extract points from title
    let points = 10;
    const pointsMatch = task.title.match(/(\d+)\s*Punkte/i);
    if (pointsMatch) {
      points = parseInt(pointsMatch[1], 10);
    }

    insertTask.run(
      oldInfo.page_start,
      task.title || 'Aufgabe',
      points,
      task.description || '',
      task.given || '',
      oldInfo.image_url,
      oldInfo.image_bbox
    );

    if (task.subtasks) {
      for (const st of task.subtasks) {
        const group = formulaGroupCounter++;
        if (st.formulas) {
          for (const f of st.formulas) {
            insertSubtask.run(
              taskId,
              f.ff_index,
              st.label || '',
              st.description || '',
              f.math_prefix || '',
              f.math_suffix || '',
              f.solution || '',
              f.points || 0,
              f.raw_formula || '',
              group
            );
          }
        }
      }
    }
    
    taskId++;
  }
});

transaction();
console.log('Database updated successfully.');
