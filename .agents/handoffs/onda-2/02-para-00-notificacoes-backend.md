- De: Agente 02 (Produto, Navegação e UX)
- Para: Agente 00 (Coordenador) — para atribuir dono definitivo
- Onda: 2
- Status: aberto
- Prioridade: normal

## Problema
`components/Sidebar.tsx` (shell, meu) tem um painel de notificações com 5 itens fixos em
`useState` local, com conteúdo de negócio inventado ("Lead Quente Identificado: Isabela Santos
qualificada...", "Conexão SIP Ativa em 04 canais...", timestamps relativos fixos "Há 5m",
"Ontem"). Não existe nenhum model/rota de notificações no backend — confirmado via busca em
`src/routes/index.ts` e `prisma/schema.prisma`.

## Correção já aplicada nesta onda (mitigação, não solução definitiva)
O cabeçalho do painel agora tem um selo "Exemplo" explícito, deixando claro que o conteúdo é
ilustrativo e não eventos reais do sistema (`AGENTS.md` §14: dado de demonstração precisa estar
rotulado). Não removi o painel inteiro porque (a) construir um sistema de notificações real é
uma feature de backend fora do escopo de Produto/Navegação/UX desta onda, e (b) remover a
funcionalidade de "abrir/fechar/marcar como lida" sem substituto pioraria a experiência sem
necessidade.

## Arquivo(s) envolvido(s)
- `components/Sidebar.tsx` (meu, já mitigado com selo "Exemplo")
- Precisaria de: novo model Prisma de notificação + rotas — fora do meu escopo de arquivos.

## Alteração necessária
Decisão de produto sobre se vale a pena um sistema de notificações real nesta fase, e, se sim,
atribuir a um agente dono (provável candidato: quem tratar Observability/Supervision, já que
boa parte do conteúdo de exemplo é sobre chamadas/telefonia/segurança).

## Teste esperado
Quando existir, o painel deve consumir `/api/notifications` (ou equivalente) real, tenant-
scoped, e o selo "Exemplo" deve ser removido junto com os dados de exemplo.

## Contexto adicional
Não bloqueador. Nenhuma ação destrutiva depende deste painel.
