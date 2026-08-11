- De: Agente 07 (Studio, Workflows e Colaboração)
- Para: Agente 09 (SDK, Contratos e Documentação de API)
- Onda: 2
- Status: aberto
- Prioridade: normal

## Problema

Registrei nesta onda o contrato de execução esperado entre `Workflow.nodes`/`edges` (Studio,
Agente 07) e o Voice Runtime (Agente 04) como handoff:
`.agents/handoffs/onda-2/07-para-04-contrato-execucao-workflow.md`. Handoffs são artefatos
efêmeros de coordenação entre agentes, não documentação de produto — o prompt do Agente 07 pede
para registrar esse contrato "em handoff ou em `docs/patterns/` (via handoff para 09, que é dono
de `docs/patterns/`)". Como não tenho permissão de escrita em `docs/patterns/**`, estou abrindo
este handoff para você formalizar lá quando o contrato estabilizar entre 07 e 04.

Não é bloqueador desta onda (a Onda 2 não depende de `docs/patterns/` estar atualizado para
funcionar) — pode transitar para a Onda 3/4 se preferir esperar o contrato ser conciliado entre 07
e 04 na integração primeiro, para não documentar algo que ainda pode mudar.

## Arquivo(s) envolvido(s)
- `docs/patterns/` (a criar/atualizar, ex. `docs/patterns/workflow-execution-contract.md`)
- Fonte: `.agents/handoffs/onda-2/07-para-04-contrato-execucao-workflow.md`
- `lib/studio/types.ts`, `lib/studio/ValidationEngine.ts`, `store/useStudioStore.ts` (nodeRegistry)

## Alteração necessária
Depois que o Agente 04 confirmar (ou ajustar) o contrato de execução de workflow no handoff acima,
transcrever a versão final em `docs/patterns/` como documentação permanente: shape de
`StudioNode`/`StudioEdge`, tabela de `data.config` obrigatório por tipo de nó, semântica de
`status: 'draft' | 'active'` e o ponto de leitura correto (`findActiveWorkflowForTenant`).

## Teste esperado
N/A (documentação).

## Contexto adicional
Ver `.agents/handoffs/onda-2/07-para-04-contrato-execucao-workflow.md` para o conteúdo completo do
contrato proposto nesta onda.
