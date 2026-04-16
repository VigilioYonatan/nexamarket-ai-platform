# Branding y Settings globales (NO white-label por seller)

## Ownership del diseño

El **Admin de plataforma** edita un único tema global versionado (`global_theme`) que consumen storefront, Seller Center, Admin Center (con excepciones operativas de accesibilidad) y branding Keycloak. El seller **NO** edita colores, CSS ni layout de la tienda. Perfil seller limitado a imágenes, descripción y datos comerciales.

## Catálogo de configuración

| Grupo | Campos / alcance | Gate |
|---|---|---|
| General | nombre, lema, contacto, red social, política | moderación de URLs e historial |
| Identidad | logo light/dark, favicon, imagen OG, assets brand | MIME real, SVG saneado, límites, accesibilidad |
| Colores | primitivos/semánticos `surface,text,action,border,focus,status` | contraste y modos |
| Tipografía | familia fuente allowlist, peso, escala, interlineado | licencia y cargas locales |
| Componentes | radius, outline, shadow, density, buttons, cards | visual regression |
| Modo | light, dark, auto, alto contraste | WCAG, prefers-color-scheme |
| Header | logo, navegación, categories, search box, icons | responsive/a11y |
| Home | banners, orden bloques permitidos, campañas | componente allowlist, SEO |
| PDP/listados | card template permitido, badges y bloques | no ocultar información legal/precio |
| Checkout | logo, textos y espaciado alrededor de campos MP | no modificar campos seguros del PSP |
| Login/registro | colores, logo, copy, imágenes, tipografía | adaptador Theme Keycloak versionado |
| Footer/SEO | textos, enlaces, schema, sitemaps | URL allowlist, privacidad |
| Mensajes | plantilla email con escapes, notificaciones | preview, plantillas auditadas |
| Operación | auth providers, MFA, fees, feature flags | roles especializados, no editor visual |

## Modelo de datos mínimo

`settings_definitions` (clave, tipo, validación, sensibilidad, propietario), `settings_versions` (id, scope=GLOBAL, version, estado DRAFT/PUBLISHED/ARCHIVED, payload JSONB, author/approver, created_at), `asset_records` (hash, type, size, storage location, malware status), `settings_audit` (actor, before/after *redactado*, reason, request_id), `feature_flags` (key, rules, enabled, owner, rollback). Una única versión publicada por entorno, restricción en DB.

### JSON ilustrativo (NO schema final)

```json
{
  "schema_version": 1,
  "scope": "GLOBAL",
  "version": 12,
  "status": "DRAFT",
  "branding": {
    "name": "NexaMarket",
    "logo_light_asset_id": "asset-1001",
    "logo_dark_asset_id": "asset-1002"
  },
  "tokens": {
    "light": {"surface.default": "#FFFFFF", "text.primary": "#101827", "action.primary": "#2563EB"},
    "dark": {"surface.default": "#0D1421", "text.primary": "#F8FAFC", "action.primary": "#60A5FA"}
  },
  "typography": {"family": "Inter", "scale": "comfortable"},
  "navigation": {"home_sections": ["hero", "categories", "top_deals"]}
}
```

## Workflow

`EDIT → VALIDATE → DRAFT → PREVIEW aislado → APPROVE según riesgo → PUBLISH atomic/version+cache invalidate → MONITOR → ROLLBACK`.

- Zod/schema admite solo claves registradas: no CSS/JS arbitrario, iframe de terceros ni HTML libre en zonas sensibles.
- Assets cargados fuera del origen de scripts y cabeceras seguras, escáner y sanitización de SVG. Usar URL firmada/indirecta según objeto y privacidad.
- Tokens primitivos→semánticos→componentes→modos. Validar pares contrastantes (AA mínimo 4.5:1 texto normal, 3:1 texto grande), estados focus/error/disabled, overlays y tablas.
- Respeto de preferencias del usuario: `light|dark|system|highContrast` local al usuario, **no** habilita que seller modifique tema global.
- SSR obtiene snapshot de tema antes de renderizar, versiona cachés; evitar FOUC y servir CSS/javascript generado desde datos no sanitizados.
- Publicación puede invalidar caché de página/estáticos, pero **no** requiere recompilar frontend para colores y textos previstos.
- Integración Keycloak Theme: export/build de paquete de tema versionado con tokens aprobados. Determinar si hot-reload de Keycloak está soportado por integración; si requiere redeploy controlado, no prometer cambio inmediato para esa pantalla.
- Settings de autenticación **no** deben poder desactivar MFA de administradores, rotar secretos sin aprobación o habilitar proveedores OAuth no configurados.

## Tests prioritarios

- Accesibilidad de light/dark, teclado y 320px; visual regression login, PDP, carrito, checkout y admin.
- Borrador no afecta producción, una sola versión publicada, rollback correcto y caché sincronizada.
- Cross-role: seller no cambia tema, admin sin permiso tampoco.
- Upload SVG XSS/URL externa, CSS injection, iconos maliciosos, preview con iframe sandbox si aplica.
- Tests de logo inexistente: fallback sin romper auth/checkout.
