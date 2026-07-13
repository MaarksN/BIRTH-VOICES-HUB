import { readDb, writeDb } from './database.js'; import { CallLog } from '../types/index.js';
export const callLogRepository = {
  findForUser(id: string): CallLog[] { return readDb().callLogs.filter(l => l.userId === id || l.userId === 'system'); },
  findByIdAndUser(id: string, uid: string): CallLog | undefined { return readDb().callLogs.find(l => l.id === id && (l.userId === uid || l.userId === 'system')); },
  create(log: CallLog): CallLog { const db = readDb(); db.callLogs.unshift(log); writeDb(db); return log; },
  update(log: CallLog): void { const db = readDb(); const i = db.callLogs.findIndex(l => l.id === log.id); if (i !== -1) { db.callLogs[i] = log; writeDb(db); } },
  delete(id: string): void { const db = readDb(); db.callLogs = db.callLogs.filter(l => l.id !== id); writeDb(db); }
};
