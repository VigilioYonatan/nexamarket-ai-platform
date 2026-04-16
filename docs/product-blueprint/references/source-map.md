# Mapa de origen y precedencia — ZIP reales del usuario

Se revisaron los archivos aportados `skills(6).zip`, `vigilio-docs(5).zip` y el brief NexaMarket. Este documento **no inventa** que toda la documentación se haya convertido en una sola norma. Se seleccionaron fuentes aplicables y se mantuvieron extensiones específicas como propuestas de producto.

## Precedencia

1. Repositorio de aplicación consumidor (código ejecutable, tests, lockfile, contratos reales).
2. Políticas/automatismos verificables de plataforma Vigilio cuando estén instalados.
3. `vigilio-docs/standards/` + `foundations/`, normativa canónica.
4. `vigilio-docs/stacks/` implementaciones específicas y `technology/versions.md` como baseline documental.
5. `skills/<skill>/SKILL.md` y referencias aplicables realmente abiertas.
6. Esta superskill como especificación de producto, **subordinada** a cambios de código/policies reales.

## Skills existentes identificadas como relevantes

`vigilio-auto-senior`, `vigilio-architecture-guide`, `architecture-traceability`, `node-nest-technologies`, `node-nest-build-feature`, `node-nest-persistence`, `node-nest-security`, `node-nest-testing`, `node-nest-async-workers`, `node-nest-realtime`, `web-mfe-technologies`, `web-mfe-build-feature`, `web-mfe-contracts`, `web-mfe-testing`, `web-mfe-quality`, `web-mfe-security-delivery`, `ui-design-system`, `ui-art-direction`, `ux-information-architecture`, `ui-quality-review`, `platform-compose-vps-delivery`, `platform-cicd-factory`, `platform-environment-promotion`, `software-supply-chain-security`, `platform-data-reliability`, `platform-observability-sre`, `platform-resilience-disaster-recovery`, `platform-local-production-lab`, `platform-validation-evidence`, `ai-rag-llmops-finops`, `platform-scalability-capacity`, `platform-repository-workspace`, `openspec-propose`, `openspec-apply-change`, `review-code-change` (si instalado).

## Fuentes canónicas concretas que fundamentan la superskill

### Orquestación/arquitectura

- `skills/vigilio-auto-senior/SKILL.md`
- `skills/vigilio-auto-senior/references/{routing,decisions,evidence-review,preflight}.md`
- `vigilio-docs/README.md`
- `vigilio-docs/OPERATING-MODEL.md`
- `vigilio-docs/standards/ai/skill-orchestration-policy.md`
- `vigilio-docs/standards/engineering/{use-case-traceability,naming-and-boundaries,change-impact-and-review-gates}.md`
- `vigilio-docs/playbooks/{stack-selection-and-solution-design,auto-senior-feature-workflow}.md`

### NestJS / HTTP / DB

- `skills/node-nest-build-feature/SKILL.md`
- `skills/node-nest-build-feature/references/feature-patterns.md`
- `skills/node-nest-testing/references/test-matrix.md`
- `vigilio-docs/stacks/backend/nestjs/{README,golden-path-feature}.md`
- `vigilio-docs/stacks/backend/nestjs/http/{controllers,semantic-dtos-and-pagination}.md`
- `vigilio-docs/stacks/backend/nestjs/persistence/drizzle-postgresql.md`
- `vigilio-docs/standards/api/{rest-endpoint-design,http-dtos-and-contracts,http-errors-and-pagination,openapi-operation-documentation}.md`
- `vigilio-docs/standards/data/{transactions,migrations-and-backups}.md`
- `vigilio-docs/standards/messaging/outbox-idempotency.md`

### Frontend / UX/UI

- `skills/web-mfe-testing/references/test-matrix.md`
- `vigilio-docs/stacks/frontend/web-mfe/{README.md,http/5-bff-http-runtime-auth.md,testing/e2e-playwright.md,ui/16-design-system-ui-tokens.md}`
- `vigilio-docs/standards/experience/{design-tokens-modes-and-theming,components-states-and-contracts,accessibility-inclusive-interactions,ux-quality-gates-and-ci-cd,information-architecture-and-user-flows}.md`

### Seguridad y pruebas

- `vigilio-docs/standards/security/{authorization,authorization-verification-matrix,secrets-and-privacy,tenant-isolation}.md` (seller isolation como autorización de dominio, **no** SaaS multi-store)
- `vigilio-docs/standards/testing/{strategy,contract-and-bdd,e2e-quality-gates,environment-preflight-and-e2e,semantic-ddd-contract-gates}.md`
- `vigilio-docs/threat-model/001-autenticacion-y-sesiones.md`

### Infra, IA, releases

- `skills/platform-compose-vps-delivery/SKILL.md`, `references/canonical-contract.md`
- `skills/platform-cicd-factory/SKILL.md`, `references/canonical-contract.md`
- `skills/software-supply-chain-security/SKILL.md`
- `vigilio-docs/standards/devsecops/{cicd,supply-chain}.md`
- `vigilio-docs/standards/ai/{hybrid-rag-postgresql,model-lifecycle,evaluacion-calidad}.md`
- `vigilio-docs/technology/versions.md`

## Extrapolaciones propias (NO reglas originales Vigilio)

Específicos NexaMarket: modelo merchant/seller, pantallas del marketplace, controllers propuestos, rutas API y enums, integración de Keycloak en UI concreta, sistema de configuración global y themes, modelo de cobros multi-seller 1:1, ledger y logística, elección Astro SSR, colores ilustrativos, KPIs, milestones y tests Gherkin. Requieren validación técnica/legal/comercial antes de construir o lanzar.

## Mercado Pago (investigación pública adicional)

Documentos oficiales para Perú en `references/mercado-pago.md` consultados para 1:1 vs 1:N, OAuth y webhooks. Se debe confirmar el producto/versión vigente y condiciones de la cuenta antes de implementar.

## Nota sobre historial y compatibilidad

Los ejemplos `.compat/` e históricos pueden mencionar stack/cloud de implementaciones anteriores; se prefieren `standards/` canónicos y skill de entrega Compose. Esta superskill no adopta módulos cloud que no correspondan a NexaMarket.
