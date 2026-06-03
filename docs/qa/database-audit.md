# Auditoria de banco de dados

STATUS: FAIL

Tipo de persistencia: arquivo JSON local.

Arquivo padrao: `data/birth-voices.json`.

Override de teste: `BIRTH_VOICES_DATA_DIR`.

Colecoes logicas:

- `users`
- `tokens`
- `agents`
- `sessions`
- `integrations`
- `telephonyCalls`
- `integrationDeliveries`

Evidencias positivas:

- `readDatabase` cria diretorio/arquivo quando ausente.
- `writeDatabase` grava em arquivo temporario e renomeia.
- Agentes, sessoes, integracoes, chamadas e entregas carregam `ownerId`.
- Smoke usou storage temporario e validou criacao/listagem de usuario, agente e sessao.
- Teste de isolamento criou Usuario A e Usuario B; Usuario B listou 0 agentes, recebeu 404 ao editar/deletar agente de A, e A manteve 1 agente.

Falhas para producao:

- Nao ha banco relacional/documental real.
- Nao ha migrations.
- Nao ha schema versioning.
- Nao ha indices.
- Nao ha constraints.
- Nao ha transacoes.
- Nao ha locking para concorrencia entre requisicoes/processos.
- Nao ha backup configurado.
- Nao ha restore testado.
- Nao ha rollback de schema.
- Nao ha estrategia de retencao/exclusao/portabilidade de dados.

Riscos:

- Corrupcao ou perda de dados em concorrencia, falha de disco ou deploy.
- Dificuldade de evoluir schema sem drift.
- Escalabilidade limitada.
- Backups manuais ou inexistentes bloqueiam producao.

Decisao da fase: FAIL para prontidao de producao. O JSON local e aceitavel para prototipo/local sandbox, nao para plataforma produtiva sem controles adicionais.

