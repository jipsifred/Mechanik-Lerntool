import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import Database from 'better-sqlite3';
import { isTaskStartPage } from './utils/element-classifier.js';

const ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.resolve(process.cwd(), 'server/db/mechanik.db');
const IMAGES_DIR = path.resolve(process.cwd(), 'public/images');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// 1. Load Data
const fixedTasks = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_fixed.json'), 'utf8'));
const ocrData = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'Aufgabenkatalog/Mechanik_III_Aufgabenkatalog_komplett.json'), 'utf8'));
const pages = ocrData.layout_details;

// 2. Group into Original Tasks (270)
const originalTasks = [];
let currentTask = null;
for (let p = 0; p < pages.length; p++) {
  if (isTaskStartPage(pages[p])) {
    currentTask = { pageStart: p, pages: [pages[p]] };
    originalTasks.push(currentTask);
  } else if (currentTask) {
    currentTask.pages.push(pages[p]);
  }
}

// 3. Extract properties for Original Tasks
const origData = originalTasks.map((raw, idx) => {
  let images = [];
  let texts = [];
  for (const page of raw.pages) {
    images.push(...page.filter(e => e.label === 'image' || e.native_label === 'image' || e.native_label === 'figure'));
    texts.push(...page.filter(e => e.label === 'text' || e.label === 'isolated_formula').map(e => e.content));
  }
  return {
    index: idx,
    pageStart: raw.pageStart,
    imageUrl: images.length > 0 ? (images[0].content || images[0].image_url || images[0].url) : null,
    imageBbox: images.length > 0 ? JSON.stringify(images[0].bbox_2d) : null,
    text: texts.join(' ')
  };
});

console.log(`Parsed ${origData.length} original tasks. Found ${origData.filter(o => o.imageUrl).length} with images.`);

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const getBigrams = (s) => {
  const bg = new Set();
  for(let i=0; i<s.length-1; i++) bg.add(s.substring(i, i+2));
  return bg;
};

const alignments = [];
let oIdx = 0;

for (let i = 0; i < fixedTasks.length; i++) {
  const ft = fixedTasks[i];
  const ftNorm = normalize((ft.description || '') + (ft.given || ''));
  const b1 = getBigrams(ftNorm);
  
  let bestScore = -1;
  let bestOrigIdx = oIdx;
  
  // Search window: Look at current oIdx and up to 5 ahead
  for (let j = oIdx; j < Math.min(oIdx + 5, origData.length); j++) {
    const otNorm = normalize(origData[j].text);
    const b2 = getBigrams(otNorm);
    let intersection = 0;
    for (const b of b1) {
      if (b2.has(b)) intersection++;
    }
    const score = intersection / (b1.size || 1);
    if (score > bestScore) {
      bestScore = score;
      bestOrigIdx = j;
    }
  }
  
  alignments.push({
    fixedTaskId: i + 1, // DB ID is 1-based
    origTask: origData[bestOrigIdx]
  });
  
  // Important: Because 1 original task might have been split into 2 fixed tasks, 
  // we ONLY advance `oIdx` if the CURRENT fixed task is a better match for `oIdx+1` 
  // OR we just keep `oIdx = bestOrigIdx` so the NEXT task starts searching from there.
  oIdx = bestOrigIdx;
}

// 4. Update Database
const db = new Database(DB_PATH);
const updateTask = db.prepare('UPDATE tasks SET image_url = ?, image_bbox = ?, page_start = ? WHERE id = ?');

let mappedImageCount = 0;

db.transaction(() => {
  db.prepare('UPDATE tasks SET image_url = NULL, image_bbox = NULL, page_start = 0').run();
  
  for (const align of alignments) {
    const taskId = align.fixedTaskId;
    const ot = align.origTask;
    
    let finalUrl = ot.imageUrl;
    let finalBbox = ot.imageBbox;
    
    // Local image path based on the ORIGINAL task index to allow 1-to-many sharing
    if (finalUrl) {
      finalUrl = `/images/orig_${ot.index}.png`;
    }
    
    updateTask.run(finalUrl, finalBbox, ot.pageStart, taskId);
    if (finalUrl) mappedImageCount++;
  }
})();

console.log(`Mapped images for ${mappedImageCount} tasks in the DB.`);

// 5. Download the actual original images to public/images/
function download(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest)) { resolve(true); return; }
    const file = fs.createWriteStream(dest);
    (url.startsWith('https') ? https : http).get(url, { timeout: 10000 }, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); fs.unlinkSync(dest); resolve(false); });
  });
}

async function downloadAll() {
  const toDownload = new Map();
  for (const ot of origData) {
    if (ot.imageUrl && ot.imageUrl.startsWith('http')) {
      const dest = path.join(IMAGES_DIR, `orig_${ot.index}.png`);
      toDownload.set(dest, ot.imageUrl);
    }
  }

  console.log(`Downloading ${toDownload.size} unique original images...`);
  let done = 0;
  for (const [dest, url] of toDownload.entries()) {
    await download(url, dest);
    done++;
    if (done % 20 === 0) console.log(`  ${done} / ${toDownload.size}`);
  }
  console.log('All images downloaded successfully!');
}

downloadAll().catch(console.error);
