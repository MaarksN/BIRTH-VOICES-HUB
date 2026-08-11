# Baseline — Onda 0

Data: 2026-08-11
Branch de integração: `integracao/onda-1` (criada a partir de `main`, commit `5e108fd`)
Ambiente: máquina compartilhada com outras sessões concorrentes (múltiplos `claude.exe`/`node.exe`
ativos) — anotado porque afetou a execução do gate, ver "Limitações de ambiente" abaixo.

## Resultado por gate

| Comando | Resultado | Observação |
|---|---|---|
| `npx tsc --noEmit` | ✅ passou | Falhou por OOM (`Zone Allocation failed`) nas duas primeiras tentativas devido a memória livre baixa no host compartilhado (~2.1–2.8 GB livres de 23.4 GB totais); passou na terceira tentativa, sem qualquer mudança de código. Não é falha do projeto — é contenção de memória do ambiente. Especialistas que rodarem `tsc` e baterem em OOM devem tratar como o mesmo problema, não como regressão introduzida. |
| `npm run lint` | ⚠️ 1 erro pré-existente + 90 warnings | Erro: `src/features/prospecting/routes/atlasgr.routes.ts:11` — `'error' is defined but never used` (`@typescript-eslint/no-unused-vars`). Está dentro do escopo do **Agente 06**. Os 90 warnings são `@typescript-eslint/no-explicit-any`, majoritariamente em mocks de teste — já catalogado em `TECHNICAL-DEBT-CHECKLIST.html`, não é achado novo. |
| `npm run test` (Vitest) | ✅ passou | 212 passed, 1 skipped (36 arquivos passaram, 1 skipped). Consistente com `TECHNICAL-DEBT-CHECKLIST.html`. |
| `npm run test:contracts` (Pact) | ✅ passou | 1/1. |
| `npm run test:infrastructure` (testcontainers) | ⏭️ skipped | O único teste do arquivo está marcado `skip` no código-fonte — não é falha, é opt-in não habilitado neste ambiente. |
| `npm run build` | ✅ passou | Só aviso de chunk >500kB (`VoiceStudio`, `index`, `AreaChart`) — não bloqueador para a Onda 1. |
| `npm run test:e2e` (Playwright) | ❌ falhou — limitação de ambiente | Ver "Limitações de ambiente" abaixo. Não é falha do código do BIRTH-VOICES-HUB. |

## Limitações de ambiente (não são regressão de nenhum agente)

1. **Memória compartilhada com outras sessões**: o host roda múltiplas instâncias de
   `claude.exe`/`node.exe` simultaneamente (outras sessões de agente ativas na mesma máquina).
   `tsc --noEmit` chegou a falhar por `Zone Allocation failed` (OOM nativo, não limite de heap do
   V8) quando a memória livre caiu para ~2 GB. Se um especialista bater nisso, registre e tente
   novamente — não é bug de tipo introduzido pelo especialista.
2. **Conflito de porta 3000**: `npm run test:e2e` falhou porque a porta `3000` (usada tanto pelo
   `dev`/`preview` do BIRTH-VOICES-HUB quanto por `.claude/launch.json`) já estava ocupada por outro
   servidor de desenvolvimento ativo no mesmo host (`Portal de Treinamento ATLASGR`, de outro
   repositório/sessão). O Playwright conectou nesse servidor errado em vez de subir o próprio,
   e os dois testes de `e2e/health.spec.ts` falharam por título/rota incorretos — não é falha real
   do frontend do BIRTH-VOICES-HUB. Qualquer especialista rodando `test:e2e` neste ambiente
   compartilhado deve confirmar que nenhum outro processo está ocupando a porta 3000 antes de
   concluir que houve regressão real.

## Decisão

Baseline aceito como **saudável** para os propósitos de gate de código (typecheck/lint/test/build/
contracts). O único achado de código real é o lint error em `atlasgr.routes.ts:11`, atribuído ao
Agente 06. `test:e2e` fica registrado como não confiável neste ambiente compartilhado até rodar em
condição de porta exclusiva — não bloqueia o início da Onda 1, mas o Agente 08 (Onda 3) deve
reavaliar em ambiente isolado antes de decidir release.
