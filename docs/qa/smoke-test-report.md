# Relatorio de Smoke Test

STATUS: PASS local; BLOCKED staging/producao

## Smoke local automatizado

Comando: `npm run smoke`

Resultado:

`Smoke test passed: status, auth, agents, sessions and integration fallback are healthy.`

O script `scripts/smoke-test.mjs` executa:

1. Sobe `dist/server.cjs` em porta temporaria.
2. Usa `BIRTH_VOICES_DATA_DIR` temporario.
3. Valida `/api/status`.
4. Registra usuario.
5. Valida `/api/me`.
6. Cria agente.
7. Lista agente.
8. Cria sessao.
9. Confirma fallback de integracao `not_configured`.
10. Lista sessoes.

## Smoke local manual/browser

PASS para fluxo:

- cadastro;
- agente;
- playground por texto;
- sessao;
- resultados;
- dashboard;
- logout.

## Smoke staging/producao

BLOCKED:

- `STAGING_URL` nao fornecida.
- `PRODUCTION_URL` nao fornecida.
- credenciais sandbox nao fornecidas.

## Decisao

Smoke local e forte o suficiente para validar funcionamento basico. Nao e suficiente para GO de producao sem staging/producao real.
