- De: Agente 01 (Plataforma, Segurança, Tenancy e Dados)
- Para: Agente 04 (Voice Runtime e Gateway de IA)
- Onda: 1
- Status: aberto
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
