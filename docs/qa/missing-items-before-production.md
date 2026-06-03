# O que falta antes de producao

STATUS: READY

## Estrutura

Falta: CI/CD, Docker/deploy, staging, runbooks.

Evidencia: `.github`, `Dockerfile`, compose e infra ausentes.

Consequencia: release nao reproduzivel.

Prioridade: P1.

Criterio para concluir: pipeline verde e smoke em staging.

## Codigo

Falta: lint, format check, testes unitarios/integracao, modularizacao.

Evidencia: scripts ausentes e uso amplo de `any`.

Consequencia: regressao nao bloqueada.

Prioridade: P1.

Criterio para concluir: scripts passam local/CI.

## Funcionalidades reais

Falta: billing real, convites/time, RBAC, integracoes AgentForm, Gemini real validado, Twilio real validado.

Evidencia: billing declara gateway ausente; convites desativados; Twilio/Gemini sem credenciais.

Consequencia: produto nao entrega todas as promessas visiveis.

Prioridade: P1/P2.

Criterio para concluir: fluxos E2E com dados reais de sandbox.

## Banco de dados

Falta: banco produtivo, migrations, indices, constraints, backup, restore, rollback.

Evidencia: storage JSON local.

Consequencia: risco de perda/corrupcao.

Prioridade: P1.

Criterio para concluir: restore testado e migrations aprovadas.

## Seguranca

Falta: Twilio signature, rate limit, CSP/helmet, cookie HttpOnly, SSRF protection, politica de senha, bloqueio de brute force.

Evidencia: codigo e comandos de auditoria.

Consequencia: risco de abuso e vazamento.

Prioridade: P1.

Criterio para concluir: testes negativos e security checklist aprovados.

## Governanca

Falta: CODEOWNERS, SECURITY.md, CONTRIBUTING, branch protection, ADRs, politica de releases.

Prioridade: P2.

Criterio para concluir: documentos e controles aplicados.

## Testes

Falta: unit, integration, contract, E2E critico, accessibility, load/concurrency.

Prioridade: P1.

Criterio para concluir: pipeline com suites obrigatorias.

## Deploy e operacao

Falta: staging, producao documentada, HTTPS, monitoring, alertas, backup/restore, incident response.

Prioridade: P1.

Criterio para concluir: operacao testada em ambiente similar a producao.

