# Onda 2 — Motor de Voz e Produto — Relatório

Data: 2026-08-11
Branch de integração: `integracao/onda-2` (a partir de `integracao/onda-1`, já aprovada)
Decisão: **APROVADA**

## Especialistas executados

| Agente | Branch | Commits |
|---|---|---|
| 04 — Voice Runtime e Gateway de IA | `agente/04-voice-runtime-ia` | 4 |
| 02 — Produto, Navegação e UX | `agente/02-produto-ux` | 5 |
| 07 — Studio, Workflows e Colaboração | `agente/07-studio-workflows` | 1 |

Três especialistas em paralelo, cada um em worktree isolado, escopo de arquivos sem nenhuma
sobreposição (confirmado por `git diff --stat` antes de cada merge). Merges (`--no-ff`) limpos,
sem conflito.

## Achados e correções

### Agente 04 — Voice Runtime e Gateway de IA
- **Achado grave**: o failover entre provedores de LLM/TTS nunca funcionou de verdade.
  `ProviderManager` nunca registrava nenhum provider (`getHealthyProvider` sempre lançava exceção,
  mesmo para o Gemini "garantido"), e cada provider (Gemini/OpenAI/Anthropic/ElevenLabs/Voicebox)
  capturava a própria falha e devolvia um resultado de sucesso fake (`{text: "Erro: ..."}` chegando
  a ser falado como resposta real ao usuário). Corrigido: todos lançam exceção real; providers são
  registrados no load do módulo; cadeia termina garantidamente em `GoogleGemini`; span/log
  observável a cada degradação.
- LGPD: gate de consentimento antes de qualquer envio de dado a provedor de IA externo
  (implementado via model `Setting` existente, falha fechada quando ausente).
- `ToolEngine` passou a exigir contexto de tenant/permissão por chamada de ferramenta.
- `KnowledgeConfidenceEngine` sinaliza resposta de baixa confiança em vez de apresentá-la como
  certeza.
- Vazamento de memória real corrigido: `endSession` nunca liberava `MemoryPipeline`/
  `LatencyMonitor`/mapa de sessões — grave para uma plataforma que se propõe "alto volume".
- Dashboards com número fabricado (`Analytics.tsx`, abas de `AgentOS.tsx`, `ToolRegistry.tsx`,
  `KnowledgeManager.tsx`, `AgentMarketplace.tsx`) passaram a mostrar rótulo explícito de dado de
  exemplo em vez de número inventado sem aviso.

### Agente 02 — Produto, Navegação e UX
- **Achado grave, mesmo padrão do Agente 04 do lado do frontend**: praticamente todo o Dashboard
  mostrava dado fabricado sem rótulo — 9 KPIs inventados e dois gráficos falsos em `Overview.tsx`,
  cards fixos em `Admin.tsx`, e `Governance.tsx` chegava a afirmar **"SSO Ativado"**, contradizendo
  o achado da Onda 1 de que o fluxo OIDC/Keycloak nunca foi de fato conectado. `Organization.tsx`
  (abas de time/auditoria), `Billing.tsx` (carteira simulada localmente) e `Developers.tsx` (duas
  strings hardcoded no formato exato de chave de API real/de teste) tinham o mesmo problema. Todos
  reescritos para mostrar dado real com loading/empty/error explícitos, ou rótulo honesto de
  "ainda não implementado"/demonstração.
- **Achado de sessão real**: `getUser()` (`lib/auth.ts`) lia um cookie `user_info` que **nenhuma
  rota do servidor jamais setava** — o shell sempre mostrava um usuário fixo fabricado
  ("Marcelin Mark"). Corrigido: sessão real vem de `GET /api/auth/me` para `useSessionStore`.
- Adicionado watcher de expiração de sessão: qualquer 401 dispara logout + redirecionamento para
  `/login`, em vez de deixar a tela travada com sessão morta.
- Rota catch-all adicionada — path não mapeado antes renderizava página em branco.
- `Preferences.tsx` descartava todo save silenciosamente — corrigido para persistir de verdade.

### Agente 07 — Studio, Workflows e Colaboração
- **Achado grave**: publicar/ativar um workflow não existia de fato. `Workflow.status` nunca era
  lido/escrito em lugar nenhum; o botão "Publish" não tinha `onClick`; `ValidationEngine` só
  rodava no navegador. Qualquer save persistia nodes/edges sem validação nenhuma no servidor —
  exatamente o bloqueador #13 de `AGENTS.md`. Corrigido: `workflowService.publishWorkflow()`
  passa a ser o único caminho para `status: 'active'`, revalidando no servidor; qualquer edição
  estrutural subsequente rebaixa o status de volta para `draft` automaticamente (fecha o reopen-bypass).
- Os dois simuladores de teste do Studio (`useStudioStore.startSimulation` e o modal "Test Call")
  fingiam sucesso mesmo com validação falhando, nó de início deletado, ou — no caso do modal — sem
  nenhuma relação real com o grafo (batia num mock de palavra-chave). Corrigidos para refletir
  estado real ou se rotularem explicitamente como simulação/mock.
- Colaboração em tempo real (`workflowCollabService.ts`) auditada e confirmada sem vazamento
  cross-tenant/cross-workflow, com conflito de edição concorrente resolvido por optimistic locking
  documentado (`Workflow.version`, retry, depois `ConflictError`) — nenhuma mudança necessária.

## Contrato Studio ↔ Runtime (achado de coordenação entre agentes paralelos)

O Agente 07 abriu handoff `Prioridade: bloqueador` para o Agente 04 propondo o contrato de
execução de `Workflow.nodes`/`edges` — mas os dois agentes rodaram em worktrees isolados na mesma
onda, então o Agente 04 nunca viu esse handoff (não existia quando ele começou) e, corretamente,
não tocou em nada de `lib/voice-runtime/**` relacionado a workflow.

**Decisão do Coordenador**: este handoff continua `Status: aberto` (não sou o destinatário, não
edito o campo por protocolo), mas **não trato como bloqueador de aprovação desta onda**. Ele não
corresponde a nenhum item da lista de "Bloqueadores prioritários" de `AGENTS.md` §9 — é a proposta
de uma funcionalidade nova e substancial (o runtime hoje não executa nenhum workflow do Studio;
isso é green-field, não uma divergência de contrato existente ou um bypass de segurança). O próprio
Agente 07 já fechou o risco real correspondente (bloqueador #13: publish sem validação) do lado do
Studio, e deixou claro no handoff que os 12 tipos de nó no canvas são intencionalmente "à frente"
do runtime nesta fase, sem fingir suporte (simuladores corrigidos para não mentir sobre isso).
Implementar um motor de execução de grafo completo (12 tipos de nó, roteamento condicional,
ferramentas, memória, conhecimento) como remediação pontual entre ondas seria desproporcional ao
padrão usado nas correções cirúrgicas das ondas anteriores (CSRF, vazamento cross-tenant).

**Recomendação**: este contrato (já bem especificado em
`.agents/handoffs/onda-2/07-para-04-contrato-execucao-workflow.md`) deveria ser a missão principal
da próxima execução do Agente 04, ou de uma onda dedicada, antes de qualquer anúncio de que
"workflows executam de verdade".

## Gate (branch de integração, após todos os merges)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ passou de primeira |
| `npm run lint` | ✅ 0 erros, 90 warnings pré-existentes (idêntico à Onda 1) |
| `npm run test` | ⚠️ 252 passed, 5 failed, 1 skipped — as mesmas 5 falhas já rastreadas desde a Onda 1 (`__tests__/outboundCallService.test.ts`, handoff `05-para-08` aberto, aguardando Agente 08). Nenhuma falha nova introduzida por nenhum dos três especialistas desta onda. |
| `npm run test:contracts` | ✅ 1/1 |
| `npm run build` | ✅ sem erro, mesmo aviso pré-existente de chunk >500kB |

## Handoffs abertos ao final da Onda 2

| Arquivo | Prioridade | Carrega para |
|---|---|---|
| `07-para-04-contrato-execucao-workflow.md` | bloqueador (rebaixado na prática, ver seção acima) | próxima execução do Agente 04 |
| `07-para-09-doc-contrato-workflow.md` | normal | Agente 09 (Onda 4) |
| `04-para-01-ai-consent-schema.md` | normal | Agente 01 (próxima execução) |
| `04-para-06-knowledge-upload-antivirus.md` | normal | Agente 06 (próxima execução) |
| `04-para-05-llmgateway-tenantid-propagation.md` | alto (elevado nesta onda) | Agente 05 (próxima execução) |
| `02-para-00-billing-backend.md` | normal | Coordenador/roadmap |
| `02-para-00-notificacoes-backend.md` | normal | Coordenador/roadmap |
| `02-para-01-audit-log-listagem.md` | normal | Agente 01 (próxima execução) |
| `02-para-04-10-telemetria-overview.md` | normal | Agentes 04/10 |
| `02-para-09-api-key-backend.md` | normal | Agente 09 (Onda 4) |

Mais os handoffs não-bloqueadores já carregados da Onda 1 (SSRF defense-in-depth, retenção de
CallLog, persistência de resultado Bland, teste de CSRF).

Nenhum handoff correspondente à lista de "Bloqueadores prioritários" de `AGENTS.md` permanece
`Status: aberto` sem justificativa registrada.

## Riscos restantes (não-bloqueadores, registrados para as próximas ondas)
1. Runtime de voz ainda não executa nenhum workflow do Studio (ver seção "Contrato Studio ↔
   Runtime" acima) — maior item de escopo pendente do produto, não um defeito introduzido.
2. Gate de consentimento de IA só protege telefonia real depois que `tenantId` for propagado em
   `telephonyService.ts` (handoff elevado a prioridade alto).
3. `outboundCallService.test.ts` ainda com 5 testes vermelhos (herdado da Onda 1, handoff pronto
   para o Agente 08 aplicar).
4. Vários backends de página ainda não existem (billing real, notificações, listagem de audit log,
   chaves de API reais) — cada um agora com estado honesto na UI em vez de dado fabricado, e
   handoff correspondente registrado.

## Decisão

**APROVADA.** As três frentes corrigiram problemas reais e substanciais dentro do próprio escopo
(failover de IA fake-success, dashboard inteiro fabricando dado, publish de workflow sem validação
server-side) sem introduzir nenhuma regressão no gate obrigatório. O único item classificado como
"bloqueador" por um especialista (contrato Studio↔Runtime) foi analisado pelo Coordenador e
reclassificado como proposta de funcionalidade green-field a ser priorizada na próxima execução do
Agente 04, não como impeditivo de integração desta onda. Onda 3 (Design/Acessibilidade + QA/Release)
pode começar a partir de `integracao/onda-2`.
