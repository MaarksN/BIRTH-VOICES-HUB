import { readDb, writeDb } from './database.js'; import { User } from '../types/index.js';
export const userRepository = {
  findByEmail(email: string): User | undefined { return readDb().users.find(u => u.email.toLowerCase() === email.toLowerCase()); },
  findById(id: string): User | undefined { return readDb().users.find(u => u.id === id); },
  create(user: User): User { const db = readDb(); db.users.push(user); writeDb(db); return user; },
  findAll(): User[] { return readDb().users; },
  delete(id: string): void { const db = readDb(); db.users = db.users.filter(u => u.id !== id); writeDb(db); },
  count(): number { return readDb().users.length; }
};
