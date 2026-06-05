# Billing e Metering

## Decisão

Billing não entra na versão de produção atual.

## Evidência

- Não há provedor financeiro configurado.
- Não há contratos de plano, preço, impostos, nota fiscal ou chargeback aprovados.
- A tela de Billing não exibe valores fictícios nem promete cobrança ativa.

## Escopo removido da produção

Até a escolha formal de Stripe, Mercado Pago ou equivalente, a aplicação trata Billing como fora de escopo. A UI informa que nenhum provedor está conectado.

## Critérios para retomar

- Provedor escolhido.
- Webhooks assinados com idempotência.
- Entidades `plan`, `subscription`, `invoice`, `usage_event` e `billing_event`.
- Medição de sessões, chamadas, minutos, Gemini e webhooks.
- Limites por plano testados.
