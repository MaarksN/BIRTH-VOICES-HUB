import crypto from 'crypto'; import bcrypt from 'bcryptjs';
export function hashPassword(password: string): string { return bcrypt.hashSync(password, bcrypt.genSaltSync(12)); }
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.includes(':')) { const [salt, hash] = stored.split(':'); return hash === crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex'); }
  try { return bcrypt.compareSync(password, stored); } catch { return false; }
}
export function generateToken(payload: { id: string; email: string; role: 'admin' | 'user' }): string {
  const secret = process.env.GEMINI_API_KEY || (process.env.NODE_ENV === "production" ? (() => { throw new Error("Missing GEMINI_API_KEY") })() : "dev-secret");
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url');
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
}
export function generateRefreshToken(payload: { id: string }): string {
  const secret = (process.env.GEMINI_API_KEY || (process.env.NODE_ENV === "production" ? (() => { throw new Error("Missing GEMINI_API_KEY") })() : "dev-secret")) + "_refresh";
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 30 })).toString('base64url');
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
}
export function verifyToken(token: string): any {
  if (!token) return null;
  const secret = process.env.GEMINI_API_KEY || (process.env.NODE_ENV === "production" ? (() => { throw new Error("Missing GEMINI_API_KEY") })() : "dev-secret");
  const parts = token.split('.'); if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (signature !== crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')) return null;
  try { const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')); if (payload.exp && Date.now() / 1000 > payload.exp) return null; return payload; } catch { return null; }
}
export function verifyRefreshToken(token: string): any {
  if (!token) return null;
  const secret = (process.env.GEMINI_API_KEY || (process.env.NODE_ENV === "production" ? (() => { throw new Error("Missing GEMINI_API_KEY") })() : "dev-secret")) + "_refresh";
  const parts = token.split('.'); if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (signature !== crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')) return null;
  try { const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')); if (payload.exp && Date.now() / 1000 > payload.exp) return null; return payload; } catch { return null; }
}
