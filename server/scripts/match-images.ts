import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { classifyPageElements, isTaskStartPage } from './utils/element-classifier.js';

const ROOT = path.resolve(process.cwd(), '..');
const OCR_PATH = path.resolve(ROOT, 'Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_komplett.json');
const FIXED_PATH = path.resolve(ROOT, 'Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_fixed.json');
const DB_PATH = path.resolve(process.cwd(), 'server/db/mechanik.db');

console.log('Loading OCR data...');
const ocrData = JSON.parse(fs.readFileSync(OCR_PATH, 'utf-8'));
const pages = ocrData.layout_details;

const rawTasks = [];
let currentTask = null;
for (let p = 0; p < pages.length; p++) {
  if (isTaskStartPage(pages[p])) {
    currentTask = { pageStart: p, pages: [pages[p]] };
    rawTasks.push(currentTask);
  } else if (currentTask) {
    currentTask.pages.push(pages[p]);
  }
}

const originalTasks = [];
for (const raw of rawTasks) {
  const allClassified = [];
  for (let i = 0; i < raw.pages.length; i++) {
    allClassified.push(...classifyPageElements(raw.pages[i], i === 0));
  }
  const descParts = allClassified.filter(c => c.role === 'description').map(c => c.element.content);
  let description = descParts.join('\\n\\n');
  const imageEl = allClassified.find(c => c.role === 'image');
  
  const givenEl = allClassified.find(c => c.role === 'gegeben_formula');
  const given = givenEl ? givenEl.element.content : '';

  originalTasks.push({
    description,
    given,
    image_url: imageEl ? imageEl.element.content : null,
    image_bbox: imageEl ? JSON.stringify(imageEl.element.bbox_2d) : null,
    page_start: raw.pageStart
  });
}

console.log(`Parsed ${originalTasks.length} original tasks.`);

const fixedTasks = JSON.parse(fs.readFileSync(FIXED_PATH, 'utf-8'));
console.log(`Loaded ${fixedTasks.length} fixed tasks.`);

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function stringSimilarity(s1, s2) {
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  if (!n1 || !n2) return 0;
  
  const getBigrams = (s) => {
    const bg = new Set();
    for(let i=0; i<s.length-1; i++) bg.add(s.substring(i, i+2));
    return bg;
  };
  const b1 = getBigrams(n1);
  const b2 = getBigrams(n2);
  let intersection = 0;
  for (const b of b1) {
    if (b2.has(b)) intersection++;
  }
  return (2.0 * intersection) / (b1.size + b2.size || 1);
}

const db = new Database(DB_PATH);
const updateTask = db.prepare(`
  UPDATE tasks SET image_url = ?, image_bbox = ?, page_start = ? WHERE id = ?
`);

let matchedCount = 0;
const transaction = db.transaction(() => {
  db.prepare('UPDATE tasks SET image_url = NULL, image_bbox = NULL').run();

  for (let i = 0; i < fixedTasks.length; i++) {
    const ft = fixedTasks[i];
    const taskId = i + 1;

    let bestMatch = null;
    let bestScore = -1;

    for (const ot of originalTasks) {
      const scoreDesc = stringSimilarity(ft.description, ot.description);
      const scoreGiven = stringSimilarity(ft.given, ot.given);
      const totalScore = (scoreDesc * 2) + scoreGiven;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = ot;
      }
    }

    if (bestMatch && bestScore > 0.5) {
      updateTask.run(bestMatch.image_url, bestMatch.image_bbox, bestMatch.page_start, taskId);
      if (bestMatch.image_url) {
        matchedCount++;
      }
    } else {
        console.log(`Low match score for task ${taskId}: ${bestScore}`);
    }
  }
});

transaction();
console.log(`Updated images for ${matchedCount} tasks in DB.`);
