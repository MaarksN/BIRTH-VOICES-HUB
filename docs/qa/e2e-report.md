# Relatorio E2E

STATUS: PARTIAL

## Ambiente

- Servidor local de producao: `NODE_ENV=production`, `PORT=4517`.
- Storage isolado: `%TEMP%\birth-voices-browser-audit-4517`.
- Navegador: Browser in-app controlado por Playwright.

## Fluxos executados

| Fluxo | Resultado |
|---|---|
| Landing abre | PASS |
| Cadastro | PASS |
| Dashboard autenticado | PASS |
| Criar agente | PASS |
| Persistencia apos refresh | PASS |
| Playground com fallback texto | PASS |
| Salvar sessao | PASS |
| Results mostra sessao | PASS |
| Dashboard recalcula metricas | PASS |
| Logout | PASS |
| Rota protegida sem sessao | PASS |
| Console errors | PASS, nenhum erro registrado |

## Bloqueios

- Microfone/voz real: BLOCKED por permissao do navegador (`not-allowed`).
- Gemini real: BLOCKED por ausencia de `GEMINI_API_KEY`.
- Twilio real: BLOCKED por ausencia de credenciais e URL publica.
- Webhook externo real: BLOCKED por ausencia de endpoint sandbox.
- Staging/producao: BLOCKED por ausencia de URLs.

## Evidencia funcional

Sessao salva via Browser: ID `SES-1780504618271`, 4 campos estruturados, dashboard com 1 agente e 1 sessao, resultados exibindo dados extraidos.

## Decisao

E2E local critico: PASS.
E2E real completo de producao: BLOCKED. Como o prompt exige E2E critico e smoke staging para GO, a decisao final permanece NO-GO.
