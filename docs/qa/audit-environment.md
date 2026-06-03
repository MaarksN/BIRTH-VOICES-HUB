# Ambiente da Auditoria

STATUS: PASS com limitacoes ambientais documentadas

## Identificacao

| Campo | Valor |
|---|---|
| Repositorio | `C:\Users\Marks\Documents\GitHub\BIRTH-VOICES-HUB` |
| Branch | `main` |
| Commit base | `92c1d9d` |
| Data | 2026-06-03 |
| Sistema | Windows / PowerShell |
| Modo | FULL |

## Estado Git

Comandos executados:

- `git status --short`: sem alteracoes antes da geracao destes relatorios.
- `git log --oneline -5`: `92c1d9d`, `cc57e3f`, `dd1f9ba`, `d45ea4d`, `ef67ba8`.
- `git branch -a`: branch local atual `main`; tambem existe branch local `codex/audit-360-production-readiness` e remotes `origin/main`, `origin/codex/*`.

## Ferramentas

| Ferramenta | Status | Evidencia |
|---|---|---|
| Node pelo PATH | FAIL | `node --version` usou `WindowsApps\OpenAI.Codex...\node.exe` e retornou `Acesso negado`. |
| NPM pelo PATH | FAIL | `npm --version`: comando nao reconhecido. |
| Node empacotado | PASS | `C:\Users\Marks\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --version` -> `v24.14.0`. |
| NPM temporario | PASS | Baixado em `%TEMP%\codex-npm-cli`; `npm --version` -> `11.16.0`. |
| Python | PASS | `Python 3.11.9`. |
| Docker | BLOCKED | `docker --version`: comando nao reconhecido. |

## Ambiente e segredos

- Variaveis de ambiente com nomes contendo `SECRET`, `TOKEN`, `PASSWORD`, `API`, `KEY` ou `AUTH`: nenhuma visivel no shell auditado.
- Arquivo `.env.example` contem placeholders vazios para `GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `PUBLIC_BASE_URL`.
- Nenhum segredo hardcoded foi confirmado pelos padroes de Quick Scan.

## Servicos externos

| Servico | Status | Motivo |
|---|---|---|
| Gemini | BLOCKED/PARTIAL | `GEMINI_API_KEY` nao configurada. Fluxo salva registro deterministico sem LLM. |
| Twilio | BLOCKED | Credenciais e `PUBLIC_BASE_URL` ausentes. |
| Webhook externo | BLOCKED | Nenhum endpoint sandbox fornecido. Fallback `not_configured` validado. |
| Staging | BLOCKED | `STAGING_URL` ausente. |
| Producao | BLOCKED | `PRODUCTION_URL` ausente. |

## Observacoes

- `npm ci` inicialmente falhou por `ENOTEMPTY`/`EPERM` ao limpar `node_modules`; `node_modules` foi removido apos verificacao de caminho dentro do workspace e a instalacao passou com o Node empacotado no inicio do `PATH`.
- O servidor local de E2E foi executado com `BIRTH_VOICES_DATA_DIR` temporario para nao tocar dados locais do projeto.
