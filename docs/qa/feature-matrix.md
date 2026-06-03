# Matriz de Funcionalidades Reais

STATUS: PARTIAL

## Matriz

| Funcionalidade | Classificacao | Evidencia | Status |
|---|---|---|---|
| Landing page | REAL | Browser renderizou `/` com hero, navegacao e CTA; sem console errors. | PASS |
| Cadastro | REAL | Browser registrou usuario e recebeu dashboard; API smoke tambem validou cadastro. | PASS |
| Login/logout | REAL | Logout redirecionou para `/#/login`; rota protegida `/#/dashboard` voltou para login. | PASS |
| Protecao de rotas | REAL | `App.tsx:27` redireciona sem token; Browser confirmou. | PASS |
| Criacao/listagem de agente | REAL | Browser salvou `Catarina (Pre-natal)` e dashboard mostrou 1 agente apos refresh. | PASS |
| Playground por texto | REAL | Browser respondeu 4 perguntas por fallback texto, coletou 4 campos e salvou sessao. | PASS |
| Reconhecimento de voz no navegador | PARTIAL | Browser retornou `not-allowed`; fallback texto funcionou. Microfone real nao validado. | BLOCKED |
| Analise Gemini | PARTIAL | Sem `GEMINI_API_KEY`; UI/README declaram fallback deterministico. | BLOCKED |
| Resultados e CSV | REAL | Browser exibiu 1 sessao salva, dados extraidos, filtro e botao CSV. Download CSV nao foi executado. | PARTIAL |
| Analytics | REAL/PARTIAL | Tela calculou metricas a partir de sessoes reais; sem grafico rico quando ha pouco dado. | PASS |
| Webhook CRM/ATS | PARTIAL | Fallback `not_configured` validado por smoke; endpoint externo real nao fornecido. | BLOCKED |
| Historico/retry webhook | PARTIAL | API isola retry por usuario; entrega real externa nao testada. | BLOCKED |
| Telefonia Twilio | PARTIAL | Tela e endpoints existem; sem credenciais e sem callback publico. | BLOCKED |
| Billing/metering | UI ONLY/PARTIAL | `pages/Dashboard/Billing.tsx` declara ausencia de provedor; nao ha backend de cobranca. | FAIL para producao |
| Organizacao/marca | REAL/PARTIAL | UI salva nome/cor da conta autenticada; sem auditoria real de eventos. | PARTIAL |
| Admin operacional | REAL/PARTIAL | Mostra status local, storage, Gemini pendente e contadores reais. | PASS local |

## Fluxo critico validado em navegador

1. Abrir landing.
2. Cadastrar organizacao.
3. Acessar dashboard autenticado.
4. Criar agente e confirmar persistencia apos refresh.
5. Iniciar Playground.
6. Usar fallback por texto por falta de permissao de microfone.
7. Salvar sessao.
8. Ver sessao em Resultados e metricas no Dashboard.
9. Logout e tentativa de rota protegida.

Resultado: PASS local.

## Funcionalidades nao reais para producao

- Billing/metering: sem provedor, sem API, sem webhooks financeiros.
- Twilio: depende de credenciais/public URL ausentes.
- Gemini: depende de chave ausente.
- Smoke staging/producao: sem URLs.
- Auditoria administrativa/LGPD: tela indica eventos nao habilitados.
