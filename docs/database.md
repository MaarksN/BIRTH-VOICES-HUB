# Persistência e Migração

## Decisão da fase

O app mantém o adapter JSON para desenvolvimento local. PostgreSQL fica preparado por migration versionada, mas não é ativado sem aprovação explícita de infraestrutura e credenciais.

## Scripts

```bash
npm run db:migrate
npm run db:seed
npm run db:backup
npm run db:restore -- backups/arquivo.json
```

## Adapter JSON

O arquivo padrão é `data/birth-voices.json`, ou `BIRTH_VOICES_DATA_DIR/birth-voices.json` quando a variável estiver definida.

`db:migrate` adiciona arrays ausentes e cria `organizations`/`memberships` para usuários existentes sem apagar dados.

## Backup e restore

`db:backup` grava uma cópia em `backups/`.

`db:restore` lê um backup, aplica a migração não destrutiva e substitui o arquivo atual.

## PostgreSQL

A migration base está em `migrations/001_initial.sql`, com tabelas e índices para:

- organizations
- users
- memberships
- agents
- sessions
- integrations
- telephony_calls
- integration_deliveries
- audit_logs

## Plano de migração de dados

1. Rodar `npm run db:backup`.
2. Validar o backup em ambiente limpo com `npm run db:restore -- <arquivo>`.
3. Criar banco PostgreSQL e aplicar `migrations/001_initial.sql`.
4. Construir importador JSON para PostgreSQL.
5. Rodar smoke em banco limpo e depois em cópia dos dados reais.
