# Guia de Secrets e Variáveis de Ambiente

Este guia detalha todas as secrets e configurações necessárias para operar e fazer deploy do **Birth Voices Hub**.
**NUNCA adicione valores reais neste arquivo ou em qualquer repositório.**

## 1. Google Cloud / GitHub Actions Secrets
Para que o workflow de CI/CD `deploy.yml` funcione corretamente, as seguintes secrets DEVEM ser cadastradas na interface do repositório no GitHub (*Settings > Secrets and variables > Actions*):

| Nome do Secret | Descrição | Impacto se Ausente |
|----------------|-----------|--------------------|
| `GCP_PROJECT_ID` | O ID do projeto no Google Cloud. | O deploy no Cloud Run falhará. |
| `GCP_SA_KEY` ou `GCP_CREDENTIALS` | Credenciais JSON da Service Account com permissão de Workload Identity ou acesso direto. | Falha de autenticação no GCP. |
| `PRODUCTION_DATABASE_URL` | URL de conexão com o banco de dados PostgreSQL real de produção. | Aplicação falha ao iniciar; indisponibilidade total. |
| `PRODUCTION_REDIS_URL` | URL do Redis em produção. | Rate Limit e WebSockets (Socket.IO) pararão de funcionar. |
| `GEMINI_API_KEY` | Chave de API do Google Gemini para o AI Provider. | Falha na orquestração de diálogos inteligentes. |
| `JWT_SECRET` | Chave simétrica longa e aleatória para assinar os tokens JWT. | Vulnerabilidade severa / Impossibilidade de login. |
| `REFRESH_TOKEN_SECRET` | Chave usada para a expiração longa (refresh) de sessão. | Perda de sessão. |
| `PRODUCTION_ALLOWED_ORIGINS`| Origens separadas por vírgula para CORS (ex: `https://app.birthvoices.com`). | Acesso negado pela política CORS para os clientes. |

## 2. Variáveis de Ambiente Locais (.env)
Use o `.env.example` como base para o desenvolvimento local.

| Variável | Uso |
|----------|-----|
| `NODE_ENV` | `development` localmente, `production` injetada pelo Cloud Run. |
| `PORT` | Porta do servidor HTTP. (Ex: `3000`). |

> **Aviso de Segurança**: Rotacione a `JWT_SECRET` e as senhas do Banco de Dados periodicamente.
