- De: Agente 01 (Plataforma, Segurança, Tenancy e Dados)
- Para: Agente 04 (Voice Runtime e Gateway de IA)
- Onda: 1
- Status: resolvido
- Prioridade: bloqueador

## Problema
`GET /api/observability/metrics` (rota protegida apenas por `requireTenant`, ou seja, qualquer
usuário autenticado de **qualquer** tenant) devolve o conteúdo completo e não filtrado de
`otelCollector.getSpans()` e `otelCollector.getMetrics()`. Esse coletor é um singleton de processo
(`lib/voice-runtime/otel.ts`) sem qualquer noção de `tenantId` — `LocalSpan`/`LocalMetric` só
carregam `sessionId`/`attributes` genéricos. Como o array é global e devolvido inteiro para
qualquer chamador autenticado, um usuário do Tenant A consegue ver spans/métricas geradas por
chamadas/execuções do Tenant B (latência de engine, custo/tokens de LLM por provedor, volume de
chamadas, `sessionId`s de outro tenant). Isso é vazamento cross-tenant real (bloqueador #2 de
`AGENTS.md` — "Vazamento cross-tenant (dado de uma organização acessível por outra)"), não dado
fabricado.

Confirmado por leitura de código (não fabriquei um exploit ao vivo, mas o caminho é direto e
determinístico):
1. `src/controllers/observability.controller.ts:4-6` — `observabilityMetricsHandler` chama
   `otelCollector.getSpans()`/`getMetrics()` sem nenhum filtro.
2. `src/routes/observability.routes.ts` — só aplica `requireTenant`, que exige apenas usuário
   autenticado de *algum* tenant, não do tenant dono do dado.
3. `lib/voice-runtime/otel.ts:4-19` — `LocalSpan`/`LocalMetric` não têm campo `tenantId`.
4. Único chamador real hoje é `lib/voice-runtime/providers/LLMGateway.ts:43,192-193`, que também
   não passa `tenantId` (o primeiro `startLocalSpan` usa `'system'` como `sessionId` fixo). Ou seja,
   a arquitetura de coleta em si já nasce sem isolamento de tenant, antes mesmo de os dados ficarem
   mais ricos na Onda 2.

Não fiz a correção porque `lib/voice-runtime/**` (inclusive `otel.ts` e `providers/**`) é
propriedade exclusiva do Agente 04 por `AGENTS.md` seção 11. Não alterei
`src/controllers/observability.controller.ts` (que não tem dono exclusivo listado) porque, sem
`tenantId` nos dados armazenados, não há nada para filtrar do lado do consumidor — a correção real
tem que nascer no coletor.

## Arquivo(s) envolvido(s)
- `lib/voice-runtime/otel.ts` (owner: Agente 04) — `LocalSpan`, `LocalMetric`,
  `startLocalSpan`, `endLocalSpan`, `recordLocalMetric`, `getSpans`, `getMetrics`.
- `lib/voice-runtime/providers/LLMGateway.ts` (owner: Agente 04) — chamadas a
  `startLocalSpan`/`recordLocalMetric` que precisam passar a receber `tenantId`.
- `src/controllers/observability.controller.ts` (sem dono exclusivo listado) — precisa passar a
  filtrar por `req.tenantId!` assim que o coletor suportar isso.

## Alteração necessária
1. Adicionar `tenantId: string` a `LocalSpan` e `LocalMetric` em `lib/voice-runtime/otel.ts`.
2. `startLocalSpan(name, sessionId, tenantId, attributes)` e
   `recordLocalMetric(name, value, tenantId, attributes)` passam a exigir `tenantId` (ou pelo menos
   aceitá-lo opcionalmente, mas gravando `tenantId: 'system'`/`null` explícito quando não houver —
   nunca omitir o campo silenciosamente).
3. `getSpans(tenantId: string)`/`getMetrics(tenantId: string)` passam a filtrar internamente por
   `tenantId`, em vez de devolver o array inteiro — mesmo princípio de "filtro centralizado no
   repository/coletor, não lembrado no controller" que `AGENTS.md` seção 15 exige para os
   repositories Prisma.
4. Atualizar `LLMGateway.ts` para propagar o `tenantId` real da chamada/sessão que está sendo
   processada (hoje o primeiro `startLocalSpan` usa `sessionId: 'system'` — avaliar se esse
   caminho tem um tenant real disponível no momento da chamada; se não tiver, marcar
   explicitamente como `tenantId: 'system'` e excluir esses spans/metrics de qualquer resposta
   por-tenant, nunca misturá-los com dado de tenant real).
5. Depois que 1-4 estiverem prontos, um agente (04 ou, por handoff de volta, 01) atualiza
   `observability.controller.ts` para chamar `otelCollector.getSpans(req.tenantId!)` /
   `getMetrics(req.tenantId!)`.

## Teste esperado
- Dois tenants distintos geram spans/métricas (via `LLMGateway`/engine real ou mock); usuário do
  Tenant A chama `GET /api/observability/metrics` e o resultado não contém nenhum span/metric cujo
  `tenantId` seja do Tenant B.
- Caso de "system-level" (spans sem tenant real, ex. inicialização) não vaza para nenhuma resposta
  por-tenant específica.

## Contexto adicional
Achado durante a auditoria de tenancy da Onda 1 (missão do Agente 01, item 4: "audite
`src/repositories/**` em busca de qualquer `findMany`/`findUnique` sem filtro de tenant, mesmo fora
do seu escopo de edição direta — se encontrar, handoff para o dono do arquivo"). Este caso é
análogo mas fora de `src/repositories/**` (é um coletor em memória em `lib/voice-runtime/`), então
o mesmo princípio se aplica por extensão. Como este é um bloqueador de vazamento cross-tenant
(prioridade listada em `AGENTS.md` seção 9, item 2), o Coordenador não deveria aprovar a Onda 1 com
este handoff em `Status: aberto`.

## Resolução

Implementado por Agente 04 em `agente/04-remediacao-onda1-observability-leak`
(commit `30e5597 fix(04): tag observability spans/metrics with tenantId and filter reads by
tenant`).

### O que mudou

1. **`lib/voice-runtime/otel.ts`**
   - `LocalSpan`/`LocalMetric` agora exigem `tenantId: string`.
   - Adicionada constante exportada `SYSTEM_TENANT_ID = 'system'` como sentinela explícito para
     registros sem tenant real (nunca omitido silenciosamente).
   - `startLocalSpan(name, sessionId, attributes = {}, tenantId = SYSTEM_TENANT_ID)` e
     `recordLocalMetric(name, value, attributes = {}, tenantId = SYSTEM_TENANT_ID)` — **desvio
     deliberado da ordem de parâmetros sugerida no pedido original** (`tenantId` antes de
     `attributes`). Motivo: `server.ts` (bootstrap seed "Seed some initial traces for live preview
     dashboard", propriedade exclusiva do Agente 00/Coordenador — fora do escopo de edição do
     Agente 04) chama `startLocalSpan`/`recordLocalMetric` posicionalmente passando `attributes`
     como 3º argumento. Inserir `tenantId` antes de `attributes` quebraria a compilação desses
     chamadores sem eu poder corrigi-los. Colocando `tenantId` como último parâmetro opcional
     (default `SYSTEM_TENANT_ID`), os chamadores existentes continuam compilando e passam a marcar
     seus registros como `'system'` explicitamente (nunca omitido) sem precisar editar
     `server.ts`. Chamadores reais (`LLMGateway.ts`) passam `tenantId` explicitamente.
   - `endLocalSpan` agora propaga `span.tenantId` para a métrica derivada `engine_latency_ms` em
     vez de deixá-la cair no default `system`.
   - `getSpans(tenantId = SYSTEM_TENANT_ID)`/`getMetrics(tenantId = SYSTEM_TENANT_ID)` sempre
     filtram (`Array.filter`) em vez de devolver o array bruto. Mesmo a chamada sem argumento
     (usada por `server.ts` só para checar `.length === 0` do seed) é um filtro real — só pode
     devolver registros já marcados `'system'`, nunca dado de tenant real. Não existe mais nenhum
     caminho no coletor que devolva o array inteiro sem filtro.

2. **`lib/voice-runtime/providers/LLMGateway.ts`**
   - `processRequest` ganhou um 4º parâmetro opcional `tenantId: string = SYSTEM_TENANT_ID`
     (também no final, pelo mesmo motivo de compatibilidade posicional — ver handoff aberto abaixo
     para `telephonyService.ts`).
   - Todas as chamadas a `startLocalSpan`/`recordLocalMetric` dentro de `processRequest` passam a
     propagar esse `tenantId`.

3. **`src/controllers/observability.controller.ts`**
   - `observabilityMetricsHandler` agora chama `otelCollector.getSpans(req.tenantId!)` e
     `otelCollector.getMetrics(req.tenantId!)`. `req.tenantId!` é seguro porque `requireTenant`
     (aplicado na rota) já responde 401 antes do handler rodar se `tenantId` não estiver presente.

4. **`src/routes/observability.routes.ts`** — sem alteração; `requireTenant` já era suficiente uma
   vez que o filtro real passou a viver no coletor/controller.

### Handoff derivado

Como `src/services/telephonyService.ts` (propriedade exclusiva do Agente 05) chama
`llmProviderGateway.processRequest(...)` sem passar `tenantId`, abri
`.agents/handoffs/onda-1/04-para-05-llmgateway-tenantid-propagation.md` (prioridade `normal`, não
`bloqueador`) pedindo para o Agente 05 passar `session.tenantId` nessa chamada. Isso é uma lacuna
**funcional**, não de segurança: como o default é `SYSTEM_TENANT_ID`, essas chamadas continuam
isoladas (marcadas `'system'`, nunca misturadas com dado de tenant real) até o handoff ser
resolvido — só ficam temporariamente ausentes do dashboard filtrado por tenant real.

### Teste esperado — evidência

Escrevi e executei um script ad-hoc (`_adhoc-tenant-isolation-check.ts`, na raiz do worktree,
**apagado antes do commit** — não pertence a `__tests__/**`, que é propriedade exclusiva do Agente
08) que:
- gera spans/métricas para `tenant-a` e `tenant-b` via `startLocalSpan`/`recordLocalMetric`/
  `endLocalSpan` (mesmo caminho de código que `LLMGateway.processRequest` usa);
- gera um span/métrica `'system'` sem tenant real (simulando o seed de `server.ts`);
- confirma `getSpans('tenant-a')`/`getMetrics('tenant-a')` só contém registros de `tenant-a` (não
  vê nada de `tenant-b` nem o span `'system'`);
- confirma o mesmo para `tenant-b` (isolamento simétrico);
- confirma `getSpans()`/`getMetrics()` sem argumento (o caminho que `server.ts` usa) só devolve
  registros `'system'`, nunca dado de `tenant-a`/`tenant-b`.

Resultado: 11/11 asserções `OK`, 0 `FAIL`. Ver commit para o texto completo do script (não versionado
por instrução explícita do Coordenador de não tocar `__tests__/**`; recomendação registrada no
handoff derivado para o Agente 05, e disponível para o Agente 08 formalizar como teste automatizado
em `__tests__/otel.test.ts`/`__tests__/observability.controller.test.ts` se desejado).

### Validações executadas (worktree `bvh-wt-agente-04-remediacao`, branch
`agente/04-remediacao-onda1-observability-leak`)

- `npm run typecheck` → `tsc --noEmit`, saída limpa, exit 0.
- `npm run lint` → `eslint .`, 0 erros, 90 warnings pré-existentes (`@typescript-eslint/no-explicit-any`
  em mocks de teste de outros domínios, débito já mapeado em `TECHNICAL-DEBT-CHECKLIST.html` —
  nenhum warning novo introduzido nos 3 arquivos alterados).
- `npm run test` → 252 passed, 5 failed, 1 skipped (258 total). As 5 falhas são em
  `__tests__/outboundCallService.test.ts` (mock incompleto de
  `sessionRepository.createOutboundPhoneSessionIfNoneInFlight`), confirmadas pré-existentes e
  não-relacionadas: reproduzidas de forma idêntica rodando o mesmo arquivo de teste isolado via
  `git stash` (sem minhas alterações) antes de restaurar o trabalho. Fora do escopo/propriedade do
  Agente 04 (`src/services/outboundCallService.ts`/`src/repositories/sessionRepository.ts`).
- `npm run build` → `vite build` + `esbuild server.ts` concluídos com sucesso, exit 0 (único aviso
  é o de chunk size >500kB, pré-existente, não relacionado a este fix).

### Bloqueadores restantes

Nenhum bloqueador de segurança restante para este item. O único item aberto derivado
(`04-para-05-llmgateway-tenantid-propagation.md`) é funcional/normal, não bloqueia release por
vazamento cross-tenant.
