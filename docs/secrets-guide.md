# Guia de Secrets e Variáveis de Produção

Este documento é a referência operacional para configurar o **Birth Voices Hub** sem versionar credenciais. Valores reais pertencem ao GitHub Actions / ambiente `production` e ao provedor de cloud, nunca a commits, exemplos, logs, screenshots ou scripts de teste.

## Regra de segurança antes do primeiro go-live

Um segredo de integração foi versionado anteriormente no histórico Git. A árvore atual não contém esse valor, mas remover o arquivo do `HEAD` **não revoga um segredo já exposto no histórico**.

Antes do primeiro uso real:

1. rotacione qualquer credencial que tenha aparecido em commit, log ou artefato público;
2. atualize o valor novo apenas em **Settings → Secrets and variables → Actions → environment `production`**;
3. invalide o valor antigo no sistema de origem;
4. nunca reutilize o valor exposto como `ATLASGR_WEBHOOK_SECRET`, `BLAND_WEBHOOK_TOKEN` ou outro segredo.

Não reescreva o histórico compartilhado automaticamente sem coordenar com todos os clones e branches. Rotação é o controle obrigatório; limpeza de histórico é uma ação separada.

## Secrets obrigatórios para o núcleo de produção

O workflow `.github/workflows/deploy.yml` falha antes do build/deploy se qualquer item abaixo estiver ausente.

| Secret | Uso |
|---|---|
| `GCP_PROJECT_ID` | Projeto Google Cloud que hospeda Artifact Registry e Cloud Run. |
| `GCP_SA_KEY` **ou** `GCP_CREDENTIALS` | Credencial da Service Account usada pelo GitHub Actions. |
| `PRODUCTION_DATABASE_URL` | PostgreSQL de produção; usado também pelo `prisma migrate deploy` antes da promoção. |
| `PRODUCTION_REDIS_URL` | Redis/BullMQ para rate limit, filas e idempotência distribuída. |
| `JWT_SECRET` | Assinatura dos access tokens. Use valor longo, aleatório e exclusivo. |
| `REFRESH_TOKEN_SECRET` | Assinatura dos refresh tokens. Deve ser diferente do `JWT_SECRET`. |
| `GEMINI_API_KEY` | Fallback obrigatório do gateway LLM. |
| `TWILIO_ACCOUNT_SID` | Conta Twilio usada pela telefonia. |
| `TWILIO_AUTH_TOKEN` | Validação criptográfica de webhooks Twilio. |
| `TWILIO_FROM_NUMBER` | Caller ID autorizado para chamadas de saída. |
| `WEBHOOK_SIGNING_SECRET` | HMAC-SHA256 dos webhooks emitidos pelo Birth Voices Hub. |

## Variables obrigatórias do environment `production`

| Variable | Uso |
|---|---|
| `PUBLIC_BASE_URL` | Origem HTTPS pública exata usada para validar assinatura Twilio e montar callbacks. |
| `ALLOWED_ORIGINS` | Lista CORS/Socket.IO separada por vírgulas. Não use localhost em produção. |

O nome correto consumido pelo deploy é `ALLOWED_ORIGINS`, não `PRODUCTION_ALLOWED_ORIGINS`.

## Provedores LLM opcionais e modelos configuráveis

OpenAI e Anthropic são opcionais. Se suas chaves não existirem, o gateway continua com Gemini como fallback. Os modelos podem ser alterados por variables sem release de código.

| Tipo | Nome |
|---|---|
| Secret | `OPENAI_API_KEY` |
| Secret | `ANTHROPIC_API_KEY` |
| Variable | `GEMINI_MODEL` |
| Variable | `OPENAI_MODEL` |
| Variable | `ANTHROPIC_MODEL` |

Mudança de modelo deve ser validada em staging/CI funcional antes de produção. Não use um identificador inventado apenas para silenciar erro de provider.

## AtlasGR / Bland AI: bloco opcional, porém atômico

O núcleo Twilio pode operar sem esta integração. Porém, se **qualquer** configuração AtlasGR/Bland for cadastrada, o preflight do deploy exige o bloco completo para evitar uma integração parcialmente ativa.

### Secrets

| Secret | Uso |
|---|---|
| `BLAND_API_KEY` | Disparo da chamada no provedor Bland AI. |
| `BLAND_WEBHOOK_TOKEN` | Token da URL de callback Bland → Birth Voices. |
| `ATLASGR_WEBHOOK_SECRET` | Segredo compartilhado AtlasGR ↔ Birth Voices. Não existe valor default no código. |

### Variables

| Variable | Uso |
|---|---|
| `ATLASGR_TENANT_ID` | Tenant Birth Voices dono da integração. O consentimento de IA é verificado neste tenant antes de enviar dados do lead à Bland. |
| `ATLASGR_BASE_URL` | Origem HTTPS do CRM AtlasGR que recebe o resultado da chamada. Não há fallback para localhost. |
| `BLAND_RECORD_CALLS` | `false` por padrão. Só use `true` depois de validar base legal, aviso/consentimento e retenção de gravações. |
| `ATLASGR_WEBHOOK_IDEMPOTENCY_TTL_SECONDS` | Janela de deduplicação. Padrão do código: 86400 segundos. |

`WEBHOOK_BASE_URL` é injetada no Cloud Run a partir da própria `PUBLIC_BASE_URL`.

## Configurações opcionais adicionais

| Tipo | Nome | Uso |
|---|---|---|
| Variable | `DEFAULT_AGENT_ID` | Fallback de roteamento para número Twilio sem `Agent.phoneNumber` associado. |
| Variable | `WEBHOOK_URL` | Destino padrão para eventos sem callback por chamada. |
| Variable | `OIDC_ISSUER` | Emissor OIDC corporativo. |
| Variable | `OIDC_CLIENT_ID` | Client ID OIDC. |
| Secret | `OIDC_CLIENT_SECRET` | Client secret OIDC, quando aplicável. |
| Variable | `OTEL_SERVICE_NAME` | Nome do serviço OpenTelemetry. |
| Variable | `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector OTLP. |

## Checklist de configuração

- [ ] Criar/selecionar o environment GitHub `production`.
- [ ] Cadastrar todos os secrets obrigatórios do núcleo.
- [ ] Cadastrar `PUBLIC_BASE_URL` e `ALLOWED_ORIGINS` com URLs HTTPS reais.
- [ ] Confirmar que o `TWILIO_FROM_NUMBER` pertence à conta ou é caller ID verificado.
- [ ] Configurar no console Twilio os webhooks usando a mesma `PUBLIC_BASE_URL`.
- [ ] Registrar consentimento de IA para cada tenant que usará provedores externos.
- [ ] Se AtlasGR/Bland estiver habilitado, preencher o bloco completo e manter gravação desligada até aprovação específica.
- [ ] Rotacionar qualquer segredo que já tenha aparecido no histórico Git.
- [ ] Executar o deploy somente a partir de commit cujo workflow **CI/CD Pipeline** concluiu com sucesso.
- [ ] Confirmar `prisma migrate deploy` antes da promoção da imagem no Cloud Run.

## Desenvolvimento local

Copie `.env.example` para `.env` apenas localmente e substitua valores conforme necessário. `.env` real não deve ser commitado. Serviços locais podem usar PostgreSQL/Redis/MinIO/ClamAV em localhost; produção não deve herdar esses fallbacks.
