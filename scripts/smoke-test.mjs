import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const port = String(3200 + Math.floor(Math.random() * 1000));
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(tmpdir(), "birth-voices-smoke-"));
const server = spawn(process.execPath, ["dist/server.cjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: port,
    BIRTH_VOICES_DATA_DIR: dataDir,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${pathname} returned ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      return await request("/api/status");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Server did not become ready. Output:\n${serverOutput}`);
}

try {
  const status = await waitForServer();
  assert(status.storage === path.join(dataDir, "birth-voices.json"), "Server is not using isolated smoke-test storage.");

  const email = `qa-${Date.now()}@example.com`;
  const registered = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ companyName: "QA Birth Voices", email, password: "senha-segura-123" }),
  });
  assert(registered.token, "Registration did not return an auth token.");

  const authHeaders = { Authorization: `Bearer ${registered.token}` };
  const me = await request("/api/me", { headers: authHeaders });
  assert(me.user?.email === email, "Authenticated user payload is inconsistent.");

  const agentPayload = {
    name: "Agente QA",
    template: "research",
    description: "Roteiro técnico para validação automatizada.",
    language: "Português Brasileiro",
    tone: ["acolhedor", "objetivo"],
    speed: 1,
    systemInstruction: "Conduza a conversa de QA de forma clara.",
    analysisPrompt: "Extraia campos principais da sessão de QA.",
    questions: [
      { id: "q1", text: "Qual é o nome do contato?", type: "open", collectAs: "Nome", required: true },
      { id: "q2", text: "Há algum risco crítico?", type: "open", collectAs: "Risco", riskKeywords: ["crítico"], stopOnRisk: true },
    ],
  };
  const createdAgent = await request("/api/agents", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(agentPayload),
  });
  assert(createdAgent.agent?.id, "Agent creation did not return an id.");

  const agents = await request("/api/agents", { headers: authHeaders });
  assert(agents.agents.length === 1, "Created agent was not listed.");

  const createdSession = await request("/api/sessions", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      agentName: createdAgent.agent.name,
      caller: "Contato QA",
      duration: "2 min",
      sentiment: "Neutro",
      riskLevel: "Baixo",
      score: 88,
      summary: "Sessão de smoke test concluída com sucesso.",
      transcript: "Agente: Qual é o nome?\nUsuário: Contato QA",
      tags: ["qa", "smoke"],
      followUp: "Nenhuma ação pendente.",
      extracted: [{ label: "Nome", value: "Contato QA" }],
    }),
  });
  assert(createdSession.session?.integrationDelivery?.status === "not_configured", "Session did not record integration delivery fallback.");

  const sessions = await request("/api/sessions", { headers: authHeaders });
  assert(sessions.sessions.length === 1, "Created session was not listed.");

  console.log("Smoke test passed: status, auth, agents, sessions and integration fallback are healthy.");
} finally {
  if (server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
  await rm(dataDir, { recursive: true, force: true });
}
