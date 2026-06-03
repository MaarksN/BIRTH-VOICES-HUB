# Auditoria de dependencias

STATUS: PASS_WITH_WARNINGS

Comandos:

- `npm ci`
- `npm audit --audit-level=low`

Resultado:

- 258 pacotes instalados.
- 259 pacotes auditados.
- 0 vulnerabilidades conhecidas pelo npm audit.

Warnings:

- `node-domexception@1.0.0` deprecated.
- `npm` 11 indicou scripts de instalacao ainda nao revisados/permitidos para:
  - `@google/genai@2.7.0`
  - `esbuild@0.28.0`
  - `protobufjs@7.6.2`
  - `esbuild@0.25.12`

Riscos:

- Sem SBOM.
- Sem politica de licencas.
- Sem Dependabot/Renovate/CI audit.
- Sem lockfile policy documentada.

Decisao: PASS para vulnerabilidades conhecidas no momento da auditoria; warnings devem entrar no backlog.

