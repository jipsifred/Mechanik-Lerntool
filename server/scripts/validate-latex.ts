/**
 * Validates ALL LaTeX in the database using KaTeX.
 * Tests every field exactly as the frontend renders it.
 * Reports every error with task ID and field location.
 *
 * Usage: npx tsx server/scripts/validate-latex.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import katex from 'katex';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');

const db = new Database(DB_PATH, { readonly: true });

interface LatexError {
  taskId: number;
  context: string;
  latex: string;
  error: string;
}

const errors: LatexError[] = [];

// Test a raw LaTeX string (like math_prefix, math_suffix)
function testRawLatex(taskId: number, context: string, latex: string): void {
  if (!latex || !latex.trim()) return;
  try {
    katex.renderToString(latex, { throwOnError: true, strict: false });
  } catch (e: any) {
    errors.push({ taskId, context, latex: latex.substring(0, 150), error: e.message?.substring(0, 120) || String(e) });
  }
}

// Test a MarkdownMath string (contains $...$ blocks mixed with text)
// The frontend splits on $ and renders each math block with KaTeX
function testMarkdownMath(taskId: number, context: string, text: string): void {
  if (!text) return;

  // Find all $...$ blocks
  const re = /\$([^$]+)\$/g;
  let match;
  let foundMath = false;

  while ((match = re.exec(text)) !== null) {
    foundMath = true;
    const inner = match[1];
    try {
      katex.renderToString(inner, { throwOnError: true, strict: false });
    } catch (e: any) {
      errors.push({ taskId, context, latex: inner.substring(0, 150), error: e.message?.substring(0, 120) || String(e) });
    }
  }

  // Warn about bare LaTeX (backslash commands outside $ delimiters)
  const textOutsideDollars = text.replace(/\$[^$]*\$/g, '');
  if (/\\[a-zA-Z]/.test(textOutsideDollars)) {
    errors.push({
      taskId,
      context,
      latex: textOutsideDollars.substring(0, 150),
      error: 'BARE LATEX: \\commands outside $...$ delimiters — renders as plain text',
    });
  }
}

// ── Check all tasks ──
const tasks = db.prepare('SELECT id, description, given_latex FROM tasks').all() as any[];
for (const t of tasks) {
  testMarkdownMath(t.id, 'description', t.description);
  testMarkdownMath(t.id, 'given_latex', t.given_latex);
}

// ── Check all subtasks ──
const subtasks = db.prepare(
  'SELECT id, task_id, ff_index, label, description, math_prefix, math_suffix FROM subtasks'
).all() as any[];

for (const s of subtasks) {
  const label = `subtask ${s.label}FF${s.ff_index}`;

  // Subtask descriptions also use MarkdownMath
  testMarkdownMath(s.task_id, `${label} description`, s.description);

  // math_prefix and math_suffix are raw LaTeX (rendered directly)
  testRawLatex(s.task_id, `${label} prefix`, s.math_prefix);
  testRawLatex(s.task_id, `${label} suffix`, s.math_suffix);
}

db.close();

// ── Report ──
console.log(`\nScanned ${tasks.length} tasks, ${subtasks.length} subtasks`);

if (errors.length === 0) {
  console.log('All LaTeX renders correctly!');
  process.exit(0);
}

console.log(`Found ${errors.length} LaTeX errors\n`);

// Group by task
const byTask = new Map<number, LatexError[]>();
for (const e of errors) {
  if (!byTask.has(e.taskId)) byTask.set(e.taskId, []);
  byTask.get(e.taskId)!.push(e);
}

const sortedTasks = [...byTask.entries()].sort((a, b) => a[0] - b[0]);
for (const [taskId, errs] of sortedTasks) {
  console.log(`── Aufgabe ${taskId} (${errs.length} errors) ──`);
  for (const e of errs) {
    console.log(`  [${e.context}]`);
    console.log(`    ${e.error}`);
    console.log(`    "${e.latex}"`);
  }
}

// Error type summary
console.log(`\n── Summary ──`);
const types = new Map<string, number>();
for (const e of errors) {
  const key = e.error.startsWith('BARE') ? 'BARE_LATEX' :
    e.error.replace(/ at position \d+/, '').replace(/: .*/, '').substring(0, 60);
  types.set(key, (types.get(key) || 0) + 1);
}
for (const [type, count] of [...types.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count}x ${type}`);
}

console.log(`\nTotal: ${errors.length} errors in ${byTask.size} tasks`);
process.exit(1);
