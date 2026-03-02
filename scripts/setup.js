import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envLocal = resolve(root, '.env.local');
const envExample = resolve(root, '.env.example');

if (existsSync(envLocal)) {
  console.log('.env.local already exists — skipping. Delete it manually to regenerate.');
  process.exit(0);
}

const secret = () => randomBytes(64).toString('hex');

let content = readFileSync(envExample, 'utf-8');
content = content
  .replace('CHANGE_ME_RANDOM_64_BYTE_HEX', secret())
  .replace('CHANGE_ME_OTHER_RANDOM_64_BYTE_HEX', secret())
  .replace('MY_GEMINI_API_KEY', '')
  .replace('MY_APP_URL', 'http://localhost:3001');

writeFileSync(envLocal, content);

console.log('✓ .env.local created with fresh JWT secrets.');
console.log('→ Fill in GEMINI_API_KEY in .env.local to enable AI features.');
