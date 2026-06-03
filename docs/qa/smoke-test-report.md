# Relatorio de smoke test

STATUS: PASS

Comando:

`npm run smoke`

Ambiente:

- Executado apos `npm run build`.
- Servidor `dist/server.cjs` iniciado pelo script em porta aleatoria.
- `BIRTH_VOICES_DATA_DIR` temporario.

Resultado:

`Smoke test passed: status, auth, agents, sessions and integration fallback are healthy.`

Fluxos validados:

- `/api/status` usando storage temporario.
- Cadastro com usuario novo.
- Token retornado.
- `/api/me` com token.
- Criacao de agente.
- Listagem de agente.
- Criacao de sessao.
- Registro de `integrationDelivery.status = not_configured`.
- Listagem de sessao.
- Encerramento e limpeza do storage temporario.

Escopo nao coberto:

- Browser UI completo.
- Gemini real.
- Twilio real.
- Webhook externo real.
- Backup/restore.
- Staging/producao.
- Concorrencia.
- Casos negativos extensivos.

