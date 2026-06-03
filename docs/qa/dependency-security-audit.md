# Auditoria de Seguranca de Dependencias

STATUS: PASS com ressalvas

## Instalacao e audit

Comandos executados com NPM temporario 11.16.0:

- `npm ci`
- `npm audit --audit-level=low`

Resultados:

- 258 pacotes instalados.
- 259 pacotes auditados.
- 0 vulnerabilidades conhecidas pelo npm audit.

## Warnings

`npm ci` emitiu:

- `node-domexception@1.0.0` deprecated.
- `allow-scripts` pendente para `@google/genai`, `esbuild`, `protobufjs`.

Esses avisos nao quebraram instalacao/build, mas devem entrar em governanca de supply chain.

## Lacunas

- Sem Dependabot/Renovate.
- Sem CI executando `npm audit`.
- Sem SBOM.
- Sem pinning estrito em `package.json` (varios `^`).
- Sem revisao formal de scripts de instalacao.

## Decisao

PASS para CVEs conhecidas no momento da auditoria. PARTIAL para supply chain/governanca.
