# Ambiente da auditoria

STATUS: PASS

Data e hora: 2026-06-03T12:42:20.1764346-03:00

Repositorio: `C:\Users\Marks\Documents\GitHub\BIRTH-VOICES-HUB`

Branch inicial: `main`

Branch de auditoria: `codex/audit-360-production-readiness`

Commit base: `cc57e3f8e0625b0252cd75de83b6a4a0ad03530a`

Estado inicial do Git: limpo em `main`; branch tecnico criado antes dos relatorios.

Sistema operacional:

- Microsoft Windows 11 Pro
- Versao: 10.0.26200
- Arquitetura: 64 bits

Runtimes:

- Node global do app Codex em PATH: bloqueado por `Acesso negado`.
- Node usado nos testes: `C:\Users\Marks\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`, versao `v24.14.0`.
- `npm` global: ausente no PATH.
- `npm` temporario usado na auditoria: `11.16.0`, baixado do registry em `%TEMP%\codex-npm-cli`.
- Python: `3.11.9`.
- pip: `24.0`.
- Git: `2.52.0.windows.1`.

Servicos externos esperados:

- Gemini: `GEMINI_API_KEY`.
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `PUBLIC_BASE_URL`.
- Webhook CRM/ATS/backend: configurado pelo usuario em Developers.

Variaveis de ambiente documentadas em `.env.example`:

- `GEMINI_API_KEY`
- `PORT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `PUBLIC_BASE_URL`

Limitacoes encontradas:

- `node.exe` do PATH padrao retornou `Acesso negado`.
- `npm`, `pnpm`, `yarn` e `bun` nao estavam disponiveis no PATH.
- Playwright estava instalado no runtime, mas sem Chromium baixado; a auditoria usou Chrome instalado em `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Nao havia credenciais reais de Gemini, Twilio, webhook externo, staging ou producao.
- Nao havia banco real; a persistencia e um arquivo JSON local.

Riscos de executar alteracoes:

- `node_modules` e `dist` foram gerados localmente e estao ignorados pelo Git.
- Nenhum arquivo de dados real em `data/` foi encontrado antes dos testes.
- Testes que precisaram de persistencia usaram diretorios temporarios via `BIRTH_VOICES_DATA_DIR`.

