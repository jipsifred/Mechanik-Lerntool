/**
 * Parse aufgabenkatalog.md → SQLite database.
 *
 * Reads the corrected markdown catalog and inserts all tasks
 * and subtasks into server/db/mechanik.db.
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { parseFormulaBlocks, parseBareBoxedBlocks } from './utils/formula-parser.js';
import { cleanLatex } from './utils/normalize.js';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MD_PATH = path.resolve(ROOT, 'Aufgabenkatalog/aufgabenkatalog.md');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');
const SCHEMA_PATH = path.resolve(ROOT, 'server/db/schema.sql');

console.log('Loading markdown...');
const mdContent = fs.readFileSync(MD_PATH, 'utf-8');

// ── Init DB ──
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

const insertTask = db.prepare(`
  INSERT INTO tasks (page_start, title, total_points, description, given_latex, image_url, image_bbox)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertSubtask = db.prepare(`
  INSERT OR IGNORE INTO subtasks (task_id, ff_index, label, description, math_prefix, math_suffix, solution, points, raw_formula, formula_group)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Split into task blocks at "## Aufgabe"
const taskBlocks = mdContent.split(/(?=^## Aufgabe)/m).filter(b => b.trim().startsWith('## Aufgabe'));

console.log(`Found ${taskBlocks.length} tasks`);

const transaction = db.transaction(() => {
  for (let taskIndex = 0; taskIndex < taskBlocks.length; taskIndex++) {
    const block = taskBlocks[taskIndex];

    // Extract title (first line)
    const titleMatch = block.match(/^## (.+)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Aufgabe';

    // Extract total points from title
    const pointsMatch = title.match(/\((\d+)\s*Punkte\)/i);
    const totalPoints = pointsMatch ? parseInt(pointsMatch[1], 10) : 10;

    // Find **Gegeben:** position
    const gegebenIdx = block.indexOf('**Gegeben:**');
    const titleLineEnd = block.indexOf('\n') + 1;

    // Description: text between title line and **Gegeben:**
    let description = '';
    let restBlock = '';
    if (gegebenIdx !== -1) {
      description = block.substring(titleLineEnd, gegebenIdx).trim();
      restBlock = block.substring(gegebenIdx);
    } else {
      description = block.substring(titleLineEnd).trim();
    }

    // Extract given_latex: first $$ block after **Gegeben:**
    // Do NOT run cleanLatex here — it strips \end{array} which breaks the formula
    let givenLatex = '';
    if (restBlock) {
      const givenMatch = restBlock.match(/\$\$([\s\S]*?)\$\$/);
      if (givenMatch) {
        givenLatex = givenMatch[1].trim();
      }
    }

    // Extract image_url
    let imageUrl: string | null = null;
    const imgMatch = block.match(/<img\s+src='([^']+)'/);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }

    // Insert task
    const result = insertTask.run(taskIndex, title, totalPoints, description, givenLatex, imageUrl, null);
    const taskId = result.lastInsertRowid as number;

    // ── Extract subtasks ──
    // Find all subtask label positions: **a)**, **b)**, etc.
    const subtaskSplitRe = /\*\*([a-z])\)\*\*/g;
    let match: RegExpExecArray | null;
    const positions: Array<{ label: string; start: number }> = [];

    while ((match = subtaskSplitRe.exec(block)) !== null) {
      positions.push({ label: match[1] + ')', start: match.index });
    }

    let formulaGroupCounter = 0;
    // Per-task ff_index counter for bare \boxed{} tasks (no FF markers)
    let bareBoxFfIndex = 1;

    /** Try FF-marker parsing first; fall back to bare \boxed{} parsing. */
    function extractBlocks(formulaContent: string, pendingPrefix: string): ReturnType<typeof parseFormulaBlocks> {
      const ffBlocks = parseFormulaBlocks(formulaContent);
      if (ffBlocks.length > 0) return ffBlocks;
      const bareBlocks = parseBareBoxedBlocks(formulaContent, bareBoxFfIndex);
      if (bareBlocks.length > 0) {
        // Prepend any pending prefix (from a preceding split-formula $$==$$ block)
        if (pendingPrefix && bareBlocks[0].mathPrefix === '') {
          bareBlocks[0] = { ...bareBlocks[0], mathPrefix: pendingPrefix };
        }
        bareBoxFfIndex += bareBlocks.length;
      }
      return bareBlocks;
    }

    if (positions.length === 0) {
      // No labeled subtasks — parse any FF/bare formula blocks directly
      const formulaRe = /\$\$([\s\S]*?)\$\$/g;
      let fMatch: RegExpExecArray | null;
      let pendingPrefix = '';
      while ((fMatch = formulaRe.exec(block)) !== null) {
        const raw = fMatch[1].trim();
        const blocks = extractBlocks(raw, pendingPrefix);
        if (blocks.length === 0) {
          // No boxes — save as potential prefix for split-formula next block
          const cleaned = cleanLatex(raw);
          pendingPrefix = cleaned.endsWith('=') ? cleaned : '';
          continue;
        }
        pendingPrefix = '';
        const group = formulaGroupCounter++;
        for (const ff of blocks) {
          insertSubtask.run(taskId, ff.ffIndex, '', '', ff.mathPrefix, ff.mathSuffix, ff.solution, ff.points, ff.rawFormula, group);
        }
      }
      continue;
    }

    // Build subtask segments
    const segments: Array<{ label: string; text: string }> = [];
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].start;
      const end = i + 1 < positions.length ? positions[i + 1].start : block.length;
      segments.push({ label: positions[i].label, text: block.substring(start, end) });
    }

    for (const st of segments) {
      // Description: text before the first $$ block, with label prefix removed
      const textWithoutLabel = st.text.replace(/^\*\*[a-z]\)\*\*\s*/, '');
      const firstFormulaIdx = textWithoutLabel.indexOf('$$');
      let stDesc = (firstFormulaIdx !== -1 ? textWithoutLabel.substring(0, firstFormulaIdx) : textWithoutLabel).trim();
      // Strip "*(X Punkte)*" annotations
      stDesc = stDesc.replace(/\*\([^)]*Punkte[^)]*\)\*/g, '').trim();

      // Parse all $$ formula blocks in this subtask
      const formulaRe = /\$\$([\s\S]*?)\$\$/g;
      let fMatch: RegExpExecArray | null;
      let pendingPrefix = '';
      while ((fMatch = formulaRe.exec(st.text)) !== null) {
        const raw = fMatch[1].trim();
        const ffBlocks = extractBlocks(raw, pendingPrefix);
        if (ffBlocks.length === 0) {
          const cleaned = cleanLatex(raw);
          pendingPrefix = cleaned.endsWith('=') ? cleaned : '';
          continue;
        }
        pendingPrefix = '';
        const group = formulaGroupCounter++;
        for (const ff of ffBlocks) {
          insertSubtask.run(taskId, ff.ffIndex, st.label, stDesc, ff.mathPrefix, ff.mathSuffix, ff.solution, ff.points, ff.rawFormula, group);
        }
      }
    }
  }
});

transaction();

// ── Verify ──
const taskCount = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
const subtaskCount = (db.prepare('SELECT COUNT(*) as count FROM subtasks').get() as any).count;
console.log(`\nDatabase created: ${DB_PATH}`);
console.log(`Tasks: ${taskCount}`);
console.log(`Subtasks: ${subtaskCount}`);

// Spot check task 1
const task1 = db.prepare('SELECT * FROM tasks WHERE id = 1').get() as any;
const task1Subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = 1 ORDER BY ff_index').all() as any[];
console.log(`\n── Task 1 verification ──`);
console.log(`Title: ${task1.title}`);
console.log(`Points: ${task1.total_points}`);
console.log(`Description: ${task1.description.substring(0, 80)}...`);
console.log(`Image: ${task1.image_url ? 'yes' : 'no'}`);
console.log(`Subtasks: ${task1Subtasks.length}`);
for (const st of task1Subtasks) {
  console.log(`  FF${st.ff_index}: solution="${st.solution}" points=${st.points} label="${st.label}" desc="${st.description.substring(0, 40)}"`);
}

db.close();
console.log('\nDone!');
