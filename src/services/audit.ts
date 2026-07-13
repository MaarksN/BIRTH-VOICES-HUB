import { readDb, writeDb } from '../repositories/db.js';
import crypto from 'crypto';

export const writeAuditLog = (userId: string, action: string, details: any) => {
  try {
    const db = readDb();
    const logEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    db.auditLogs.unshift(logEntry);
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    writeDb(db);
  } catch (err) {
    console.error("Audit log persistence failure:", err);
  }
};
