import { readDb, writeDb } from './database.js';
export const sessionRepository = {
  findForUser(id: string): any[] { return readDb().sessions.filter(s => s.userId === id); },
  findByIdAndUser(id: string, uid: string): any { return readDb().sessions.find(s => s.id === id && s.userId === uid); },
  create(s: any): any { const db = readDb(); db.sessions.push(s); writeDb(db); return s; },
  update(s: any): void { const db = readDb(); const i = db.sessions.findIndex(x => x.id === s.id); if (i !== -1) { db.sessions[i] = s; writeDb(db); } },
  delete(id: string): void { const db = readDb(); db.sessions = db.sessions.filter(s => s.id !== id); writeDb(db); }
};
