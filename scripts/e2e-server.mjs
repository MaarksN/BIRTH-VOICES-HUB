import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, '.tmp', 'playwright-data');

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '4173';
process.env.BIRTH_VOICES_DATA_DIR = dataDir;
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

await import(pathToFileURL(path.join(rootDir, 'dist', 'server.cjs')).href);
