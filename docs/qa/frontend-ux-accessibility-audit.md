# Auditoria frontend, UX e acessibilidade

STATUS: PARTIAL

Rotas autenticadas renderizadas em Chrome headless:

- `/dashboard`
- `/dashboard/agents/new`
- `/dashboard/playground`
- `/dashboard/results`
- `/dashboard/analytics`
- `/dashboard/developers`
- `/dashboard/organization`
- `/dashboard/admin`
- `/dashboard/billing`
- `/dashboard/telephony`

Resultado:

- Todas as rotas acima renderizaram texto esperado em DOM.
- Rota protegida `/dashboard` redirecionou para `/#/login` quando sem token.
- Cadastro via UI funcionou e navegou para dashboard.
- Criacao de agente via UI funcionou.
- Browser nao apresentou `pageerror` nos testes de rotas.
- Console warning: `cdn.tailwindcss.com should not be used in production`.

Lacunas UX/produto:

- Billing e declaradamente sem gateway real.
- Convites de time estao desativados.
- Cards HubSpot/Salesforce/Webhooks/n8n em AgentForm tem botao visual sem acao real.
- Playground completo por UI ficou bloqueado em Chrome headless antes do input de resposta habilitar, por dependencia de APIs de fala do browser. Deve ser coberto por E2E dedicado com stubs robustos ou modo texto testavel.
- Admin nao tem permissao diferenciada.

Acessibilidade:

- Ha uso de labels, botoes e textos claros em varios formularios.
- Ha aria-label no menu mobile.
- Nao foi executado axe/Lighthouse.
- Nao ha testes automatizados de teclado, foco, contraste ou screen reader.

Responsividade:

- Estruturas usam grids e breakpoints Tailwind.
- Validacao visual foi feita apenas em viewport desktop 1366x900.
- Mobile/tablet/zoom/orientacao nao foram validados.

Decisao da fase: PARTIAL.

