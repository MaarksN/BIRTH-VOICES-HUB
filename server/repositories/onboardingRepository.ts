import { readDb, writeDb } from './database.js';
export const onboardingRepository = {
  getChecklist(id: string): any { return readDb().checklist[id]; },
  setChecklist(id: string, v: any): void { const db = readDb(); db.checklist[id] = v; writeDb(db); },
  deleteChecklist(id: string): void { const db = readDb(); delete db.checklist[id]; writeDb(db); }
};
