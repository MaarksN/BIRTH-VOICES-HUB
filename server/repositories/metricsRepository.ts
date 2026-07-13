import { readDb, writeDb } from './database.js';
export const metricsRepository = {
  findForUser(id: string): any[] { return readDb().metrics.filter(m => m.userId === id); },
  create(m: any): any { const db = readDb(); db.metrics.push(m); writeDb(db); return m; },
  deleteAllForUser(id: string): void { const db = readDb(); db.metrics = db.metrics.filter(m => m.userId !== id); writeDb(db); }
};
