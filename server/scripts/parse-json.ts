/**
 * Import JSON task files from Aufgaben_neu/ → SQLite database.
 *
 * Reads structured JSON task files and inserts all tasks and subtasks
 * into server/db/mechanik.db.  Stores given variables as editable
 * JSON so they can be changed later via the API.
 *
 * Handles all JSON flavours found in the wild by ALWAYS using the
 * robust fallback parser that properly escapes raw LaTeX backslashes.
 * This prevents silent corruption where e.g. \boxed becomes \b (backspace).
 *
 * Usage:  npm run parse-json
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const ROOT = path.resolve(import.meta.dirname, '../..');
const JSON_DIR = path.resolve(ROOT, '..', 'Aufgaben_neu');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');
const SCHEMA_PATH = path.resolve(ROOT, 'server/db/schema.sql');

// ── Robust JSON reader ──
// ALWAYS uses the fallback escaping path. Never trusts raw JSON.parse,
// because \boxed → \b (backspace), \frac → \f (form-feed), \text → \t (tab)
// are valid JSON escapes that silently corrupt LaTeX without error.
function readJsonFile(filePath: string): any {
  const raw = fs.readFileSync(filePath, 'utf-8');

  let fixed = raw
    .replace(/\r\n/g, ' ')    // CRLF → space
    .replace(/\r/g, ' ')      // CR   → space
    .replace(/\n/g, ' ')      // LF   → space (structural newlines not needed)
    .replace(/\t/g, '\\t')    // tab  → \t  (restores \text, \theta, etc.)
    .replace(/\x08/g, '\\b')  // backspace → \b  (restores \boxed, \bar, \beta)
    .replace(/\f/g, '\\f');   // form-feed → \f  (restores \frac, etc.)

  // Only double LONE backslashes — preserve already-doubled \\ and \uXXXX
  fixed = fixed
    .replace(/\\\\/g, '\x00DBL\x00')                    // stash already-doubled \\
    .replace(/\\u([0-9a-fA-F]{4})/g, '\x00U$1\x00')     // stash \uXXXX unicode escapes
    .replace(/\\/g, '\\\\')                              // double remaining lone \
    .replace(/\x00DBL\x00/g, '\\\\')                    // restore doubles
    .replace(/\x00U([0-9a-fA-F]{4})\x00/g, '\\u$1');    // restore unicode escapes

  return JSON.parse(fixed);
}

// ── Normalize LaTeX ──
// Fixes systematic LaTeX issues across all text fields.
function normalizeTex(s: string): string {
  let result = s;

  // Convert $$...$$ display math to $...$ inline (MarkdownMath only handles $...$)
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, content) => `$${content}$`);

  // Two-step backslash collapse (preserves \\ row breaks in matrices):
  // 1) 3+ backslashes NOT before a letter → \\ (e.g. \\\\ row separator → \\)
  result = result.replace(/\\{3,}(?![a-zA-Z])/g, '\\\\');
  // 2) 2+ backslashes before a letter → \ (e.g. \\frac → \frac)
  result = result.replace(/\\{2,}(?=[a-zA-Z])/g, '\\');

  // Fix matrix row separators: inside matrix/bmatrix environments,
  // a lone \ followed by space is a row break that needs \\ for KaTeX
  result = result.replace(
    /\\begin\{((?:b|p|v|V|B)?matrix)\}([\s\S]*?)\\end\{\1\}/g,
    (_, env, content) => {
      const fixed = content.replace(/(?<!\\)\\ /g, '\\\\ ');
      return `\\begin{${env}}${fixed}\\end{${env}}`;
    }
  );

  // Other systematic fixes
  result = result
    .replace(/\\n(?![a-z])/g, ' ')                          // \n (broken newline) → space (not \nu, \nabla etc.)
    .replace(/\\r(?![a-z])/g, ' ')                          // \r (broken CR) → space (not \rho, \right etc.)
    .replace(/\\phi(?![a-zA-Z])/g, '\\varphi')              // \phi → \varphi (match PDF)
    .replace(/\\epsilon(?![a-zA-Z])/g, '\\varepsilon')      // \epsilon → \varepsilon
    .replace(/(?<![a-zA-Z])ight([)\]\}|])/g, '\\right$1')   // ight) → \right) (broken \right from \r eaten)
    .replace(/\\textcircled\{([^}]*)\}/g, '\\text{($1)}')   // \textcircled{P} → \text{(P)} (KaTeX compat)
    .replace(/\\circled\{([^}]*)\}/g, '\\text{($1)}');       // \circled{P} → \text{(P)} (KaTeX compat)

  return result;
}

// ── Delimiter normalization ──
// Ensures LaTeX in text fields is wrapped in $...$ for KaTeX rendering.

// Convert \(...\) delimiters to $...$
function convertParenDelimiters(s: string): string {
  return s.replace(/\\\((.+?)\\\)/gs, (_, content) => `$${content}$`);
}

// For "Gegeben:" fields: wrap each variable assignment in $...$
// Handles all delimiter styles: no $, full $, mixed $ (some items with, some without)
function ensureGivenDelimiters(s: string): string {
  // Convert \( \) to $ $
  let result = convertParenDelimiters(s);

  // Strip all $ and check if there's LaTeX to wrap
  const noDollars = result.replace(/\$/g, '');
  if (!/\\[a-zA-Z]|[_^]\{/.test(noDollars)) return result;

  // Strip all $ signs and re-wrap each comma-separated assignment uniformly.
  // This handles: no delimiters, full delimiters, AND mixed delimiters (some $ some bare)
  const m = noDollars.match(/^(Gegeben:\s*)/i);
  const prefix = m ? m[1] : '';
  let rest = noDollars.substring(prefix.length).replace(/\.\s*$/, ''); // strip trailing period

  // Split by ", " (comma-space) — safe for German decimals (0,3 has no space)
  const parts = rest.split(/,\s+/);
  const wrapped = parts.map(p => `$${p.trim()}$`).join(', ');
  return prefix + wrapped;
}

// Wrap bare LaTeX commands in $...$ within a text segment (no existing $ blocks)
function wrapBareLatex(s: string): string {
  return s.replace(
    /(\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*(?:[_^](?:\{[^{}]*\}|[a-zA-Z0-9*]))*(?:\([^)]*\))?)|([a-zA-Z]+(?:[_^](?:\{[^}]*\}|[a-zA-Z0-9*]))+)/g,
    match => `$${match}$`
  );
}

// For description fields: wrap bare LaTeX commands in $...$
// Handles strings that ALREADY have some $...$ blocks but also bare LaTeX outside them
function ensureDescDelimiters(s: string): string {
  // Convert \( \) to $ $
  let result = convertParenDelimiters(s);

  // Check if there's bare LaTeX outside any existing $...$ blocks
  const textOutsideDollars = result.replace(/\$[^$]*\$/g, '');
  if (!/\\[a-zA-Z]|[a-zA-Z][_^]\{|[a-zA-Z][_^][a-zA-Z]/.test(textOutsideDollars)) return result;

  // Split into $...$ blocks and text segments, wrap bare LaTeX only in text segments
  const parts = result.split(/(\$[^$]*\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('$') && parts[i].endsWith('$')) continue; // preserve existing math
    parts[i] = wrapBareLatex(parts[i]);
  }
  return parts.join('');
}

function stripDollar(s: string): string {
  return s.trim().replace(/^\$\s*/, '').replace(/\s*\$$/, '');
}

// ── Discover JSON files ──
const jsonFiles = fs
  .readdirSync(JSON_DIR)
  .filter(f => f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

console.log(`Found ${jsonFiles.length} JSON files in ${JSON_DIR}`);

// ── Init DB ──
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

const insertTask = db.prepare(`
  INSERT INTO tasks (page_start, title, total_points, description, given_latex, given_variables, image_url, image_bbox)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSubtask = db.prepare(`
  INSERT OR IGNORE INTO subtasks (task_id, ff_index, label, description, math_prefix, math_suffix, solution, points, raw_formula, formula_group)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── Formula parser ──
// Splits loesung_md at \boxed{...} markers and assigns prefix/suffix
// so the frontend can render:  prefix [INPUT] suffix  for each field.

interface ParsedField {
  prefix: string;
  suffix: string;
  solution: string;
}

function parseLoesung(loesung_md: string): ParsedField[] {
  // Strip $...$ wrapper if present
  const formula = stripDollar(loesung_md);

  const boxedRe = /\\boxed\{([^}]*)\}/g;
  const textParts: string[] = [];
  const solutions: string[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = boxedRe.exec(formula)) !== null) {
    textParts.push(formula.substring(lastIdx, m.index));
    solutions.push(m[1]);
    lastIdx = m.index + m[0].length;
  }
  textParts.push(formula.substring(lastIdx));

  if (solutions.length === 0) return [];

  // Single box — simple case
  if (solutions.length === 1) {
    return [{
      prefix: textParts[0].trim(),
      suffix: textParts[1].trim(),
      solution: solutions[0],
    }];
  }

  // Multi-box — split inter-box text between suffix of prev / prefix of next
  const fields: ParsedField[] = [];

  for (let i = 0; i < solutions.length; i++) {
    let prefix: string;
    let suffix: string;

    if (i === 0) {
      prefix = textParts[0].trim();
    } else {
      // Inter-box text: split at last top-level + or - operator
      const inter = textParts[i];
      const opMatch = inter.match(/^(.*)\s*(\+|-)\s*$/s);
      if (opMatch) {
        // Variable part → suffix of previous field
        if (fields.length > 0) {
          fields[fields.length - 1].suffix = opMatch[1].trim();
        }
        prefix = opMatch[2]; // the operator (+/-)
      } else {
        prefix = inter.trim();
      }
    }

    // Last field gets the trailing text as suffix
    if (i === solutions.length - 1) {
      suffix = textParts[textParts.length - 1].trim();
    } else {
      suffix = ''; // may be updated when processing next field
    }

    fields.push({ prefix, suffix, solution: solutions[i] });
  }

  return fields;
}

// ── Import ──
const warnings: string[] = [];

const transaction = db.transaction(() => {
  for (let fileIdx = 0; fileIdx < jsonFiles.length; fileIdx++) {
    const filePath = path.join(JSON_DIR, jsonFiles[fileIdx]);
    const data = readJsonFile(filePath);
    const aufgabe = data.Aufgabe;

    const title = `Aufgabe ${fileIdx + 1} (${aufgabe.gesamtpunkte} Punkte)`;
    const totalPoints: number = aufgabe.gesamtpunkte;
    const description: string = ensureDescDelimiters(normalizeTex(aufgabe.haupttext.text_md));
    const givenLatex: string = ensureGivenDelimiters(normalizeTex(aufgabe.gegeben.text_md));
    const givenVariables: string = normalizeTex(JSON.stringify(aufgabe.gegeben.variablen_werte));

    const result = insertTask.run(
      fileIdx, title, totalPoints, description, givenLatex, givenVariables, null, null,
    );
    const taskId = result.lastInsertRowid as number;

    let ffIndex = 1;
    let formulaGroup = 0;
    let subtaskFieldCount = 0;

    for (const teil of aufgabe.teilaufgaben) {
      const label = teil.id + ')';
      const stDesc: string = ensureDescDelimiters(normalizeTex(teil.aufgabenstellung_md));
      const rawFormula: string = normalizeTex(teil.loesung_md);

      const fields = parseLoesung(rawFormula);
      const group = formulaGroup++;

      if (fields.length === 0) {
        warnings.push(`⚠ ${jsonFiles[fileIdx]} subtask ${teil.id}: no \\boxed{} found in: "${rawFormula.substring(0, 80)}"`);
      }

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        // First field of each subtask carries the points
        const points = i === 0 ? teil.punkte : 0;

        insertSubtask.run(
          taskId, ffIndex, label, stDesc,
          f.prefix, f.suffix, f.solution,
          points, rawFormula, group,
        );
        ffIndex++;
        subtaskFieldCount++;
      }
    }

    // Validate: every task should have subtasks
    if (subtaskFieldCount === 0) {
      warnings.push(`✗ ${jsonFiles[fileIdx]}: 0 subtask fields inserted! (${aufgabe.teilaufgaben.length} teilaufgaben in JSON)`);
    }

    console.log(`  ✓ ${jsonFiles[fileIdx]} → task ${taskId} (${subtaskFieldCount} fields from ${aufgabe.teilaufgaben.length} subtasks)`);
  }
});

transaction();

// ── Verify ──
const taskCount = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
const subtaskCount = (db.prepare('SELECT COUNT(*) as count FROM subtasks').get() as any).count;
console.log(`\nDatabase created: ${DB_PATH}`);
console.log(`Tasks: ${taskCount}`);
console.log(`Subtasks: ${subtaskCount}`);

// Show warnings
if (warnings.length > 0) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ${w}`);
  }
  console.log('='.repeat(60));
}

// Spot-check: tasks with fewest subtasks
const spotCheck = db.prepare(`
  SELECT t.id, t.title, COUNT(s.id) as sub_count
  FROM tasks t LEFT JOIN subtasks s ON s.task_id = t.id
  GROUP BY t.id
  ORDER BY sub_count ASC, t.id ASC
  LIMIT 10
`).all() as any[];
console.log('\nTasks with fewest subtasks:');
for (const t of spotCheck) {
  console.log(`  ${t.title}: ${t.sub_count} subtask fields`);
}

// ── KaTeX validation ──
// Auto-run after import to catch rendering errors immediately
let katexAvailable = false;
let katex: any;
try {
  katex = require('katex');
  katexAvailable = true;
} catch { /* katex not installed as CJS, skip */ }

if (katexAvailable) {
  const katexErrors: string[] = [];

  function tryKatex(ctx: string, latex: string) {
    try {
      katex.renderToString(latex, { throwOnError: true, strict: false });
    } catch (e: any) {
      katexErrors.push(`  ${ctx}: ${e.message?.split('\n')[0] || e}`);
    }
  }

  function checkMarkdownMath(ctx: string, text: string) {
    if (!text) return;
    const blocks = text.match(/\$([^$]+)\$/g);
    if (blocks) {
      for (const b of blocks) tryKatex(ctx, b.slice(1, -1));
    }
    const outside = text.replace(/\$[^$]*\$/g, '');
    if (/\\[a-zA-Z]/.test(outside)) {
      katexErrors.push(`  ${ctx}: BARE LATEX outside $...$ delimiters`);
    }
  }

  const allTasks = db.prepare('SELECT id, description, given_latex FROM tasks').all() as any[];
  for (const t of allTasks) {
    checkMarkdownMath(`Task ${t.id} desc`, t.description);
    checkMarkdownMath(`Task ${t.id} given`, t.given_latex);
  }

  const allSubs = db.prepare('SELECT task_id, ff_index, label, description, math_prefix, math_suffix FROM subtasks').all() as any[];
  for (const s of allSubs) {
    const ctx = `Task ${s.task_id} ${s.label}FF${s.ff_index}`;
    checkMarkdownMath(`${ctx} desc`, s.description);
    if (s.math_prefix?.trim()) tryKatex(`${ctx} prefix`, s.math_prefix);
    if (s.math_suffix?.trim()) tryKatex(`${ctx} suffix`, s.math_suffix);
  }

  if (katexErrors.length > 0) {
    console.log(`\n${'!'.repeat(60)}`);
    console.log(`KATEX ERRORS (${katexErrors.length}):`);
    for (const e of katexErrors) console.log(e);
    console.log('!'.repeat(60));
  } else {
    console.log('\n✓ KaTeX validation passed — all LaTeX renders correctly');
  }
}

db.close();
console.log('\nDone!');
