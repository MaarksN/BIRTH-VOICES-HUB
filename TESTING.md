# Testing Strategy

O Birth Voices Hub usa **Vitest** para testes unitários/integrados e **Playwright** para smoke/E2E do artefato compilado. Um release não é considerado validado apenas porque o TypeScript compila ou porque a suíte unitária passa.

## Gate de CI

O workflow oficial executa, nesta ordem:

```text
Prisma migrate → seed → lint → typecheck → Vitest → build → Playwright/Chromium → Docker build
```

Se qualquer etapa falhar, o commit não deve ser promovido para produção.

## Pirâmide de testes

### 1. Unitários e integração leve

Arquivos em `__tests__/` e testes próximos aos módulos (`src/**/*.test.ts`) cobrem funções, serviços, controllers, middleware, RBAC, consentimento, telefonia, workflows e integrações externas com dependências mockadas quando apropriado.

```bash
npm run test
```

Watch mode:

```bash
npm run test -- --watch
```

Ao escrever testes de serviço, prefira mockar **repository/provider boundaries**, não a lógica que está sendo validada. Testes que pretendem provar persistência real devem usar o banco de teste e migrations.

### 2. Build

```bash
npm run build
```

O build precisa passar antes do E2E. O Playwright serve o conteúdo de `dist/`, portanto um smoke verde prova o artefato que realmente será empacotado, não uma tela do Vite dev server.

### 3. Browser/E2E com Playwright

```bash
npm run test:e2e
```

A configuração inicia `npm run start` com:

```text
NODE_ENV=e2e
SERVE_STATIC_BUILD=true
```

`SERVE_STATIC_BUILD=true` faz o Express servir o `dist/` compilado. `NODE_ENV=e2e` é intencional: o origin local do teste é `http://127.0.0.1:3000`, e navegadores corretamente recusam reenviar cookies marcados `Secure` por HTTP.

**Não adicione uma variável para desligar cookies `Secure` em produção só para fazer E2E local passar.** No Cloud Run o processo continua com `NODE_ENV=production`, portanto os cookies de autenticação permanecem `Secure`, `HttpOnly` e `SameSite=Strict`.

## Cenários E2E mínimos

A suíte em `e2e/` cobre no mínimo:

- `GET /api/health`;
- carregamento da landing page do build;
- registro de um tenant novo;
- criação de sessão autenticada via cookie;
- `GET /api/auth/me` como fonte de verdade da sessão;
- logout e rejeição subsequente com `401`;
- login novamente no mesmo tenant.

O teste de autenticação usa e-mail único por execução para não depender de limpeza manual da base efêmera do CI.

## Banco e serviços no CI

O GitHub Actions sobe PostgreSQL e Redis efêmeros, executa `prisma migrate deploy` e seed antes dos testes. O E2E herda essas conexões do job.

Localmente, mantenha PostgreSQL/Redis disponíveis e a base migrada antes de executar testes que dependem de persistência.

## Falhas de E2E

Em CI, falhas do Playwright geram `playwright-report` como artifact. Antes de alterar o produto ou enfraquecer um controle de segurança, abra o relatório/trace e identifique:

1. request e status que falharam;
2. cookies/headers efetivamente enviados;
3. resposta do backend;
4. console/browser errors;
5. se o erro é de produção ou somente do ambiente local de teste.

A correção deve preservar as invariantes de produção. Um teste verde obtido desativando assinatura, consentimento, tenancy, CSRF, cookies seguros ou idempotência é uma regressão, não uma correção.