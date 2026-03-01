/**
 * Validate all LaTeX math fields in the DB against KaTeX.
 * Reports any fields that fail to render.
 */

import Database from 'better-sqlite3';
import path from 'path';
import katex from 'katex';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');

const db = new Database(DB_PATH, { readonly: true });

function tryRender(latex: string, displayMode: boolean): string | null {
  if (!latex || !latex.trim()) return null;
  try {
    katex.renderToString(latex, { displayMode, throwOnError: true, strict: false });
    return null;
  } catch (e: any) {
    return e.message || String(e);
  }
}

// Check tasks.given_latex
const tasks = db.prepare('SELECT id, title, given_latex FROM tasks').all() as any[];
const taskErrors: Array<{ id: number; title: string; field: string; latex: string; error: string }> = [];

for (const task of tasks) {
  if (task.given_latex) {
    const err = tryRender(task.given_latex, true);
    if (err) {
      taskErrors.push({ id: task.id, title: task.title, field: 'given_latex', latex: task.given_latex, error: err });
    }
  }
}

// Check subtasks math_prefix and math_suffix
const subtasks = db.prepare('SELECT id, task_id, ff_index, label, math_prefix, math_suffix FROM subtasks').all() as any[];
const subtaskErrors: Array<{ id: number; task_id: number; ff_index: number; label: string; field: string; latex: string; error: string }> = [];

for (const st of subtasks) {
  if (st.math_prefix) {
    const err = tryRender(st.math_prefix, false);
    if (err) {
      subtaskErrors.push({ id: st.id, task_id: st.task_id, ff_index: st.ff_index, label: st.label, field: 'math_prefix', latex: st.math_prefix, error: err });
    }
  }
  if (st.math_suffix) {
    const err = tryRender(st.math_suffix, false);
    if (err) {
      subtaskErrors.push({ id: st.id, task_id: st.task_id, ff_index: st.ff_index, label: st.label, field: 'math_suffix', latex: st.math_suffix, error: err });
    }
  }
}

db.close();

console.log(`\n═══ KaTeX Validation Report ═══`);
console.log(`Checked ${tasks.length} tasks and ${subtasks.length} subtasks.\n`);

if (taskErrors.length === 0 && subtaskErrors.length === 0) {
  console.log('✓ All fields render without errors!');
} else {
  console.log(`Tasks with given_latex errors: ${taskErrors.length}`);
  for (const e of taskErrors) {
    console.log(`\n  Task ${e.id}: ${e.title}`);
    console.log(`  Error: ${e.error}`);
    console.log(`  LaTeX: ${e.latex.substring(0, 200)}`);
  }

  console.log(`\nSubtasks with math_prefix/suffix errors: ${subtaskErrors.length}`);

  // Group by task_id for readability
  const byTask = new Map<number, typeof subtaskErrors>();
  for (const e of subtaskErrors) {
    if (!byTask.has(e.task_id)) byTask.set(e.task_id, []);
    byTask.get(e.task_id)!.push(e);
  }

  for (const [task_id, errors] of byTask) {
    console.log(`\n  Task ${task_id}:`);
    for (const e of errors) {
      console.log(`    ST ${e.id} ff_index=${e.ff_index} label="${e.label}" field=${e.field}`);
      console.log(`    Error: ${e.error.split('\n')[0]}`);
      console.log(`    LaTeX: ${e.latex.substring(0, 150)}`);
    }
  }

  // Summary of error types
  console.log('\n═══ Error Pattern Summary ═══');
  const errorPatterns = new Map<string, number>();
  for (const e of [...taskErrors, ...subtaskErrors]) {
    const key = e.error.split(':')[0].trim().replace(/\s+at position \d+/, '').substring(0, 80);
    errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1);
  }
  for (const [pattern, count] of [...errorPatterns.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x: ${pattern}`);
  }
}
