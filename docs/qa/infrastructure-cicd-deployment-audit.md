# Auditoria de Infraestrutura, CI/CD e Deploy

STATUS: FAIL para producao

## Evidencias

| Item | Resultado |
|---|---|
| `.github/workflows` | Ausente. |
| Dockerfile | Ausente. |
| IaC (`*.tf`, Pulumi) | Ausente. |
| `.env.example` | Presente com variaveis principais. |
| Build local | PASS. |
| Smoke local | PASS. |
| Staging | BLOCKED, URL ausente. |
| Producao | BLOCKED, URL ausente. |

## `.env.example`

Inclui:

- `GEMINI_API_KEY`
- `PORT`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `PUBLIC_BASE_URL`

Nao inclui:

- segredo de sessao/token;
- webhook secret default;
- configuracao de banco externo;
- origem/CORS;
- variaveis de seguranca/observabilidade.

## Matriz de ambientes

| Item | Local | Teste | Staging | Producao |
|---|---|---|---|---|
| Banco | JSON local | Temp JSON em smoke | BLOCKED | BLOCKED |
| Variaveis | `.env.example` parcial | temp env nos scripts | BLOCKED | BLOCKED |
| Migrations | N/A | N/A | FAIL | FAIL |
| Storage | Arquivo local | Arquivo temp | BLOCKED | BLOCKED |
| Monitoramento | Nenhum | Nenhum | BLOCKED | BLOCKED |
| Backup | Ausente | Nao testado | BLOCKED | BLOCKED |

## Decisao

Deploy local e reproduzivel apos bootstrap de Node/NPM. Deploy de producao nao e reproduzivel nem governado por CI/CD, containers, IaC, backup/restore ou observabilidade.
