import fs from 'fs'; import path from 'path'; import { DatabaseSchema } from '../types/index.js';
const DB_DIR = path.join(process.cwd(), 'data'); const DB_FILE = path.join(DB_DIR, 'database.json');
const DEFAULT_SCHEMA: DatabaseSchema = { users: [], workflows: [], callLogs: [], brandColors: {}, checklist: {}, auditLogs: [], settings: {}, metrics: [], sessions: [] };
function initDatabase() { if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true }); if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SCHEMA, null, 2), 'utf-8'); }
export function readDb(): DatabaseSchema { initDatabase(); try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch { return DEFAULT_SCHEMA; } }
export function writeDb(data: DatabaseSchema): void { initDatabase(); const tempFile = `${DB_FILE}.tmp`; try { fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8'); fs.renameSync(tempFile, DB_FILE); } catch {} }
