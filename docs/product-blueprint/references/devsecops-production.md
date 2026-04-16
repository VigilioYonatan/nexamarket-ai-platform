# DevSecOps y entrega end-to-end — infraestructura self-hosted

## Objetivo

Despliegue repetible de código auditado por artefacto inmutable; no administrar servicios de nube comercial. Reutilizar `platform-compose-vps-delivery`, `platform-cicd-factory`, `software-supply-chain-security`, `platform-environment-promotion`, `platform-data-reliability`, `platform-observability-sre`, `platform-validation-evidence` y `platform-resilience-disaster-recovery`. Si las instrucciones Vigilio prescriben opciones cloud, **seleccionar solo el perfil Compose/on-prem**, sin heredar rutas no aplicables.

## Entornos

- `dev-local`: servicios Compose, DB fixture, Keycloak test, mail sink, mock MP, modelos pequeños IA opt-in.
- `test/CI`: entorno efímero con PG real, Keycloak, Valkey, web SSR, stubs y emuladores acotados; cobertura/BDD/E2E reproduibles.
- `staging`: topología cercana a producción, host/volúmenes aislados, credentials MP sandbox, migraciones reales, pruebas de humo y carga.
- `production`: Caddy HTTPS, API/workers/Keycloak/PG/Valkey/object storage en redes privadas; DB sin puertos públicos; backups fuera del dominio de fallo, monitoreo y respuesta a incidentes.

## Compose nivel 1 Vigilio

- Un único `compose/compose.yaml` parametrizado para staging/prod/prod-local; `compose config --quiet` para cada ambiente.
- Rootless cuando sea viable; contenedores non-root, FS read-only, `cap_drop: [ALL]`, `no-new-privileges`, tmpfs si procede, healthchecks útiles; networks `edge`,`backend`,`observability`; solo 80/443 publicados.
- Backend imagen OCI immutability `@sha256:<digest>`, API y worker del **mismo digest** con entrypoints distintos; migration one-shot separada del arranque (no concurrent DDL).
- Caddy TLS, cabeceras CSP/HSTS apropiadas, reverse proxy y límites. Firewall host, ssh restrict, fail2ban u alternativa cuando justificado, actualizaciones de SO, NTP.
- Storage S3-compatible **self-hosted** (SeaweedFS u otro open source validado en licencia), no dependencia de proveedor cloud. Backups independientes con cifrado y restore test.

## CI pipeline fail-closed

```text
PR → OpenSpec/diff-impact check
  → formatting/lint/typecheck/secret scan
  → Unit + PostgreSQL integration + BDD + OpenAPI diff
  → API + Browser E2E + a11y + visual review
  → SAST/SCA/licensing/IaC/container/DAST proporcional
  → Build OCI rootless non-root locked deps
  → Syft SBOM + Trivy CVE/OpenVEX policy
  → Cosign firma y attestation + provenance
  → staging (MISMO digest) + migration preflight
  → sandbox MP release suite + smoke + SLO baseline
  → approval/segregación tareas riesgosas
  → producción vía promoción digest verificado
  → health/synthetic monitoring, rollback seguro
```

- `platform-actions` reusable y actions externas fijadas a **SHA completo**, `permissions: contents: read` by default, OIDC efímero solo job necesario, `persist-credentials: false`. Nunca `continue-on-error` ni `|| true` en gates de seguridad.
- Firma Cosign: verificar identidad del firmante, workflow esperado y digest **en el host antes del pull/deploy**. SBOM y CVE scan necesitan policy/timebound exceptions con owner y expiry; no false-positives ignorados arbitrariamente.
- Dependencias con lockfile, reproducibility, license/SCA, scanner de secrets, revisión dependencias; runners aislados con mínimo permiso y no exponer claves prod a PR.
- `openapi diff` contra versión publicada; migrations expand-contract con backups y plan reversible; no confiar en rollback de imagen si schema destruido.
- No usar deploy action cloud de forma implícita; SSH restringido o agente on-prem/GitOps local con aprobación y audit.

## Diseño de entornos y secretos

- OpenBao u otro gestor de secretos auditable self-hosted si la madurez lo permite; usar encrypted env/injection segura en MVP, sin secretos en Git, logs, imágenes, browser o artifact de CI.
- Secrets separados: Keycloak/OIDC, MP app secret y OAuth sellers, webhook secret, DB, object storage, SMTP, IA tokens internos. Rotación, periodos, scopes y owner.
- `client_id/public key` no son secretos equivalentes a access tokens; seguir MP específico.
- TLS interno/mTLS según threat model; bases de datos y servicios internos sin exposición directa.

## Operación monetaria y delivery

1. Freeze de cambios financieros peligrosos durante deploy; preflight DB/migraciones, PSP integration health, Keycloak readiness.
2. Verificar imágenes/digests, migrar one-shot, desplegar canary si topología permite o rolling seguro, ejecutar smoke.
3. Confirmar que workers de webhooks/inbox pueden deduplicar eventos durante rollback/upgrade; maintain compatibility.
4. Habilitar `feature flag` para checkout/AI si se necesita kill switch; rollback **no** borra payments ya procesados.
5. Monitorear aprobaciones, reconciliación, colas, reservas expiradas y seller OAuth errors.

## Backups/DR

- PostgreSQL: pgBackRest base + WAL archive, PITR, backup en host/site independiente, cifrado, retención, control de acceso; restauración automatizada **en ambiente aislado** y simulacro periódico.
- Media/objetos: backup/versioning según herramienta local, hash/verificación, catalogación, prueba restore.
- Keycloak: realm/config export verificado + base de datos respaldada de forma consistente y claves de cifrado seguras.
- Config/Compose/Ansible/Git + settings history, secretos resguardados de forma separada.
- RPO/RTO definidos por negocio y medidos en GameDay; no afirmar RPO=0 o HA por 1 host. Desastres incluyen ransomware, disco, humano y pérdida de sitio.

## Perf/capacidad

- Benchmark PostgreSQL, locks/queries y p95; evaluar PgBouncer antes de migrar a cluster.
- k6 checkout/search con límites sandbox; IA GPU servida en pool/host separado con quotas.
- Escalar horizontalmente API/SSR/worker con statelessness, cuidar sesiones BFF y event affinity; ampliación a on-prem Kubernetes solo por ADR con mediciones.

## Producción: checklist de salida

- [ ] Dominio/DNS/certificados activos; backup/restore; monitor/alert/incident owner.
- [ ] Hardening host+container+network; MP credenciales productivas aprobadas y split viable.
- [ ] Keycloak realm/clients/providers/MFA/themes y failover recuperables.
- [ ] Datos de prueba removidos; migrations/verificación SQL; secretos aislados.
- [ ] SAST/SCA/SBOM/Cosign/attestation verificadas por host.
- [ ] Contracts+BDD+E2E+authZ+money/stock+AI evals relevantes `PASS` con logs.
- [ ] Observabilidad, conciliación, ledger e idempotencia; playbooks incidentes.
- [ ] Legal/compliance/finanzas/soporte/KYB/privacidad aprobados por responsables.
- [ ] Go/no-go formal y rollback probado.

## NO fingir

Esta descripción no contiene workflow productivo completo, Compose operativo ni firmas reales; son contratos a implementar en `<product>-deploy` y plataforma. Todos los gates operativos son `NOT_RUN` hasta ejecución auditada.
