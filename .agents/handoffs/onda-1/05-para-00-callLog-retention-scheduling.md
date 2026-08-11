- De: Agente 05 (Telefonia, Chamadas e Webhooks)
- Para: Agente 00 (Coordenador) — para roteamento a quem for dono da execução periódica (provável Agente 10, Infraestrutura)
- Onda: 1
- Status: aberto
- Prioridade: normal

## Problema

`AGENTS.md` seção 16 atribui ao Agente 05 a garantia de que `CallLog` tem "controle de acesso,
retenção definida e caminho de exclusão". Controle de acesso e exclusão manual já existiam
(`requireTenant` em todas as rotas de `call-logs`, `deleteCallLogHandler` tenant-scoped). Retenção
definida não existia — não havia nenhum mecanismo, nem manual nem agendado, para expirar `CallLog`
antigos. Não existe hoje neste repositório nenhuma infraestrutura de job agendado (sem cron, sem
job repetível do BullMQ, sem pasta `scripts/`) — confirmado por busca no repositório inteiro.

## Alteração feita (dentro do meu escopo)

Implementei o mecanismo, sem agendá-lo (agendamento é decisão de infraestrutura/deploy, fora do meu
escopo):
- `src/repositories/callLogRepository.ts`: nova função `deleteCallLogsOlderThan(cutoff: Date)`
  (bulk delete cross-tenant por `timestamp < cutoff`).
- `src/services/callLogService.ts`: nova função `purgeExpiredCallLogs(retentionDays?)`, padrão de
  365 dias, configurável via `CALL_LOG_RETENTION_DAYS`. Loga quantidade removida e o corte usado.

Nenhuma chamada automática foi adicionada a `server.ts` (não é meu arquivo) nem a nenhum scheduler
novo.

## Arquivo(s) envolvido(s)

- Quem decide *onde* rodar isso: `server.ts` (Agente 00, aprovação explícita necessária para
  qualquer alteração) ou infraestrutura de job agendado (`Dockerfile`,
  `docker-compose*.yml`, `.github/workflows/**`, `infrastructure/**` — Agente 10).

## Alteração necessária

Decidir e implementar o mecanismo de disparo periódico de
`callLogService.purgeExpiredCallLogs()` — por exemplo:
- um repeatable job do BullMQ (mesma infraestrutura de fila já usada por `webhook.worker.ts`, com
  cadência diária), iniciado a partir de `server.ts` ao lado de `startWebhookWorker()`; ou
- um Cloud Run Job / cron container separado, fora do processo web principal.

## Teste esperado

- Rodar `purgeExpiredCallLogs()` (ou o disparo escolhido) contra dados de teste e confirmar que
  `CallLog` mais antigo que `CALL_LOG_RETENTION_DAYS` (ou o padrão de 365 dias) é removido, e que
  `CallLog` dentro da janela não é tocado.
- Confirmar que a execução cobre todos os tenants (a função é intencionalmente cross-tenant — é uma
  purge global, não uma operação por tenant).

## Contexto adicional

Não é bloqueador de release da Onda 1: não há gravação de áudio hoje neste produto (busquei por
`<Record>`/`RecordingUrl`/`RecordingSid` em todo `src/` — nenhuma ocorrência), então o `CallLog`
contém apenas texto (nome do contato, duração, status, nome do agente) e nenhum dado de voz. O risco
de acúmulo indefinido de dado pessoal ainda existe (LGPD minimização), mas é menor sem áudio
anexado. Registrando como prioridade "normal", não "bloqueador".
