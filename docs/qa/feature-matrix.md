# Matriz de funcionalidades

STATUS: PARTIAL

| Funcionalidade | Classificacao | Frontend | Backend | Banco/storage | Teste | Observacoes |
|---|---|---|---|---|---|---|
| Cadastro | REAL | PASS | PASS | PASS | PASS smoke/browser | UI registra usuario e recebe token. |
| Login | REAL | PASS | PASS | PASS | PASS smoke | Senha validada com hash. |
| Logout | PARTIAL | PASS | PASS | PASS | NOT TESTED browser | Endpoint remove token atual; sem logout global/revogacao de todos tokens. |
| Perfil/organizacao branding | REAL | PASS | PASS | PASS | PARTIAL | Atualiza company/brandColor. |
| Convites/time | UI ONLY | PASS | MISSING | MISSING | NOT TESTED | Botao "Convites em breve" desativado em `Organization.tsx`. |
| CRUD de agentes | REAL | PASS | PASS | PASS | PASS smoke/browser | Criacao validada por API e UI. |
| Templates de agentes | REAL | PASS | PASS | PASS | PARTIAL | Templates locais persistem ao salvar. |
| Integracoes em AgentForm | UI ONLY | PASS | MISSING | MISSING | NOT TESTED | Cards HubSpot/Salesforce/Webhooks/n8n exibem "Configurar" sem handler. |
| Playground por texto/voz | PARTIAL | PASS | PASS | PASS | BLOCKED E2E headless | Codigo existe; E2E headless bloqueado por estado de speech/input. Smoke cobre salvamento via API. |
| Analise deterministica sem Gemini | REAL | PASS | PASS | PASS | PASS smoke | Salva sessao e fallback `not_configured` de webhook. |
| Analise Gemini | BACKEND ONLY/PARTIAL | PASS status | PASS codigo | PASS | BLOCKED | Sem `GEMINI_API_KEY`; nao validado contra API real. |
| Resultados e CSV | REAL | PASS | PASS | PASS | PASS browser rotas | Renderiza sessoes reais; CSV client-side. |
| Analytics | REAL | PASS | PASS | PASS | PASS browser rotas | Calcula apenas sessoes/agentes reais. |
| Developers webhook | PARTIAL | PASS | PASS | PASS | NOT TESTED externo | Codigo envia HTTP e assina HMAC, mas sem timeout/SSRF/idempotencia. |
| Historico/retry de webhook | PARTIAL | PASS | PASS | PASS | PARTIAL smoke fallback | Sem teste com endpoint real. |
| Telefonia Twilio outbound | PARTIAL | PASS | PASS codigo | PASS | BLOCKED | Sem credenciais Twilio/PUBLIC_BASE_URL; callbacks sem assinatura. |
| Billing | UI ONLY | PASS | MISSING | MISSING | PASS browser parcial | Tela declara ausencia de gateway real. |
| Admin | PARTIAL | PASS | PASS | PASS | PASS browser rota | Mostra status da instalacao do proprio usuario; nao ha RBAC admin. |
| `/api/chat` | BACKEND ONLY | MISSING | PASS | N/A | BLOCKED | Endpoint existe, mas `lib/api.ts` nao expoe uso no frontend. |

Conclusao: as funcionalidades centrais locais de auth, agentes, sessoes e dashboards sao reais em nivel basico. Recursos de producao, billing, times, telefonia real, Gemini real e integrações externas permanecem parciais, bloqueados ou UI-only.

