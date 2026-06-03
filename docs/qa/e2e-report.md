# Relatorio E2E

STATUS: PARTIAL

Ferramenta: Playwright via pacote do runtime Codex e Chrome instalado localmente.

Ambiente: servidor de producao local em `http://127.0.0.1:3300` com `BIRTH_VOICES_DATA_DIR` temporario.

Passou:

- Rota protegida `/dashboard` redirecionou para login quando sem token.
- Cadastro via UI funcionou.
- Rota `/dashboard/agents/new` abriu e salvou agente no backend.
- Rotas autenticadas renderizaram texto esperado:
  - dashboard
  - agents/new
  - playground
  - results
  - analytics
  - developers
  - organization
  - admin
  - billing
  - telephony
- Nenhum `pageerror` nas passagens de rota.

Bloqueado:

- Fluxo completo do playground via UI, com respostas e salvamento de sessao, ficou bloqueado em Chrome headless antes do input de resposta habilitar.
- Tentativas de stub em `speechSynthesis` nao produziram estado testavel de forma confiavel.

Warnings:

- Tailwind CDN em producao.

Decisao E2E: PARTIAL. Ha cobertura basica de navegacao e renderizacao, mas o fluxo critico de conversa/salvamento precisa de E2E dedicado e deterministico.

