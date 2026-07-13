import { readDb, writeDb } from './database.js';
export const brandColorRepository = {
  getColor(id: string): any { return readDb().brandColors[id]; },
  setColor(id: string, v: string): void { const db = readDb(); db.brandColors[id] = v; writeDb(db); },
  deleteColor(id: string): void { const db = readDb(); delete db.brandColors[id]; writeDb(db); }
};
