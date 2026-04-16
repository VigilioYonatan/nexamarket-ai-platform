# NexaMarket AI — Superskill senior para Vigilio

Paquete de **instrucciones de ingeniería** completo para construir un marketplace único multi-vendedor estilo Mercado Libre, **no** un Shopify, con identidad visual central configurable, Mercado Pago como única pasarela, social login/OTP, carrito, seller/admin, IA local y producción self-hosted.

## Cómo instalar

Extraer el ZIP dentro del catálogo de skills del agente, por ejemplo:

```text
.opencode/skills/nexamarket-marketplace-senior/SKILL.md
.opencode/skills/nexamarket-marketplace-senior/references/...
.opencode/skills/nexamarket-marketplace-senior/examples/...
```

El usuario debe conservar `vigilio-docs` en el repositorio/ruta del consumidor (p.ej. `.vigilio-docs/`) y las skills de Vigilio instaladas. **Este ZIP NO incluye ni modifica el corpus Vigilio**: `references/source-map.md` apunta a los documentos originales de los ZIP aportados. El wrapper puede adaptarse al host de agente utilizado.

## Cómo invocar

"Activa `nexamarket-marketplace-senior` y `vigilio-auto-senior`. Implementa `<caso de uso>` siguiendo el contrato de capas, seguridad, tests y evidencia. Lee las referencias pertinentes y el código existente antes de editar." 

## Contenido

- `SKILL.md`: frontmatter de enrutamiento, invariantes y workflow.
- `references/`: especificación de producto, matrices UX/API/DB, identidad, Mercado Pago, IA, seguridad, testing, CI/CD, operación y roadmap.
- `examples/`: escenarios Gherkin no ejecutables hasta conectarlos con steps y fixtures del consumidor; no son tests ya aprobados.
- `templates/`: estructura de caso de uso, decisiones, inventario de endpoints y política AGENTS sugerida.
- `agents/openai.yaml`: metadatos de descubrimiento, no agente autónomo desplegado.
- `scripts/validate_package.py`: validaciones **estáticas del paquete**, no de la aplicación.

## Alcance y verdad

Blueprint v0.1.0, **NO implementación**. Se considera arquitectónicamente viable sujeto a decisiones regulatorias, soporte comercial de Mercado Pago y pruebas de integración reales. Para pasar a producción hay que construir el sistema, obtener credenciales/licencias aprobadas, ejecutar gates y pruebas de restauración.
