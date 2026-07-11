import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

// Types
export interface User {
  id: string;
  companyName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  nodes: any[];
  edges: any[];
  updatedAt: string;
}

export interface CallLog {
  id: string;
  userId: string;
  patientName: string;
  duration: string;
  status: 'Concluído' | 'Falhou';
  time: string;
  agent: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  workflows: Workflow[];
  callLogs: CallLog[];
  brandColors: Record<string, string>; // userId -> color
  checklist: Record<string, Record<string, boolean>>; // userId -> checklist state
}

const DEFAULT_SCHEMA: DatabaseSchema = {
  users: [],
  workflows: [],
  callLogs: [
    { id: '1024', userId: 'system', patientName: 'Isabela Santos', duration: '03:42', status: 'Concluído', time: 'Há 5 min', agent: 'Catarina Triagem', timestamp: new Date().toISOString() },
    { id: '1023', userId: 'system', patientName: 'Mariana Lima', duration: '05:15', status: 'Concluído', time: 'Há 18 min', agent: 'Catarina Pré-Natal', timestamp: new Date().toISOString() },
    { id: '1022', userId: 'system', patientName: 'Gabriela Costa', duration: '01:10', status: 'Falhou', time: 'Há 45 min', agent: 'Catarina Emergência', timestamp: new Date().toISOString() },
    { id: '1021', userId: 'system', patientName: 'Juliana Rocha', duration: '04:56', status: 'Concluído', time: 'Há 1 hora', agent: 'Catarina Triagem', timestamp: new Date().toISOString() }
  ],
  brandColors: {},
  checklist: {}
};

// Ensure database file exists with correct folder hierarchy
function initDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_SCHEMA, null, 2), 'utf-8');
  }
}

// Low-level atomic file read/write
export function readDb(): DatabaseSchema {
  initDatabase();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Database read failure, resetting to defaults", err);
    return DEFAULT_SCHEMA;
  }
}

export function writeDb(data: DatabaseSchema): void {
  initDatabase();
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Database write failure", err);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
  }
}

// Secure PBKDF2 Password Hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// Generate secure cryptographic session tokens
export function generateToken(payload: { id: string; email: string }): string {
  const secret = process.env.GEMINI_API_KEY || 'birth-voices-hub-default-secret-key-1337';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string } | null {
  if (!token) return null;
  const secret = process.env.GEMINI_API_KEY || 'birth-voices-hub-default-secret-key-1337';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Token expired
    }
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}
