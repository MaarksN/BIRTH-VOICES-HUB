- De: Agente 02 (Produto, Navegação e UX)
- Para: Agente 04 (Voice Runtime e Gateway de IA) e Agente 10 (Infraestrutura, Observabilidade e Deploy)
- Onda: 2
- Status: aberto
- Prioridade: normal

## Problema
`pages/Dashboard/Overview.tsx` (meu) tinha um conjunto de 9 KPIs executivos totalmente
fabricados no código-fonte, sem nenhuma chamada de API por trás: "Agentes Ativos: 8/10",
"Chamadas Hoje: 142", "Tempo de Conversa: 04:12", "Tokens Consumidos: 2.4M", "Custo Estimado:
$14.20", "Disponibilidade (SLA): 99.98%", "Satisfação (CSAT): 94.6%", "Latência Média: 340ms",
"Resolução Contatos: 88.2%" — além de dois gráficos Recharts (`usageData`, `latencyData`) com
séries temporais inventadas, quatro badges de status de serviço sempre verdes ("Twilio",
"Gemini 2.5", "Deepgram", "Webhooks", nunca checados de verdade), e uma aba inteira de
"Analytics" com funil de ativação e telemetria de usabilidade (tempo médio de criação de
agente, cliques por sessão, taxa de erro) 100% inventados. Isso viola diretamente
`AGENTS.md` §14: "Nenhuma métrica de chamada, custo de IA ou telemetria de supervisão pode ser
fabricada para preencher a interface".

Investigação confirmou que **não existe pipeline de telemetria de IA/voz** alimentando essas
métricas hoje: `Metric` (Prisma) só recebe um evento (`user_login`) hoje; não há
tokens/custo/latência/CSAT/SLA persistidos em lugar nenhum acessível ao frontend.

## Correção já aplicada nesta onda
`Overview.tsx` foi reescrito para só exibir métricas com fonte real: contagem de agentes e
chamadas (via `GET /api/agents` e `GET /api/call-logs`), chamadas de hoje, duração média
calculada a partir de durações reais, taxa de conclusão real, e status real de banco de
dados/Redis (via `GET /api/ready`). No lugar dos 6 KPIs sem fonte e dos 2 gráficos fabricados,
há um `Alert` explicando que telemetria de IA/voz ainda não está instrumentada. A aba
"Analytics" virou um `EmptyState` honesto em vez do funil/telemetria inventados.

## Arquivo(s) envolvido(s)
- `pages/Dashboard/Overview.tsx` (meu, já corrigido)
- Pipeline de telemetria real (tokens, custo, latência, CSAT, SLA) — domínio de
  `lib/voice-runtime/` (Agente 04) e do stack de Observability/OTel (Agente 10).

## Alteração necessária
Quando o Voice Runtime/Observability publicarem essas métricas de forma real e tenant-scoped
(provavelmente via o mesmo `Metric`/`getSpans`/`getMetrics` corrigido na Onda 1 para vazamento
cross-tenant), me avisem — eu troco o `Alert` de "telemetria ainda não instrumentada" por cards
reais consumindo o endpoint real, com os mesmos estados de loading/erro/vazio já padronizados
nesta onda.

## Teste esperado
Métrica real de custo/tokens/latência/CSAT/SLA aparecendo em `Overview.tsx` só depois de vir de
um endpoint real, nunca hardcoded.

## Contexto adicional
Não bloqueador para esta onda — a tela antes mentia sobre ter esses dados; agora está honesta
sobre a ausência deles.
