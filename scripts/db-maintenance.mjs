import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const dataDir = process.env.BIRTH_VOICES_DATA_DIR || path.join(rootDir, 'data');
const dataFile = path.join(dataDir, 'birth-voices.json');
const backupDir = path.join(rootDir, 'backups');

const emptyDatabase = () => ({
  users: [],
  tokens: [],
  organizations: [],
  memberships: [],
  agents: [],
  sessions: [],
  integrations: [],
  telephonyCalls: [],
  integrationDeliveries: [],
  auditLogs: [],
});

async function readDatabase() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return { ...emptyDatabase(), ...JSON.parse(raw) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return emptyDatabase();
  }
}

async function writeDatabase(data) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

function migrate(data) {
  for (const key of Object.keys(emptyDatabase())) {
    if (!Array.isArray(data[key])) data[key] = [];
  }

  const now = new Date().toISOString();
  for (const user of data.users) {
    if (!data.organizations.some((organization) => organization.id === user.id)) {
      data.organizations.push({
        id: user.id,
        name: user.company || 'Organização',
        brandColor: user.brandColor || '#2563eb',
        createdAt: user.createdAt || now,
        updatedAt: user.updatedAt || now,
      });
    }

    if (!data.memberships.some((membership) => membership.userId === user.id && membership.organizationId === user.id)) {
      data.memberships.push({
        id: crypto.randomUUID(),
        userId: user.id,
        organizationId: user.id,
        role: String(user.role || 'owner').toLowerCase() === 'suspended' ? 'suspended' : 'owner',
        createdAt: user.createdAt || now,
        updatedAt: user.updatedAt || now,
      });
    }
  }

  return data;
}

async function backup() {
  await fs.mkdir(backupDir, { recursive: true });
  const data = await readDatabase();
  const target = path.join(backupDir, `birth-voices-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(target, JSON.stringify(data, null, 2));
  console.log(`Backup written to ${target}`);
}

async function restore(source) {
  if (!source) throw new Error('Usage: npm run db:restore -- <backup-file>');
  const raw = await fs.readFile(path.resolve(source), 'utf8');
  const parsed = migrate({ ...emptyDatabase(), ...JSON.parse(raw) });
  await writeDatabase(parsed);
  console.log(`Restored ${dataFile}`);
}

async function seed() {
  const data = migrate(await readDatabase());
  const firstUser = data.users[0];
  if (!firstUser) {
    console.log('Seed skipped: create a user first, then rerun db:seed.');
    await writeDatabase(data);
    return;
  }

  const tenantId = firstUser.id;
  if (!data.agents.some((agent) => agent.ownerId === tenantId && agent.name === 'Agente Seed QA')) {
    const now = new Date().toISOString();
    data.agents.push({
      id: crypto.randomUUID(),
      ownerId: tenantId,
      name: 'Agente Seed QA',
      template: 'research',
      description: 'Agente criado pelo seed local sem dados sensíveis.',
      language: 'Português Brasileiro',
      tone: ['objetivo'],
      speed: 1,
      systemInstruction: 'Conduza uma validação operacional simples.',
      analysisPrompt: 'Extraia campos principais.',
      questions: [{ id: 'q1', text: 'Qual é o objetivo do contato?', type: 'open', required: true }],
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeDatabase(data);
  console.log('Seed completed without secrets.');
}

const command = process.argv[2];
const data = command === 'migrate' ? migrate(await readDatabase()) : undefined;

if (command === 'migrate') {
  await writeDatabase(data);
  console.log(`Migrated ${dataFile}`);
} else if (command === 'backup') {
  await backup();
} else if (command === 'restore') {
  await restore(process.argv[3]);
} else if (command === 'seed') {
  await seed();
} else {
  throw new Error('Usage: node scripts/db-maintenance.mjs <migrate|backup|restore|seed>');
}
