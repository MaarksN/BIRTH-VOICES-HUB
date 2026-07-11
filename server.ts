import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  readDb, 
  writeDb, 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken 
} from "./lib/db.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper for authorization check
  const getAuthUser = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return verifyToken(token);
  };

  // --- PERSISTENT DATABASE API ENDPOINTS ---

  // Auth: Register
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, companyName } = req.body;
      if (!email || !password || !companyName) {
        return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
      }

      const db = readDb();
      const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Este email já está cadastrado." });
      }

      const newUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        companyName,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDb(db);

      const token = generateToken({ id: newUser.id, email: newUser.email });
      res.json({
        token,
        user: {
          id: newUser.id,
          name: newUser.email.split('@')[0],
          company: newUser.companyName,
          email: newUser.email
        }
      });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
      }

      const db = readDb();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      const token = generateToken({ id: user.id, email: user.email });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.email.split('@')[0],
          company: user.companyName,
          email: user.email
        }
      });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Auth: Me
  app.get("/api/auth/me", (req, res) => {
    const session = getAuthUser(req);
    if (!session) {
      return res.status(401).json({ error: "Não autorizado." });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === session.id);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    res.json({
      user: {
        id: user.id,
        name: user.email.split('@')[0],
        company: user.companyName,
        email: user.email
      }
    });
  });

  // Workflow Persistence
  app.get("/api/workflow", (req, res) => {
    const session = getAuthUser(req);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const workflow = db.workflows.find(w => w.userId === session.id);
    res.json({ workflow: workflow || null });
  });

  app.post("/api/workflow", (req, res) => {
    const session = getAuthUser(req);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { nodes, edges, name } = req.body;
    const db = readDb();
    let workflow = db.workflows.find(w => w.userId === session.id);

    if (workflow) {
      workflow.nodes = nodes || [];
      workflow.edges = edges || [];
      workflow.name = name || workflow.name || "Default Workflow";
      workflow.updatedAt = new Date().toISOString();
    } else {
      workflow = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        userId: session.id,
        name: name || "Default Workflow",
        nodes: nodes || [],
        edges: edges || [],
        updatedAt: new Date().toISOString()
      };
      db.workflows.push(workflow);
    }

    writeDb(db);
    res.json({ success: true, workflow });
  });

  // Onboarding Checklist
  app.get("/api/onboarding", (req, res) => {
    const session = getAuthUser(req);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const db = readDb();
    const checklist = db.checklist[session.id] || {
      orgCreated: true,
      agentCreated: false,
      telephonyConnected: false,
      knowledgeAdded: false,
      firstTest: false,
      agentPublished: false,
      analyticsActive: false,
      firstCallCompleted: false
    };
    res.json({ checklist });
  });

  app.post("/api/onboarding", (req, res) => {
    const session = getAuthUser(req);
    if (!session) return res.status(401).json({ error: "Não autorizado." });

    const { checklist } = req.body;
    const db = readDb();
    db.checklist[session.id] = checklist;
    writeDb(db);
    res.json({ success: true, checklist });
  });

  // Brand Color
  app.get("/api/brand-color", (req, res) => {
    const session = getAuthUser(req);
    const userId = session ? session.id : 'anonymous';
    const db = readDb();
    res.json({ brandColor: db.brandColors[userId] || "#2563eb" });
  });

  app.post("/api/brand-color", (req, res) => {
    const session = getAuthUser(req);
    const userId = session ? session.id : 'anonymous';
    const { color } = req.body;
    const db = readDb();
    db.brandColors[userId] = color;
    writeDb(db);
    res.json({ success: true, brandColor: color });
  });

  // Call Logs & Telemetry Database
  app.get("/api/call-logs", (req, res) => {
    const session = getAuthUser(req);
    const userId = session ? session.id : 'system';
    const db = readDb();
    
    // Return logs belonging to user, or system default logs
    const logs = db.callLogs.filter(l => l.userId === userId || l.userId === 'system');
    res.json({ callLogs: logs });
  });

  app.post("/api/call-logs", (req, res) => {
    const session = getAuthUser(req);
    const userId = session ? session.id : 'anonymous';
    const { patientName, duration, status, agent } = req.body;

    const db = readDb();
    const newLog = {
      id: crypto.randomUUID().slice(0, 8),
      userId,
      patientName: patientName || "Paciente Anônimo",
      duration: duration || "02:15",
      status: status || "Concluído",
      time: "Agora mesmo",
      agent: agent || "Catarina Triagem",
      timestamp: new Date().toISOString()
    };

    db.callLogs.unshift(newLog);
    // limit database size slightly
    if (db.callLogs.length > 100) {
      db.callLogs = db.callLogs.slice(0, 100);
    }
    writeDb(db);

    res.json({ success: true, log: newLog });
  });

  // API Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, currentMessages, enableSearchGrounding = false } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada no servidor." });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Build history
      const history = currentMessages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Base Config
      const config: any = {
        systemInstruction: prompt,
        temperature: 0.7
      };

      // Search Grounding Option
      if (enableSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: "Responda à minha solicitação mais recente." }] }
        ],
        config
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audioBase64: base64Audio });
    } catch (error: any) {
      console.error("TTS API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt
      });

      let audioBase64 = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
        }
      }

      res.json({ audioBase64, mimeType });
    } catch (error: any) {
      console.error("Lyria API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Video Generation Endpoints
  const { GenerateVideosOperation } = await import('@google/genai');

  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, imageBytes, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Chave da API não configurada." });

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt,
        image: {
          imageBytes,
          mimeType
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });
      
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Veo start error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "API Key missing" });

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      res.json({ done: updated.done, error: updated.error });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.query;
      if (!operationName) return res.status(400).send("No operation name");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).send("API Key missing");

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const op = new GenerateVideosOperation();
      op.name = operationName as string;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) return res.status(404).send("Vídeo não encontrado ou não finalizado.");

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });
      
      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch (error: any) {
      console.error("Video download error:", error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/ai/refactor", async (req, res) => {
    try {
      const { mode, nodes } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      const prompt = `Você é um engenheiro staff especialista em otimização de fluxos de atendimento de voz por IA.
Você deve refatorar as configurações dos nós do fluxo atual de acordo com o modo desejado: "${mode}".

Modos possíveis:
- 'simplify': Simplificar os textos e prompts para respostas diretas.
- 'reduceCost': Reduzir custos substituindo modelos caros por gemini-2.5-flash e otimizando parâmetros.
- 'reduceLatency': Otimizar latência diminuindo o tamanho das perguntas e prompts, solicitando respostas extremamente curtas.
- 'moreHuman': Adicionar técnicas de empatia, respiração, pausas e tom natural nos prompts e configurações de voz.

Nós atuais para refatorar:
${JSON.stringify(nodes, null, 2)}

Sua tarefa:
Retorne os mesmos nós, mantendo seus IDs e posições intactos, mas modificando apropriadamente seus campos "data.label" e "data.config" (por exemplo, promptText, questionText, model, temperature, voiceId, stability, speechRate, etc.) para refletir a otimização solicitada de forma inteligente.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    type: { type: "STRING" },
                    position: {
                      type: "OBJECT",
                      properties: {
                        x: { type: "NUMBER" },
                        y: { type: "NUMBER" }
                      },
                      required: ["x", "y"]
                    },
                    data: {
                      type: "OBJECT",
                      properties: {
                        label: { type: "STRING" },
                        category: { type: "STRING" },
                        config: { type: "OBJECT" }
                      },
                      required: ["label", "category", "config"]
                    }
                  },
                  required: ["id", "type", "position", "data"]
                }
              }
            },
            required: ["nodes"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Refactor API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/ai/generate-workflow", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Chave da API Gemini não configurada." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });

      const systemPrompt = `Você é um Arquiteto de Software Staff especializado em projetar fluxos de atendimento de voz profissionais por telefone/web.
Com base no prompt do usuário: "${prompt}", gere um grafo completo de XYFlow estruturado contendo nós (nodes) e conexões (edges) que façam sentido lógico e técnico para o fluxo desejado.

Tipos de nós suportados:
1. "start": O gatilho de início da chamada. (Ex: Inbound Call Trigger). Config padrão: { channel: "Telefone", language: "pt-BR", timezone: "America/Sao_Paulo", provider: "Twilio", persona: "Recepção Médica", model: "Gemini 3.1 Pro" }
2. "voice": Configurações de voz (TTS). (Ex: Voz ElevenLabs). Config padrão: { provider: "ElevenLabs", voiceId: "Rachel_pt_BR", stability: 0.75, clarity: 0.85, speechRate: 1.0 }
3. "llm": O provedor de modelo de IA. (Ex: Gemini). Config padrão: { provider: "Gemini", model: "gemini-2.5-pro", temperature: 0.2, topP: 0.9, maxTokens: 1024, safetySettings: "Strict" }
4. "prompt": Prompt de instrução do bot. (Ex: Atendimento Inicial). Config padrão: { promptText: "Instruções do robô de forma simpática.", streaming: "Enabled", thinking: "DeepThinking" }
5. "question": Coleta de informação do usuário com regex de validação. (Ex: Coletar CPF, CEP, Nome). Config padrão: { questionText: "Fale seu nome.", maxRetryCount: 3, speechTimeoutMs: 5000, validationRegex: "^[a-zA-Z\\\\s]{3,30}$", variableToSave: "customer_name", fallbackPrompt: "Não entendi, pode repetir?" }
6. "condition": Desvio de fluxo por lógica ou intent. (Ex: Filtro de Suporte). Config padrão: { variable: "intent", operator: "equals", value: "Suporte", naturalLanguageCheck: "false", matchConfidenceThreshold: 0.8 }
7. "switch": Switch menu para várias rotas. Config padrão: { variableToCheck: "userIntent", path0: "Agendamento", path1: "Suporte", path2: "Financeiro" }
8. "knowledge": Busca vetorial / RAG no Notion/PDFs. (Ex: FAQ). Config padrão: { database: "Notion FAQs", ragTopK: 3, minScoreThreshold: 0.72, searchStrategy: "Embeddings + Semantic Match", autoChunkSize: 512 }
9. "tool": Integração HTTP REST API. (Ex: API Cadastrar). Config padrão: { method: "POST", endpoint: "https://api.empresa.com/v1/agenda", headers: "{}", bodyPayload: "{\\"name\\": \\"{{customer_name}}\\"}", timeoutMs: 4000, retryLimit: 2 }
10. "memory": Gerenciador de estado em memória. Config padrão: { variable: "session_id", value: "{{call_id}}" }
11. "human_handoff": Direciona para um operador humano. Config padrão: { queueName: "Suporte Geral", routingPriority: "High" }
12. "end": Desliga / finaliza a chamada.

Regras de posicionamento do layout:
- Inicie o "start" node na posição x: 50, y: 300.
- Distribua os outros nós sequencialmente para a direita (avançando no eixo X de 300 em 300 ou 400 em 400) e faça desvios verticais no eixo Y (por exemplo, y: 150 para ramo de sucesso e y: 480 para ramo de falha ou FAQ) para criar um grafo visualmente elegante, espaçado e fácil de ler sem sobreposições.
- Certifique-se de que cada nó tenha conexões lógicas que façam sentido. Conecte outputs (como sourceHandle "out-0" para Sucesso / Rota 0, "out-1" para Falha / Rota 1 na tomada de decisão ou perguntas) aos nós subsequentes.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              nodes: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    type: { type: "STRING" },
                    position: {
                      type: "OBJECT",
                      properties: {
                        x: { type: "NUMBER" },
                        y: { type: "NUMBER" }
                      },
                      required: ["x", "y"]
                    },
                    data: {
                      type: "OBJECT",
                      properties: {
                        label: { type: "STRING" },
                        category: { type: "STRING" },
                        config: { type: "OBJECT" }
                      },
                      required: ["label", "category", "config"]
                    }
                  },
                  required: ["id", "type", "position", "data"]
                }
              },
              edges: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    id: { type: "STRING" },
                    source: { type: "STRING" },
                    target: { type: "STRING" },
                    sourceHandle: { type: "STRING" },
                    type: { type: "STRING" },
                    data: {
                      type: "OBJECT",
                      properties: {
                        condition: { type: "STRING" },
                        isFallback: { type: "BOOLEAN" }
                      }
                    }
                  },
                  required: ["id", "source", "target"]
                }
              }
            },
            required: ["nodes", "edges"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Generate Workflow API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
