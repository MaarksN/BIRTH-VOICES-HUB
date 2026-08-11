- De: Agente 02 (Produto, Navegação e UX)
- Para: Agente 09 (SDK, Contratos e Documentação de API)
- Onda: 2
- Status: aberto
- Prioridade: normal

## Problema
`pages/Dashboard/Developers.tsx` (via `hooks/useDeveloperSettings.ts`) apresenta uma tela de
"API Keys" e "Webhooks" totalmente client-side: chaves "criadas" só existem em `useState` local
(nunca enviadas a um backend), e a lista inicial vinha pré-carregada com duas chaves de exemplo
com formato idêntico a segredos reais (`pk_live_8g72hjksdfh839fj78hjs923xyz`,
`pk_test_1ab23cd45ef67gh89ij0klmnopqrst`), rotuladas "Production Key LIVE". A seção de
Webhooks mostrava um endpoint de exemplo fixo (`https://api.myapp.com/webhooks/voice`) com
status "200 OK" e "Última entrega: 2 min atrás" sempre fabricados, e o botão "Adicionar
Endpoint" não tinha nenhum handler.

`prisma/schema.prisma` já tem um model `APIKey` (comentado como "sem referências em src/ ou
lib/ hoje" — ver comentário perto da linha 211-222), mas nenhuma rota/controller/service o usa.

## Correção já aplicada nesta onda (mitigação, não solução definitiva)
- Removidas as duas chaves de exemplo com formato de segredo real (`INITIAL_KEYS` agora começa
  vazio em `hooks/useDeveloperSettings.ts`).
- Página rotulada explicitamente como "Pré-visualização de layout" com aviso de que nada aqui é
  reconhecido por uma API real.
- Botão "Adicionar Endpoint" desabilitado com tooltip explicando a limitação, em vez de um
  clique que não fazia nada.
- Webhook de exemplo fixo trocado por um estado vazio real + um botão "Simular envio de teste"
  (mantém a funcionalidade de teste local existente, mas sem fingir que há um endpoint real
  cadastrado).

## Arquivo(s) envolvido(s)
- `pages/Dashboard/Developers.tsx`, `hooks/useDeveloperSettings.ts` (meus, já mitigados)
- `prisma/schema.prisma` (model `APIKey` já existe, dono: Agente 01)
- Precisaria de: rotas/controller/service para emitir, listar, revogar API keys reais, e um
  model + rotas para webhooks configurados pelo tenant — fora do meu escopo de arquivos.

## Alteração necessária
Implementar o backend real de API keys (usando o model `APIKey` já existente) e de webhooks
configuráveis, então trocar `useDeveloperSettings.ts` de estado local para chamadas reais a
`/api/developers/keys` (ou nome equivalente) — devolvo a tela para consumir dado real assim que
existir.

## Teste esperado
Uma chave criada na UI deve funcionar de fato como Bearer token em uma chamada autenticada; uma
chave revogada deve parar de autenticar imediatamente.

## Contexto adicional
Nenhuma chave real foi exposta — as duas chaves de exemplo removidas eram valores fixos gerados
para preencher a UI, nunca associados a nenhum sistema de autenticação real (confirmado: nenhum
middleware de auth lê `APIKey`).
