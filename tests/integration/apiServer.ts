import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../..');

export type ApiTestServer = {
  baseUrl: string;
  dataDir: string;
  output: () => string;
  stop: () => Promise<void>;
};

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer(baseUrl: string, output: () => string) {
  const deadline = Date.now() + 20000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/status`);
      if (response.ok) return;
    } catch {
      await delay(200);
    }
  }

  throw new Error(`API test server did not become ready.\n${output()}`);
}

export async function startApiTestServer(env: Record<string, string> = {}): Promise<ApiTestServer> {
  const port = 3300 + Math.floor(Math.random() * 2000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = await mkdtemp(path.join(tmpdir(), 'birth-voices-integration-'));
  const tsxCli = path.join(rootDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  let serverOutput = '';

  const child = spawn(process.execPath, [tsxCli, path.join(rootDir, 'server.ts')], {
    cwd: rootDir,
    env: {
      ...process.env,
      BIRTH_VOICES_DATA_DIR: dataDir,
      GEMINI_API_KEY: '',
      NODE_ENV: 'production',
      PORT: String(port),
      PUBLIC_BASE_URL: baseUrl,
      TWILIO_AUTH_TOKEN: 'integration-test-token',
      WEBHOOK_TIMEOUT_MS: '1000',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk: Buffer) => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    serverOutput += chunk.toString();
  });

  await waitForServer(baseUrl, () => serverOutput);

  return {
    baseUrl,
    dataDir,
    output: () => serverOutput,
    stop: async () => {
      if (child.exitCode === null) {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        child.kill('SIGTERM');
        await Promise.race([exited, delay(5000)]);
      }

      await rm(dataDir, { recursive: true, force: true });
    },
  };
}
