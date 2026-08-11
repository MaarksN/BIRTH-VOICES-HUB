- De: Agente 01 (Plataforma, Segurança, Tenancy e Dados)
- Para: Agente 05 (Telefonia, Chamadas e Webhooks)
- Onda: 1
- Status: aberto
- Prioridade: normal

## Problema
`src/services/webhook.worker.ts:46` faz `fetch(url, ...)` com a `url` que veio de
`job.data.url`, que por sua vez pode ser o `callbackUrl` fornecido pelo chamador de
`POST /api/voice/outbound` (via `outboundCallService.ts` → `telephonyService.endCall` →
`webhookService.dispatch(..., metadata.callbackUrl)`). Isso é um primitivo de SSRF documentado no
próprio código (`src/validators/index.ts`, comentário original em `callbackUrlSchema`).

Já corrigi a causa raiz no ponto de entrada: `src/validators/index.ts` (`callbackUrlSchema`,
arquivo sem dono exclusivo listado em `AGENTS.md`) agora rejeita literais de IP
privado/loopback/link-local/metadata de nuvem (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12,
192.168.0.0/16, 169.254.0.0/16 incluindo 169.254.169.254, 100.64.0.0/10, `::1`, `fe80::/10`,
`fc00::/7`, `localhost`), então o caminho de exploração via `POST /api/voice/outbound` está
bloqueado hoje.

Não é bloqueador porque a correção de entrada já cobre o único vetor real conhecido atualmente.
Mas `webhook.worker.ts`/`webhook.service.ts` são propriedade exclusiva do Agente 05
(`AGENTS.md` seção 11), então não posso adicionar uma segunda camada de defesa diretamente ali.

## Arquivo(s) envolvido(s)
- `src/services/webhook.worker.ts` (owner: Agente 05) — chamada `fetch(url, ...)`.
- `src/services/webhook.service.ts` (owner: Agente 05) — comentário `TODO: once a Webhook model
  exists, resolve the tenant's configured endpoint here` (linha ~41-43) sinaliza que, quando esse
  Webhook model existir e a URL passar a vir de configuração salva por tenant (em vez de só
  `callbackUrl` por chamada ou `WEBHOOK_URL` de deployment), a mesma validação de SSRF precisa ser
  aplicada nesse novo caminho também — meu handoff aqui é preventivo para esse trabalho futuro.

## Alteração necessária
Sugestão, não obrigatória para a Onda 1: revalidar `url` dentro de `webhook.worker.ts` (ou no
ponto de enfileiramento em `webhook.service.ts`) contra a mesma lista de IPs privados/reservados
antes de chamar `fetch`, como defesa em profundidade — útil sobretudo se, no futuro, a URL do
webhook passar a vir de uma fonte que não passa pelo Zod schema de `outboundCallSchema` (ex.: um
`Webhook` model configurado por um admin de tenant via outro endpoint). Se o Agente 05 preferir
manter a validação centralizada só em `src/validators/index.ts`, também é uma decisão válida —
registrar a decisão em comentário no código, para não reabrir a mesma dúvida depois.

## Teste esperado
Se implementado: enfileirar um job de webhook com `url: 'http://169.254.169.254/...'` diretamente
(bypassando o schema de entrada) e confirmar que `webhook.worker.ts` recusa entregá-lo.

## Contexto adicional
Ver também `src/validators/index.ts` (`isPrivateOrReservedHost`) para a implementação já existente
que pode ser reaproveitada/extraída para um módulo compartilhado se fizer sentido para o Agente 05.
Nota: a checagem atual é só de IP literal, não resolve DNS — um hostname público que resolva para
IP privado no momento da requisição ainda não é bloqueado (limitação documentada no próprio
comentário do validador).
