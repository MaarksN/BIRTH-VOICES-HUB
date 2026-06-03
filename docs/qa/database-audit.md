# Auditoria de Banco de Dados e Persistencia

STATUS: FAIL para producao; PASS local

## Modelo real

Nao ha banco relacional/NoSQL externo. A persistencia real e um arquivo JSON:

- `server.ts:76`: `DATA_DIR = process.env.BIRTH_VOICES_DATA_DIR || path.join(process.cwd(), "data")`.
- `server.ts:77`: `DATA_FILE = path.join(DATA_DIR, "birth-voices.json")`.
- `server.ts:109`: `readDatabase`.
- `server.ts:134`: `writeDatabase`.
- `server.ts:137`: grava JSON formatado em arquivo temporario.
- `server.ts:138`: renomeia temporario para arquivo final.

## Entidades persistidas

`Database` inclui:

- `users`
- `tokens`
- `agents`
- `sessions`
- `integrations`
- `telephonyCalls`
- `integrationDeliveries`

## Migrations e schema

Comandos executados:

- Busca por `migrations`, `*.sql`, `schema.prisma`: nenhum resultado.
- Busca por ORM: nao ha Prisma/Sequelize/Mongoose.

Status: NOT APPLICABLE para migrations de banco porque nao ha banco estruturado. FAIL para readiness de producao porque schema versionado, rollback e restore nao existem.

## Integridade e isolamento

PASS local:

- Agentes filtrados por `ownerId` em `server.ts:994`.
- Sessoes filtradas por `ownerId` em `server.ts:1064`.
- Entregas filtradas por `ownerId` em `server.ts:1329`.
- Teste dinamico de isolamento passou: Tenant B nao listou, atualizou, removeu ou retentou recursos do Tenant A.

Riscos:

- Sem constraints de unicidade alem de checagens em codigo.
- Sem transacoes reais entre entrega webhook e gravacao da sessao.
- Tokens e webhook secrets ficam no arquivo JSON local.
- Sem criptografia em repouso.
- Sem backup/restore documentado ou testado.
- Sem indices; busca/filtros dependem de array em memoria.

## Decisao

Local/prototipo: PASS.
Producao: FAIL ate substituir ou envolver a persistencia com banco gerenciado, migrations, backups, restore testado, criptografia/secret management e estrategia de concorrencia.
