import { readDb, writeDb } from './database.js';
export const settingsRepository = {
  getSetting(key: string): any { return readDb().settings[key]; },
  setSetting(key: string, v: any): void { const db = readDb(); db.settings[key] = v; writeDb(db); },
  deleteSetting(key: string): void { const db = readDb(); delete db.settings[key]; writeDb(db); }
};
