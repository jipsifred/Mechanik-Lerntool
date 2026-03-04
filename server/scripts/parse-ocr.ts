/**
 * Parse OCR JSON → SQLite database.
 *
 * Reads Mechanik_III_Aufgabenkatalog_komplett.json and inserts all tasks
 * and subtasks into server/db/mechanik.db.
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import {
  classifyPageElements,
  isTaskStartPage,
  extractPointsFromTitle,
  type LayoutElement,
  type ClassifiedElement,
} from './utils/element-classifier.js';
import { parseFormulaBlocks, isFFFormula } from './utils/formula-parser.js';
import { cleanLatex, stripDisplayDelimiters } from './utils/normalize.js';

// ── Paths ──
const ROOT = path.resolve(import.meta.dirname, '../..');
const OCR_PATH = path.resolve(ROOT, '../Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_komplett.json');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');
const SCHEMA_PATH = path.resolve(ROOT, 'server/db/schema.sql');

// ── Load OCR data ──
console.log('Loading OCR JSON...');
const ocrData = JSON.parse(fs.readFileSync(OCR_PATH, 'utf-8'));
const pages: LayoutElement[][] = ocrData.layout_details;
console.log(`Loaded ${pages.length} pages.`);

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
  INSERT INTO subtasks (task_id, ff_index, label, description, math_prefix, math_suffix, solution, points, raw_formula, formula_group)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── Group pages into tasks ──
interface RawTask {
  pageStart: number;
  pages: LayoutElement[][];
}

const rawTasks: RawTask[] = [];
let currentTask: RawTask | null = null;

for (let p = 0; p < pages.length; p++) {
  const page = pages[p];
  if (isTaskStartPage(page)) {
    currentTask = { pageStart: p, pages: [page] };
    rawTasks.push(currentTask);
  } else if (currentTask) {
    currentTask.pages.push(page);
  }
}

console.log(`Found ${rawTasks.length} tasks.`);

// ── Process each task ──
const transaction = db.transaction(() => {
  for (const raw of rawTasks) {
    // Classify all elements across all pages of this task
    const allClassified: ClassifiedElement[] = [];
    for (let i = 0; i < raw.pages.length; i++) {
      const classified = classifyPageElements(raw.pages[i], i === 0);
      allClassified.push(...classified);
    }

    // Extract task-level fields
    const titleEl = allClassified.find((c) => c.role === 'title');
    const title = titleEl ? titleEl.element.content.replace(/^##?\s*/, '') : 'Aufgabe';
    const totalPoints = extractPointsFromTitle(title);

    // Description: all description-role elements joined
    const descParts = allClassified
      .filter((c) => c.role === 'description')
      .map((c) => c.element.content);
    const description = descParts.join('\n\n');

    // Gegeben formula
    const gegebenEl = allClassified.find((c) => c.role === 'gegeben_formula');
    const givenLatex = gegebenEl ? stripDisplayDelimiters(gegebenEl.element.content) : '';

    // Image
    const imageEl = allClassified.find((c) => c.role === 'image');
    const imageUrl = imageEl ? imageEl.element.content : null;
    const imageBbox = imageEl ? JSON.stringify(imageEl.element.bbox_2d) : null;

    // Insert task
    const result = insertTask.run(
      raw.pageStart,
      title,
      totalPoints,
      description,
      cleanLatex(givenLatex),
      imageUrl,
      imageBbox
    );
    const taskId = result.lastInsertRowid as number;

    // ── Extract subtasks ──
    // Collect subtask texts and solution formulas
    const subtaskTexts: Array<{ label: string; description: string }> = [];
    const solutionFormulas: ClassifiedElement[] = [];

    for (const c of allClassified) {
      if (c.role === 'subtask_text') {
        const text = c.element.content.trim();
        const labelMatch = text.match(/^([a-z])\)\s*/);
        const label = labelMatch ? labelMatch[1] + ')' : '';
        const desc = labelMatch ? text.substring(labelMatch[0].length) : text;
        subtaskTexts.push({ label, description: desc });
      } else if (c.role === 'solution_formula') {
        solutionFormulas.push(c);
      }
    }

    // Parse FF blocks from all solution formulas, tracking which formula they came from
    interface FFWithSource {
      ffIndex: number;
      points: number;
      solution: string;
      rawFormula: string;
      mathPrefix: string;
      mathSuffix: string;
      formulaIndex: number; // which source formula this came from
    }

    const allFFBlocks: FFWithSource[] = [];
    for (let fi = 0; fi < solutionFormulas.length; fi++) {
      const sf = solutionFormulas[fi];
      const blocks = parseFormulaBlocks(sf.element.content);
      for (const block of blocks) {
        allFFBlocks.push({
          ...block,
          rawFormula: sf.element.content,
          formulaIndex: fi,
        });
      }
    }

    // Sort by FF index and deduplicate
    allFFBlocks.sort((a, b) => a.ffIndex - b.ffIndex);
    const dedupedFF: FFWithSource[] = [];
    const seenFF = new Set<number>();
    for (const ff of allFFBlocks) {
      if (!seenFF.has(ff.ffIndex)) {
        seenFF.add(ff.ffIndex);
        dedupedFF.push(ff);
      }
    }

    // Group FF blocks by source formula to create formula groups
    // Each unique formulaIndex = one formula group
    // Assign formula_group numbers (0-based)
    let formulaGroupCounter = 0;
    const formulaIndexToGroup = new Map<number, number>();
    for (const ff of dedupedFF) {
      if (!formulaIndexToGroup.has(ff.formulaIndex)) {
        formulaIndexToGroup.set(ff.formulaIndex, formulaGroupCounter++);
      }
    }

    // Match subtask texts to formula GROUPS (not individual FF blocks)
    // Each formula group gets one subtask text
    let textIndex = 0;
    let lastGroup = -1;

    for (const ff of dedupedFF) {
      const group = formulaIndexToGroup.get(ff.formulaIndex)!;
      const isFirstInGroup = group !== lastGroup;
      lastGroup = group;

      let label = '';
      let desc = '';

      if (isFirstInGroup) {
        const subtaskText = subtaskTexts[textIndex] || { label: '', description: '' };
        label = subtaskText.label;
        desc = subtaskText.description;
        textIndex++;
      }

      // Handle OCR artifact in prefix
      if (ff.mathPrefix.includes('\\mathrm{')) {
        const matrmMatch = ff.mathPrefix.match(
          /\\mathrm\{([^}]*(?:Arbeit|Punkte|Bestimmen|Berechnen)[^}]*)\}/
        );
        if (matrmMatch && !desc) {
          desc = matrmMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2');
          ff.mathPrefix = ff.mathPrefix.replace(matrmMatch[0], '').trim();
        }
      }

      insertSubtask.run(
        taskId,
        ff.ffIndex,
        label,
        desc,
        cleanLatex(ff.mathPrefix),
        cleanLatex(ff.mathSuffix),
        ff.solution,
        ff.points,
        ff.rawFormula,
        group
      );
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
console.log(`Subtasks: ${task1Subtasks.length}`);
for (const st of task1Subtasks) {
  console.log(`  FF${st.ff_index}: solution="${st.solution}" points=${st.points} label="${st.label}"`);
  console.log(`    prefix: ${st.math_prefix.substring(0, 60)}...`);
  console.log(`    suffix: ${st.math_suffix.substring(0, 60)}...`);
}

db.close();
console.log('\nDone!');
