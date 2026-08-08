# Diretrizes do Agente - BIRTH-VOICES-HUB

## 1. Contexto do Projeto
- Plataforma omnicanal de agentes de voz para atendimento, vendas e automação de fluxos empresariais.

## 2. Regras de Código & Arquitetura
- Escreva código completo de nível de produção. NUNCA use comentários como `// TODO: implementar` ou omita trechos de código.
- Stack principal: Node.js, Express/Fastify, Prisma ORM, TypeScript, Vitest, Docker.
- NUNCA remova validações de segurança nas rotas de telefonia ou na manipulação de áudio.
- Use TypeScript estrito (zero `any`). Tratamento rigoroso de exceções com blocos `try/catch`.
- Garanta que todos os testes unitários (`vitest`) e e2e (`playwright`) passem antes de alterar rotas.

## 3. Segurança & Privacidade (LGPD)
- Trate dados de contatos e gravações de voz com criptografia, controle de acesso e anonimização rigorosa.
- Nunca persista chaves de API ou segredos diretamente no código (`.env` obrigatório).
