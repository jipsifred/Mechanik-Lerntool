import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve('server/db/mechanik.db');
const IMAGES_PATH = path.resolve('all_images.json');

const images = JSON.parse(fs.readFileSync(IMAGES_PATH, 'utf-8'));
const db = new Database(DB_PATH);

const tasks = db.prepare('SELECT id, description, title FROM tasks').all();

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const updateTask = db.prepare(`
  UPDATE tasks SET image_url = ?, image_bbox = ?, page_start = ? WHERE id = ?
`);

let matchedCount = 0;
const transaction = db.transaction(() => {
  // Clear existing images
  db.prepare('UPDATE tasks SET image_url = NULL, image_bbox = NULL, page_start = 0').run();

  for (const task of tasks) {
    const taskNorm = normalize(task.description);
    
    let bestImg = null;
    let bestScore = -1;

    for (const img of images) {
      const imgNorm = normalize(img.surrounding_text);
      
      // Calculate how much of the task description is in the image surrounding text
      let score = 0;
      
      // Bigram overlap
      const getBigrams = (s) => {
        const bg = new Set();
        for(let i=0; i<s.length-1; i++) bg.add(s.substring(i, i+2));
        return bg;
      };
      
      const b1 = getBigrams(taskNorm);
      const b2 = getBigrams(imgNorm);
      
      let intersection = 0;
      for (const b of b1) {
        if (b2.has(b)) intersection++;
      }
      
      score = intersection / (b1.size || 1); // Percentage of task bigrams found in image text

      if (score > bestScore) {
        bestScore = score;
        bestImg = img;
      }
    }

    if (bestImg && bestScore > 0.4) {
      updateTask.run(bestImg.url, JSON.stringify(bestImg.bbox), bestImg.page, task.id);
      matchedCount++;
      // Remove matched image from pool so it doesn't get assigned twice (optional, but good for 1:1)
      const idx = images.indexOf(bestImg);
      if (idx > -1) images.splice(idx, 1);
    } else {
      console.log(`No good image match for task ${task.id}, best score: ${bestScore}`);
    }
  }
});

transaction();
console.log(`Successfully mapped ${matchedCount} images to tasks!`);
