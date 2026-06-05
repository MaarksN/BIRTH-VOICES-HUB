# Mapa de Refatoração Sustentável

## Antes

- `server.ts` concentra bootstrap, middleware, autenticação, agentes, sessões, integrações, Twilio e IA.
- Frontend repete cards e tratamento de erro em várias páginas.
- Web Speech era tipado por casts soltos.

## Depois desta fase

- Tratamento de erro compartilhado em `lib/errors.ts`.
- Web Speech encapsulado em `lib/speechRecognition.ts`.
- Testes de integração exercitam o servidor real com storage isolado.
- Persistência JSON documentada e acompanhada de scripts de manutenção.
- RBAC e auditoria formalizados no backend.

## Próximos incrementos seguros

- Extrair `server.ts` para `server/app.ts`, `server/routes/*`, `server/middleware/*` e `server/repositories/*`.
- Criar componentes comuns para metric cards, status cards e empty states.
- Adicionar ferramenta de duplicação como `jscpd` depois que o CI estiver estável.
- Adicionar `ts-prune` ou alternativa mantida para exports mortos.

## Garantia

Qualquer refatoração futura deve preservar os contratos cobertos por:

```bash
npm run lint
npm run test
npm run test:integration
npm run typecheck
npm run build
npm run smoke
npm run test:e2e
```
