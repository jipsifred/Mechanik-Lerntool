/**
 * Download task images from CDN URLs stored in the database.
 * Falls back to CDN URLs directly if download fails.
 *
 * Usage: npx tsx server/scripts/extract-images.ts
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import Database from 'better-sqlite3';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DB_PATH = path.resolve(ROOT, 'server/db/mechanik.db');
const IMAGES_DIR = path.resolve(ROOT, 'public/images');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const db = new Database(DB_PATH);

interface TaskRow {
  id: number;
  image_url: string | null;
}

const tasks = db
  .prepare('SELECT id, image_url FROM tasks WHERE image_url IS NOT NULL')
  .all() as TaskRow[];

console.log(`Found ${tasks.length} tasks with images.`);

function download(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    protocol
      .get(url, { timeout: 10000 }, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          resolve(false);
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      })
      .on('error', () => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        resolve(false);
      });
  });
}

async function main() {
  let downloaded = 0;
  let failed = 0;

  for (const task of tasks) {
    if (!task.image_url) continue;

    const filename = `task_${String(task.id).padStart(3, '0')}.png`;
    const dest = path.join(IMAGES_DIR, filename);

    if (fs.existsSync(dest)) {
      downloaded++;
      continue;
    }

    const ok = await download(task.image_url, dest);
    if (ok) {
      downloaded++;
      if (downloaded % 20 === 0) console.log(`  Downloaded ${downloaded}/${tasks.length}...`);
    } else {
      failed++;
    }
  }

  console.log(`\nDone: ${downloaded} downloaded, ${failed} failed.`);
  console.log(`Images saved to: ${IMAGES_DIR}`);
  db.close();
}

main();
