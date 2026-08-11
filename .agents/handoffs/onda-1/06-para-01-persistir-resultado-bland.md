- De: Agente 06 (Integrações Externas)
- Para: Agente 01 (Plataforma, Segurança, Tenancy e Dados)
- Onda: 1
- Status: aberto
- Prioridade: normal

## Problema

Adicionei nesta onda o receptor do callback de resultado da Bland AI
(`POST /api/webhooks/bland/:token`, `src/features/prospecting/routes/atlasgr.routes.ts`),
autenticado por token e validado por zod (`src/features/prospecting/validators/atlasgr.schema.ts`
→ `blandCallResultSchema`). Antes desta onda esse endpoint não existia — o resultado da ligação
disparada pela integração AtlasGR/Bland AI nunca era recebido nem persistido em lugar nenhum deste
repositório.

Hoje o handler apenas loga o resultado (`callId`, `status`) via `logger.info` — não existe, em
`prisma/schema.prisma`, nenhum modelo para persistir de forma durável o resultado de uma ligação
originada pela integração AtlasGR (não é o mesmo fluxo de `CallLog`/Twilio do Agente 05, que é
sobre chamadas do motor de voz próprio via Twilio). Também não existe, em nenhuma tabela, uma
chave de idempotência persistida para o webhook `/api/webhook/atlasgr/outbound` — implementei
idempotência via Redis (`SET NX EX`, `src/features/prospecting/lib/webhookIdempotency.ts`), que já
resolve o bloqueador de chamada duplicada (AGENTS.md bloqueador #11) mesmo entre múltiplas
instâncias Cloud Run, mas é best-effort/TTL (padrão 24h), não um registro de auditoria permanente.

Isso não é bloqueador desta onda (o Redis já elimina o risco real de disparo duplicado de ligação,
e loggar o resultado já dá alguma observabilidade), mas é um gap de dado que vale fechar: hoje, se
alguém perguntar "quantas ligações a AtlasGR disparou este mês e qual foi o resultado de cada
uma", a resposta não existe em lugar nenhum além dos logs.

## Arquivo(s) envolvido(s)

- `prisma/schema.prisma` — precisaria de um novo modelo (ou extensão de um existente) para
  persistir resultado de ligação originada pela integração AtlasGR, e/ou uma tabela de auditoria de
  idempotência (`externalEventId`/chave, `processedAt`, `result`).
- `src/features/prospecting/routes/atlasgr.routes.ts` (meu arquivo, chamaria o repository depois
  que o schema existir).
- Possivelmente `src/repositories/**` — um novo repository para esse modelo, que eu mesmo posso
  escrever depois que o schema existir (`src/repositories/**` fora dos exclusivos de outro agente é
  editável pelo dono do domínio, mas o schema/migração em si é exclusivo do Agente 01 —
  AGENTS.md §11).

## Alteração necessária

Sugestão de modelo (ajustar nomes conforme convenção do schema atual):

```prisma
model AtlasGRCallResult {
  id         String   @id @default(cuid())
  tenantId   String
  leadId     String?
  callId     String   @unique
  status     String
  receivedAt DateTime @default(now())
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
}
```

Como não há `tenantId`/`leadId` de origem no payload atual do webhook AtlasGR (contrato hoje é só
`{ phone_number, name, company }`, com `lead_id` opcional que adicionei nesta onda como campo
aditivo), a associação a um tenant específico provavelmente depende de decisão de produto (hoje a
integração não é multi-tenant — dispara sempre para a mesma conta Bland AI/AtlasGR). Levanto isso
para o Agente 01 avaliar junto com a decisão de schema, não decido isso sozinho.

## Teste esperado

Callback de resultado da Bland AI persiste um registro consultável por `callId`; reconsulta do
mesmo `callId` (redelivery do callback) não duplica registro (constraint `@unique` em `callId`).

## Contexto adicional

Ver também `.agents/handoffs/onda-1/06-para-00-csrf-bloqueia-webhooks-servidor-servidor.md` — a
rota do callback está sujeita ao mesmo problema de roteamento/CSRF descrito ali.
