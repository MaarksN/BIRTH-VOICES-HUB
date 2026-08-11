- De: Agente 06 (Integrações Externas)
- Para: Agente 00 (Coordenador) — mudança em `server.ts` exige aprovação explícita dele (AGENTS.md §11)
- Onda: 1
- Status: resolvido
- Prioridade: bloqueador

## Problema

`csrfProtection` (`src/middlewares/index.ts`, exclusivo do Agente 01) rejeita com `403` toda
requisição `POST`/`PUT`/`DELETE` sem header `Origin` quando `NODE_ENV=production`. Isso foi
verificado isoladamente (chamando o middleware fora do `server.ts`, com um request fake sem
`Origin` e `NODE_ENV=production`): `nextCalled=false, status=403`.

Chamadas servidor-a-servidor (Node `fetch`, como a que o AtlasGR faz, e presumivelmente qualquer
outro backend externo) tipicamente **não enviam header `Origin`** — isso é um comportamento de
browser, não de `fetch` server-side. Na prática, em produção, qualquer rota mutável montada em
`server.ts` **depois** de `app.use(csrfProtection)` (linha 134) e que dependa de autenticação
própria (segredo compartilhado, Bearer token) em vez de cookie/Origin de navegador fica
inacessível a chamadas legítimas server-to-server.

Isso já foi resolvido para o Twilio: `telephonyRoutes` é montado **antes** de `csrfProtection`
(linha 132 de `server.ts`, com comentário explicando exatamente esse motivo) e usa validação de
assinatura própria (`validateTwilioSignature`) em vez de CSRF.

O mesmo problema afeta hoje, no mínimo:
- `POST /api/webhook/atlasgr/outbound` e `POST /api/webhooks/bland/:token` (meu escopo,
  `src/features/prospecting/routes/atlasgr.routes.ts`) — acabei de adicionar autenticação por
  segredo compartilhado/token a essas rotas nesta onda, mas elas continuam montadas via
  `apiRoutes` (linha 140), **depois** de `csrfProtection` — ou seja, minha autenticação nunca é
  alcançada em produção se o chamador não enviar `Origin`.
- Possivelmente `POST /api/voice/outbound` (Agente 05, `voiceOutbound.routes.ts`), que também usa
  autenticação própria (`requireTenant`/Bearer) em vez de Origin/cookie, e está montado no mesmo
  lugar. Não é meu escopo editar/testar isso, mas o Agente 05 deveria confirmar se o mesmo
  problema se aplica ao caminho que hoje é realmente usado pelo AtlasGR (ver achado relacionado no
  meu relatório de onda: o AtlasGR não chama mais `/api/webhook/atlasgr/outbound`, e sim
  `/api/voice/outbound`).

## Arquivo(s) envolvido(s)

- `server.ts` (linhas 128-140) — ordem de montagem dos routers vs. `csrfProtection`/`express.json()`.
- `src/middlewares/index.ts` (`csrfProtection`) — comportamento em si não precisa mudar, é
  coerente para tráfego de navegador; o problema é rotas de webhook/API-key estarem atrás dele.

Nenhum dos dois é editável por mim (`server.ts` exige aprovação do Agente 00;
`src/middlewares/index.ts` é exclusivo do Agente 01).

## Alteração necessária

Mover a montagem de `atlasgrRoutes` (ou, mais precisamente, dos dois endpoints
`/webhook/atlasgr/outbound` e `/webhooks/bland/:token`) para **antes** de
`app.use(csrfProtection)`/`app.use(express.json())` em `server.ts`, no mesmo padrão já usado para
`telephonyRoutes` (linha 132), com seu próprio `express.json()` local se necessário — minha
validação de segredo compartilhado (`validateAtlasGRSecret`)/token
(`validateBlandCallbackToken`), adicionada nesta onda, já substitui a necessidade de CSRF para
essas duas rotas exatamente como a assinatura do Twilio substitui para as dele.

Recomendo ao Coordenador também acionar o Agente 05 para confirmar/corrigir o mesmo problema em
`/api/voice/outbound`, já que é o caminho hoje efetivamente chamado pelo AtlasGR.

## Teste esperado

Requisição `POST /api/webhook/atlasgr/outbound` com `NODE_ENV=production`, header
`x-atlasgr-webhook-secret` válido, sem header `Origin` — deve retornar `200`/`400`/`401` conforme o
payload, nunca `403` de CSRF.

## Contexto adicional

Reprodução mínima usada para confirmar o comportamento do `csrfProtection` isoladamente (não
commitada, era só um script de verificação local):

```js
import { csrfProtection } from './src/middlewares/index.js';
process.env.NODE_ENV = 'production';
const req = { method: 'POST', headers: { host: 'birth-voices-hub-prod.example.com' } };
const res = { status(c){this.statusCode=c;return this;}, json(b){this.body=b;return this;} };
csrfProtection(req, res, () => console.log('next() called'));
console.log(res.statusCode, res.body);
// => 403 { error: 'Validação de origem de segurança (CSRF) falhou.' }
```

Ver também `.agents/handoffs/onda-1/06-para-01-persistir-resultado-bland.md` e o relatório de onda
do Agente 06 para o achado relacionado de que `/api/webhook/atlasgr/outbound` parece não ser mais
chamado pelo repositório AtlasGR hoje (que migrou para `/api/voice/outbound`) — o que não reduz a
gravidade deste item, já que a rota continua montada e exposta em produção.

## Resolução

Aplicado pelo Coordenador em `integracao/onda-1` (commit `e9a80e2`), com confirmação explícita do
usuário antes de editar `src/middlewares/index.ts` por ser arquivo de segurança sensível:

1. `atlasgrRoutes` removido de `src/routes/index.ts` (`apiRoutes`) e montado diretamente em
   `server.ts` **antes** de `app.use(csrfProtection)`, no mesmo bloco/padrão do `telephonyRoutes`,
   com comentário explicando o motivo.
2. `src/features/prospecting/routes/atlasgr.routes.ts` ganhou `router.use(express.json())` local,
   necessário porque o router passou a rodar antes do `express.json()` global.
3. `csrfProtection` (`src/middlewares/index.ts`) passou a pular a checagem de `Origin` quando a
   requisição já está autenticada por `Authorization: Bearer ...` — resolve também o caso de
   `/api/voice/outbound` citado neste handoff, sem precisar mover essa rota para antes do CSRF (ela
   também é usada pelo navegador com cookie de sessão, então precisa continuar protegida por CSRF
   nesse caminho).

Validado: `npm run typecheck`/`lint`/`build` verdes em `integracao/onda-1`; `npm run test` sem
nenhuma falha nova atribuível a esta mudança (as 5 falhas presentes em
`__tests__/outboundCallService.test.ts` são pré-existentes ao commit de resolução, tratadas no
handoff `05-para-08-outboundCallService-test-update.md`, não relacionadas a CSRF).

Não foi adicionado teste automatizado por este commit — `__tests__/**` é propriedade exclusiva do
Agente 08. Handoff de teste aberto: `.agents/handoffs/onda-1/00-para-08-teste-csrf-bearer-exemption.md`.
