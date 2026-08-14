- De: Agente 07 (Studio, Workflows e Colaboração)
- Para: Agente 04 (Voice Runtime e Gateway de IA)
- Onda: 2
- Status: resolvido
- Prioridade: bloqueador

## Problema

O Studio (meu domínio) edita `Workflow.nodes`/`Workflow.edges` (Prisma `Json`) e o Voice Runtime
(`lib/voice-runtime/**`, seu domínio) deveria executá-los. Auditei o repositório inteiro
(`grep -rn "findWorkflowForTenant\|workflowRepository\|prisma.workflow" lib/voice-runtime/`) e
**hoje não existe nenhum consumo de `Workflow.nodes`/`edges` em `lib/voice-runtime/**`** — o
runtime não lê workflows do Studio. Este handoff não é uma correção de divergência de contrato
existente; é a proposta do contrato green-field que o runtime deveria implementar para consumir o
que o Studio já produz.

Não espere resposta síncrona — cada agente está isolado no próprio worktree nesta onda. O
Coordenador concilia os dois lados na integração (`integracao/onda-2`).

## Arquivo(s) envolvido(s)
- `prisma/schema.prisma` → `model Workflow` (nodes/edges/status/version, somente leitura para você)
- `lib/studio/types.ts` (fonte de verdade do shape de `StudioNode`/`StudioEdge`)
- `lib/studio/ValidationEngine.ts` (fonte de verdade de quais campos são obrigatórios por tipo de nó)
- `store/useStudioStore.ts` → `nodeRegistry` (fonte de verdade do `defaultConfig` por tipo de nó)
- `src/repositories/workflowRepository.ts` → nova função `findActiveWorkflowForTenant`
- `src/services/workflowService.ts` → nova função `publishWorkflow`

## Contrato proposto

### 1. Onde ler o workflow "pronto para executar"

Use `workflowRepository.findActiveWorkflowForTenant(tenantId)` (nova função que criei nesta
onda), **não** `findWorkflowForTenant(tenantId)`. A diferença importa:

- `findWorkflowForTenant` retorna o workflow mais recentemente atualizado do tenant, **independente
  de ele ter passado por validação** — pode conter um grafo quebrado no meio de uma edição.
- `findActiveWorkflowForTenant` filtra `status: 'active'`, que só é setado por
  `workflowService.publishWorkflow()` **depois** de `ValidationEngine.validate()` retornar
  `isValid: true`. Qualquer edição subsequente (`saveWorkflow`/`updateWorkflow` tocando
  nodes/edges) rebaixa o `status` de volta para `'draft'` automaticamente — então se o runtime só
  ler workflows `active`, nunca vai executar um grafo que não passou pela validação no momento em
  que foi marcado ativo.

Isso é o que fecha o bloqueador #13 do `AGENTS.md` ("Studio permitindo publicar/ativar um workflow
que não passou pelo ValidationEngine") do lado do runtime: se vocês só consomem `status: 'active'`,
o bypass não existe estruturalmente.

`Workflow.nodes`/`Workflow.edges` são `Json` no Postgres — no lado Node.js chegam como `unknown`;
faça o parse defensivo (ver `toStudioGraph()` em `src/services/workflowService.ts` para o padrão
que uso: trate não-array como `[]`, não deixe o runtime explodir em um dado corrompido).

### 2. Shape de `StudioNode` (`lib/studio/types.ts`)

```ts
type NodeType =
  | 'start' | 'end' | 'prompt' | 'question' | 'condition' | 'switch'
  | 'memory' | 'knowledge' | 'tool' | 'human_handoff' | 'voice' | 'llm';

interface StudioNodeData {
  label: string;
  category: string;
  config?: Record<string, unknown>; // shape por tipo, ver seção 3
  // lifecycleState/validation/metrics são só de UI (Studio), ignore no runtime
}

// id: string; type: NodeType; position: {x,y}; data: StudioNodeData
type StudioNode = Node<StudioNodeData, NodeType>; // @xyflow/react Node generic
```

### 3. `data.config` por tipo de nó (hoje, `store/useStudioStore.ts` → `nodeRegistry`)

| type | campos de config relevantes para execução |
|---|---|
| `start` | `channel`, `language`, `timezone`, `provider` (ex. Twilio), `persona`, `model` |
| `voice` | `provider` (ex. ElevenLabs), `voiceId`, `stability`, `clarity`, `speechRate` |
| `llm` | `provider`, `model`, `temperature`, `topP`, `maxTokens`, `safetySettings` |
| `prompt` | `promptText` (obrigatório, não pode ser vazio), `streaming`, `thinking`, `fallbackText` |
| `question` | `questionText` (obrigatório), `maxRetryCount`, `speechTimeoutMs`, `validationRegex`, `variableToSave`, `fallbackPrompt` |
| `condition` | `variable`, `operator`, `value`, `naturalLanguageCheck`, `matchConfidenceThreshold` |
| `switch` | `variableToCheck`, `path0`, `path1`, `path2`, ... (`pathN` por handle `out-N`) |
| `knowledge` | `database` (obrigatório), `ragTopK`, `minScoreThreshold`, `searchStrategy`, `autoChunkSize` |
| `tool` | `method`, `endpoint` (obrigatório), `headers`, `bodyPayload`, `timeoutMs`, `retryLimit` |
| `memory` | `operation`, `variableName`, `variableValue`, `scope` |
| `human_handoff` | `department`, `fallbackNumber`, `ringTimeoutSec`, `recordCall`, `transferMessage` |
| `end` | `saveTranscript`, `exportToWebhook`, `postCallSurvey` |

Os campos marcados "obrigatório" são exatamente os que `ValidationEngine.ts` já rejeita como
`type: 'error'` se ausentes/vazios — ou seja, qualquer workflow `status: 'active'` que vocês leem
já garante essas chaves presentes e não-vazias. Não precisam revalidar isso no runtime por
segurança estrutural (mas claro, tratem erros de execução real — endpoint fora do ar, provider
indisponível — normalmente).

### 4. Shape de `StudioEdge` / roteamento condicional

```ts
interface StudioEdgeData {
  condition?: string;   // texto livre hoje (ex. "Intent == Suporte"), não uma DSL executável
  isFallback?: boolean; // true = branch de fallback/else
  priority?: number;
  event?: string;
}
// edge: { id, source, target, sourceHandle?, targetHandle?, data }
```

- `condition` nós (`type: 'condition'`) têm 2 outputs: `sourceHandle: 'out-0'` (branch de sucesso,
  quando `data.config.variable == data.config.value`) e `'out-1'` (fallback, `data.edges[...].data.isFallback === true`).
- `switch` nós têm N outputs, `sourceHandle: 'out-<index>'`, cada um correspondendo a
  `data.config['path' + index]`.
- `question` nós também têm 2 outputs (`out-0` sucesso / `out-1` esgotou `maxRetryCount`).
- Todos os outros tipos têm exatamente 1 output (`inputs`/`outputs` em `nodeRegistry` documentam
  a cardinalidade esperada por tipo).
- **`StudioEdgeData.condition` é texto livre digitado no Inspector, não uma expressão que dá para
  `eval`** — hoje só o simulador local do Studio (`useStudioStore.startSimulation`) interpreta um
  subconjunto simplificado disso (`variable === value` via `simulationVariables`) para fins de
  preview. Se o runtime real precisar de uma DSL de condição mais rica, isso é uma decisão de
  produto que provavelmente exige mudança de schema em `StudioEdgeData` — me avise antes de mudar,
  ver `AGENTS.md` regra de conflito #4 (contrato de interface antes de qualquer um dos dois mudar
  consumo).

### 5. O que NÃO está pronto — não infira suporte a partir da UI do Studio

Os 12 tipos de nó acima **já aparecem no canvas hoje** (usuário consegue arrastar, configurar e
"publicar" qualquer um deles). Isso é intencional — o Studio está sendo construído à frente do
runtime nesta onda, conforme o prompt de missão do Agente 07 prevê. Mas nenhum deles tem *execução
real* hoje: nem o simulador de step-by-step do Studio (`useStudioStore.startSimulation`) nem o
"Test Call" modal (`components/studio/panels/TestSimulatorModal.tsx`, que hoje só bate num mock
endpoint `/api/chat` com respostas por palavra-chave, sem nenhuma relação com o grafo) provam
compatibilidade com o runtime real — ambos foram corrigidos nesta onda só para pararem de *fingir*
sucesso quando um nó estaria quebrado, não para validar contra o runtime de vocês. **Não tratem a
existência desses tipos no Studio como uma garantia de que o runtime já sabe rodá-los.**

Se, ao implementar, vocês decidirem que algum tipo de nó (ex. `memory`, `switch`) não terá suporte
no curto prazo, me avisem por handoff de volta (`04-para-07-...`) para eu marcar esse tipo como
"preview/rascunho" na UI (badge visual, não vou esconder o nó do catálogo sem essa combinação,
para não regredir a experiência de edição à toa).

## Teste esperado
- Um workflow com `status: 'active'` (passou por `publishWorkflow`) deve ser o único lido por
  qualquer código de execução de chamada real.
- Um teste de integração cobrindo: workflow salvo como `draft` (nunca publicado) → não deve ser
  encontrado por `findActiveWorkflowForTenant` → chamada real não deve iniciar sessão com esse
  workflow.
- Depois de publicar e depois editar (autosave) sem republicar: `findActiveWorkflowForTenant` deve
  voltar `null`/não encontrar (porque o status caiu para `draft`), não o conteúdo velho nem o novo
  não validado.

## Contexto adicional
- Ver commits desta onda no meu branch `agente/07-studio-workflows` para a implementação de
  `publishWorkflow`/`findActiveWorkflowForTenant`/`ValidationEngine` server-side.
- Handoff irmão para o Agente 09 pedindo para formalizar este contrato em `docs/patterns/`:
  `.agents/handoffs/onda-2/07-para-09-doc-contrato-workflow.md`.

## Resolução — 2026-08-14

Resolvido na branch `codex/production-ready-20260814` / PR #33 com um contrato de execução deliberadamente menor que o catálogo visual do Studio, porém real e fail-closed.

### Runtime efetivamente conectado

Foi adicionado `src/services/workflowRuntimeService.ts`, consumido pelo caminho telefônico real em `src/services/telephonyService.ts`.

- somente `findActiveWorkflowForTenant(tenantId)` é usado para selecionar um fluxo de produção;
- o snapshot da versão ativa é persistido na sessão telefônica e permanece estável durante a chamada;
- `start`, `llm`, `prompt`, `question`, `condition`, `switch`, `memory` e `end` possuem execução determinística;
- `question` aplica regex, variável de saída, retry/fallback e roteamento `out-0` / `out-1`;
- `condition` e `switch` roteiam por handles explícitos, sem `eval` de texto livre;
- `end` encerra de fato o TwiML, sem abrir outro `Gather`;
- chamadas ao LLM recebem o `tenantId` real da sessão, portanto consentimento, rate limit, custo e telemetria respeitam tenancy.

### Publicação agora é também um capability gate

`workflowService.publishWorkflow()` mantém o `ValidationEngine` estrutural e acrescenta `validateRuntimeCompatibility()` no servidor. Um grafo visualmente válido **não** recebe `status: active` se depender de semântica que o runtime telefônico não consegue executar com segurança.

Nesta versão, `voice`, `knowledge`, `tool` e `human_handoff` permanecem no catálogo/preview do Studio, mas **são bloqueados na publicação** com erro explícito. Fan-out não determinístico, provider LLM desconhecido, regex inválida e branches condicionais sem handles válidos também falham fechados.

Isso substitui a situação histórica descrita acima em que a UI conseguia publicar tipos que nenhuma chamada real consumia. A existência de um nó no catálogo continua não significando suporte de runtime; o servidor é a fonte de verdade dessa capacidade.

### Cobertura adicionada

- `__tests__/workflowRuntimeService.test.ts`: workflow ativo/draft, providers, prompt, question, condição, retries e fail-closed de capability.
- `__tests__/workflowPublishGate.test.ts`: publicação permitida apenas para grafo estruturalmente válido **e** executável.
- `__tests__/telephonyService.test.ts`: integração do snapshot publicado com turnos telefônicos, tenant/consentimento e cursor.
- `__tests__/telephony.controller.test.ts`: `end` do workflow produz resposta final + `Hangup` sem novo `Gather`.

Funcionalidades avançadas ainda não executáveis não voltam a ser um bloqueador de produção porque o gate impede que sejam ativadas. Elas seguem como evolução de produto até receberem executor e testes correspondentes.