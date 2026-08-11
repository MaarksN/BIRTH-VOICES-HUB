# Execução Oficial em Ondas

## Onda 0 — Preparação
O Coordenador deve:
- verificar branch/working tree limpo;
- ler `AGENTS.md`;
- verificar ausência de segredos;
- criar/atualizar a branch de integração `integracao/onda-1` a partir de `main`;
- garantir que existem `.agents/runs/` e `.agents/handoffs/` (criar com `README.md` se ausentes);
- levantar baseline com `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` (e `npm run test:e2e`/`test:contracts`/`test:infrastructure` se o ambiente suportar Docker/testcontainers);
- registrar falhas existentes em `.agents/runs/baseline.md`;
- impedir que baseline quebrado seja confundido com regressão nova.

## Onda 1 — Fundação (segurança, telefonia real, integração externa em produção)
Paralelo, máximo 3, cada um em branch/worktree próprio (`agente/01-plataforma-seguranca-dados`, `agente/05-telefonia-webhooks`, `agente/06-integracoes-externas`), todas a partir de `integracao/onda-1`:
- 01 Plataforma, Segurança, Tenancy e Dados
- 05 Telefonia, Chamadas e Webhooks
- 06 Integrações Externas

Prioridade sobre as demais ondas porque: (1) a plataforma já processa chamadas reais via Twilio e já tem um webhook de produção ativo consumido pelo AtlasGR (`/api/webhook/atlasgr/outbound`); (2) RBAC/tenancy quebrado ou webhook sem validação de assinatura tem impacto direto em dado pessoal e em ligação real feita para um lead. UX (02) e Studio (07) esperam a Onda 2 porque dependem de uma fundação de dados/autenticação estável.

### Antes do gate
- revisar `.agents/handoffs/onda-1/**` com `Status: aberto` e `Prioridade: bloqueador`;
- fazer merge de cada branch aprovada em `integracao/onda-1`.

### Gate (rodar na branch de integração)
```bash
npm run typecheck
npm run lint
npm run test
npm run test:contracts
npm run build
```

### Não avançar se existir
- bypass de RBAC/tenant;
- segredo exposto (Twilio, Bland AI, JWT/refresh, webhook signing, S3/MinIO, Keycloak);
- rota de telefonia/webhook sem validação de assinatura ou sem idempotência;
- gravação de voz/dado de contato sem controle de acesso;
- migração Prisma fora do controle do Agente 01;
- handoff bloqueador aberto sem resolução nem justificativa registrada.

## Onda 2 — Motor de Voz e Produto
Paralelo, máximo 3, cada um em branch/worktree próprio (`agente/04-voice-runtime-ia`, `agente/02-produto-ux`, `agente/07-studio-workflows`), todas a partir de `integracao/onda-2` (criada a partir de `integracao/onda-1` já aprovada):
- 04 Voice Runtime e Gateway de IA
- 02 Produto, Navegação e UX
- 07 Studio, Workflows e Colaboração

### Antes do gate
- revisar `.agents/handoffs/onda-2/**` com `Status: aberto` e `Prioridade: bloqueador`;
- fazer merge de cada branch aprovada em `integracao/onda-2`.

### Gate (rodar na branch de integração)
```bash
npm run typecheck
npm run lint
npm run test
npm run test:contracts
npm run build
```

### Não avançar se existir
- failover do `LLMGateway` não caindo de fato no provedor garantido (Gemini);
- dado pessoal enviado a provedor de IA externo sem consentimento registrado;
- navegação/rota do Dashboard quebrada ou inconsistente entre shell (02) e páginas de domínio;
- Studio permitindo publicar workflow que não passou pelo `ValidationEngine`;
- contrato de `Workflow.nodes`/`edges` divergente entre 04 (execução) e 07 (editor) sem handoff resolvido.

## Onda 3 — Acabamento e release
Paralelo, branch/worktree próprio a partir de `integracao/onda-3` (criada a partir de `integracao/onda-2` já aprovada):
- 03 Design System e Acessibilidade
- 08 QA, Testes e Segurança
- 1 agente anterior por vez para correções apontadas por QA (branch de remediação nomeada `agente/<numero>-remediacao-onda3`)

### Antes do gate final
- revisar `.agents/handoffs/onda-3/**` — nenhum item `Prioridade: bloqueador` pode seguir `aberto`;
- fazer merge de cada branch aprovada em `integracao/onda-3`.

### Gate final (rodar na branch de integração)
```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run test:contracts
npm run test:infrastructure
npm run build
```

Quando o ambiente suportar Docker:
```bash
npm run security:trivy
```

A decisão final é binária:
- RELEASE APPROVED
- RELEASE BLOCKED

Não existe "aprovado com teste não executado".

Após RELEASE APPROVED, o Coordenador integra `integracao/onda-3` em `main` e remove os worktrees temporários das três ondas.

## Onda 4 — Extensões (pode ser antecipada por prioridade de negócio)
Paralelo, máximo 3, cada um em branch/worktree próprio (`agente/09-sdk-contratos-docs`, `agente/10-infraestrutura-observabilidade`, `agente/11-supervisao-tempo-real`), a partir de `integracao/onda-4` (criada a partir de `main` já com a Onda 3 integrada):
- 09 SDK, Contratos e Documentação de API
- 10 Infraestrutura, Observabilidade e Deploy
- 11 Supervisão em Tempo Real e Telemetria

Estes três agentes têm escopo de arquivos isolado entre si e das ondas anteriores — não dependem de bloqueador das Ondas 1–3 para começar.

### Antes do gate
- revisar `.agents/handoffs/onda-4/**` com `Status: aberto` e `Prioridade: bloqueador`;
- fazer merge de cada branch aprovada em `integracao/onda-4`.

### Gate (rodar na branch de integração)
```bash
npm run typecheck
npm run lint
npm run build
```

Mais os comandos específicos de cada agente (build do SDK gerado do 09, validação de manifests/pipelines do 10) descritos em seus respectivos prompts.

### Não avançar se existir
- SDK publicado (`packages/sdk`) divergente do `docs/api/openapi.yaml` real;
- pipeline de deploy (`deploy.yml`) capaz de publicar no Cloud Run sem verificar os segredos obrigatórios primeiro;
- manifesto/config de observabilidade ou Keycloak versionado com segredo real;
- LiveSupervisor exibindo telemetria fabricada em vez de stream real via Socket.io;
- `server.ts` alterado por 11 sem aprovação explícita do Coordenador.
