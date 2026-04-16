# ADR-003 — Compose self-hosted y dependencias externas inevitables

- Estado: provisional.
- Infraestructura: Caddy TLS + Nest API/worker + Preact + PostgreSQL + Keycloak + SeaweedFS + Valkey + opcional IA local (FastAPI/Ollama) + Prometheus/Grafana/OTel/Tempo.
- Sin dependencias administradas AWS, Azure, GCP ni SaaS de CI. Los servicios de identidad social Google/Facebook, el PSP Mercado Pago, correo/SMS y transportistas siguen siendo **integraciones externas**.
- Nivel inicial: servidor(es) Linux endurecidos con Compose; una instalación en un único host no es HA.
- Red: sólo puertos 80/443 públicos; Grafana sólo loopback 127.0.0.1:3001 por túnel SSH; bases de datos y servicios privados.
- Secrets: `.env` fuera de Git y claves cifradas con age para backups; OpenBao y GitOps sólo por ADR posterior.
- Restricción de verificación: se necesita Docker/Compose real, un DNS y DNS/TLS, claves PSP, Keycloak IdPs, lockfile y entorno de staging para declarar producción apta.
