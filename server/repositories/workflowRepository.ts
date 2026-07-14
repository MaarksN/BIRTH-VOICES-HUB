import { readDb, writeDb } from './database.js'; import { Workflow } from '../types/index.js';
export const workflowRepository = {
  findByUserId(userId: string): Workflow | undefined { return readDb().workflows.find(w => w.userId === userId); },
  create(w: Workflow): Workflow { const db = readDb(); db.workflows.push(w); writeDb(db); return w; },
  update(w: Workflow): void { const db = readDb(); const i = db.workflows.findIndex(x => x.id === w.id); if (i !== -1) { db.workflows[i] = w; writeDb(db); } }
};
