import { readDb, writeDb } from '../repositories/database.js';
export function writeAuditLog(userId: string, action: string, metadata: any) { const db = readDb(); db.auditLogs.push({ userId, action, metadata, timestamp: new Date().toISOString() }); writeDb(db); }
