# PoC: 3CX → SIP → LiveKit → agente de voz

Pacote **isolado**. Não é importado pelo `server.ts` e não afeta a aplicação principal — dá para
apagar a pasta inteira sem consequência.

## O que esta PoC responde

Uma pergunta só, que nenhum design resolve no papel:

> O áudio sobrevive ao trajeto telefone → 3CX → trunk SIP → LiveKit → agente e volta, e quantos
> milissegundos isso custa?

Não é o SDR. Não tem CRM, não tem RAG, não tem prompt de vendas. Enquanto a latência não estiver
medida, crescer este arquivo é construir em cima de uma suposição.

**Critério de sucesso:** primeira fala do agente em menos de ~1,5 s depois do atendimento. Acima
disso, quem atendeu ouve silêncio e desliga — o que inviabiliza prospecção fria, independente de
quão boa a IA seja.

## Estado: nunca foi executado

Escrito contra a API publicada do `@livekit/agents` 1.6.1, mas **não rodou nenhuma vez** — não há
credenciais LiveKit nem acesso ao 3CX neste ambiente. Antes de tirar conclusão de qualquer erro,
confirme contra a versão realmente instalada:

- os nomes dos plugins seguem `@livekit/agents-plugin-*` (não `@livekit/plugins-*`, que aparece em
  alguns exemplos da documentação e **não existe** no npm);
- `openai.STT()`, `openai.LLM()` e `elevenlabs.TTS()` precisam ter a assinatura conferida — a
  escolha desses três é só para não introduzir fornecedor novo (a app principal já tem as chaves).
  Se a latência ficar alta, trocar o STT por Deepgram é o ganho mais comum.

## Pré-requisito que pode matar a arquitetura

Antes de qualquer coisa, confirme que a licença/edição do 3CX de vocês **permite trunk SIP para
destino customizado**. O 3CX restringe provedores SIP arbitrários; o contorno usual é configurar o
trunk usando o template de um provedor aprovado e apontar o endereço para o seu endpoint. Se isso
não for possível, o caminho SIP não existe e a decisão de arquitetura precisa ser revista.

## Configuração

### 1. LiveKit — trunk de entrada

O trunk aceita o INVITE vindo do 3CX. `inbound_addresses` é o que impede que qualquer um na
internet despeje chamada no seu agente — preencha com o IP público do PBX.

```json
{
  "trunk": {
    "name": "3cx-inbound",
    "inbound_addresses": ["<IP_PUBLICO_DO_3CX>"],
    "inbound_numbers": [],
    "inbound_username": "<usuario>",
    "inbound_password": "<senha>"
  }
}
```

### 2. LiveKit — regra de despacho

Manda a chamada para uma sala. `individual` cria uma sala por chamada, que é o que se quer aqui —
`direct` jogaria todas as ligações na mesma sala.

```json
{
  "dispatch_rule": {
    "rule": { "dispatchRuleIndividual": { "roomPrefix": "poc-3cx-" } }
  }
}
```

Aplique os dois com o CLI do LiveKit (`lk`). O nome exato do subcomando mudou entre versões do
CLI — rode `lk sip --help` e confira contra a documentação em vez de copiar comando de blog.

### 3. 3CX — trunk de saída para o LiveKit

- Crie o trunk SIP apontando para o endereço SIP do LiveKit (porta 5060).
- Crie uma **regra de saída** roteando um ramal de teste (ex.: `5555`) por esse trunk.
- Libere o IP do LiveKit no controle de acesso do 3CX, e o IP do 3CX no `inbound_addresses` acima.
- Anote os **codecs** habilitados (G.711 ulaw/alaw vs Opus): transcode no meio do caminho é fonte
  silenciosa de latência.

### 4. Rodar

```bash
npm install --workspace @birth-voices/sip-agent
```

Crie `packages/sip-agent/.env.local` a partir do `.env.example` e então:

```bash
npm run dev --workspace @birth-voices/sip-agent
```

Com o worker de pé, disque o ramal de teste (`5555`) de um telefone do 3CX. O agente deve atender,
cumprimentar em português e repetir a frase que você falar.

## O que medir

O agente emite uma linha JSON `poc.first_audio` com `msFromEntryToFirstReply`. Isso é só a parte do
LiveKit. O número que importa de verdade é o **percebido**: cronometre do "atendeu" até ouvir a
primeira palavra. A diferença entre os dois é o custo do 3CX + trunk, e é exatamente o que esta PoC
existe para descobrir.

Meça com o 3CX no meio **e** discando direto para o LiveKit, sem o PBX. Se a diferença for grande,
o problema é o trajeto, não a IA.

## Depois que passar

Aí sim vale conectar o que já existe na app principal: `LLMGateway`, RAG, guardrails, e o
`SipTelephonyProvider` implementando `placeCall` (a interface `TelephonyProvider` em
`src/services/telephonyProvider.ts` já está pronta esperando essa implementação) para a discagem
ativa. O contrato com o Prospector — `POST /api/voice/outbound` e o webhook `agent.call.ended` —
não muda.
