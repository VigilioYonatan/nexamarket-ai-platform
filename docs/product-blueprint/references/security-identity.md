# Identity & Security — login, registro, Facebook, Google, MFA, OTP

## Principio

**Keycloak self-hosted** es el proveedor de identidad; NestJS/BFF verifica tokens/sesiones y mantiene profile/commercial roles. Keycloak gestiona credenciales, social federation y flows soportados; NexaMarket no almacena contraseñas, OTP secrets ni refresh tokens a mano. La UI visual puede ser 100% de marca mediante theme integrado al flujo de Keycloak, no mediante formularios JS inseguros que evadan protocolos.

## Flujos de autenticación

1. **Registro email/password**: CSRF/state del flujo, validación, password policy, verificación email, rate limit, anti-enumeration, profile mínimo, consentimiento/versiones legales.
2. **Login email/password**: flow Keycloak, detectar brute force, sesiones, logout real, errores seguros.
3. **Google**: identity broker OIDC autorizado; PKCE/state/nonce apropiado, URI exacta, secretos en servidor, claims verificados y vínculo de cuenta seguro.
4. **Facebook**: identity broker y permisos mínimos; verificar app de producción, privacidad, redirect y requisitos actuales del proveedor. No asumir que email verificado siempre existe.
5. **OTP/TOTP**: enrolment con prueba de posesión, rotación/revocación, recovery codes si flujo soportado, verificación con intentos limitados; SMS/email OTP son canales opcionales y no equivalentes a MFA phishing-resistant.
6. **Passkeys/WebAuthn**: oferta gradual con soporte Keycloak/verificación por navegador y recuperación de dispositivos; no obligatoria en MVP.
7. **Recuperación/cambio de credenciales**: tokens de un uso, expiración, no filtración de existencia, revocación de sesiones tras evento sensible.
8. **Sesiones**: cookies `HttpOnly+Secure+SameSite` configuradas tras decisión CSRF, expiración absoluta/inactividad, rotación y revocación; logout inicia cierre en servidor/IdP, no solo borrar store.
9. **Paso comprador→seller**: misma identidad `user_id`, nuevos roles solo tras workflow KYB/MP y política; nunca enviar role=seller desde frontend como autorización.
10. **Admins**: MFA obligatorio, sesión más corta, acceso mínimo y registro de cambios; reautenticación step-up para dinero, seguridad y cuentas.

## BFF y protocolo

Recomendado: Authorization Code OIDC con BFF confidencial; BFF recibe callback y crea sesión con cookie segura. Navegador **no** almacena access/refresh token en localStorage/sessionStorage; API no confía en headers de rol arbitrarios. Usar PKCE donde proceda, validar JWKS, `iss`, `aud`, `exp`, `nbf`, `azp` y token type conforme configuración. Protección CSRF documentada para cookie-authenticated mutating requests.

No mezclar tokens de **Google**, **Facebook**, **Keycloak** y **Mercado Pago**: son dominios de confianza distintos. OAuth de Mercado Pago sirve para **delegación del vendedor**, no para login de comprador.

## Autorización de negocio (backend)

- RBAC macro (`buyer|seller|support|moderator|finance|brand_manager|security_admin|super_admin`) + ABAC/ownership object-level (`resource.seller_id`, `order.buyer_id`, estado workflow, region, purpose, amount).
- Identidad y claims obtenidos de sesión verificada; acceso a `SellerOrder` exige vinculación seller↔listing↔order; evitar BOLA/IDOR por id conocido.
- Policies deben fallar **closed** si faltan claims, role mapping o dependencia de identidad. UX oculta acción solo como ayuda; la API protege de verdad.
- Admin con privilegio sensible usa auditoría append-only; separación de funciones y dos aprobaciones para límites económicos relevantes.

## Login/register visual y configuración

- Páginas propuestas: login, signup, confirm-email, forgot/reset password, verify/mfa, account-security, sessions.
- Theme global Keycloak versionado desde Admin Settings: logo, tipografía, paleta, fondo, textos. Variables permitidas; nunca scripts ni HTML inyectable.
- Google/Facebook botones accesibles y claros, errores de callback y cancelación, fallback email.
- Configuración de proveedores solo mediante secret manager y config server; mostrar estados `configured|disabled|error`, nunca secreto en navegador.

## Controles anti-abuso

Rate limiting por IP/identidad sin negar servicio masivo, lockouts, verificación de email, detección de credential stuffing, auditoría de sesiones (PII redacted), cookies seguras, Content Security Policy, seguridad de redirect URLs y SameSite, rotación de secretos, protect all nonpublic by default. Pruebas de bypass, `alg=none`, JWKS malicioso, token de otro audience, replay, session fixation, CSRF, provider-confusion, auth code injection y cross-seller.

## Registro de eventos

`UserRegistered`, `EmailVerified`, `IdentityLinked`, `MfaEnrolled`, `MfaChallengeFailed`, `SessionRevoked`, `SellerApproved` (minimizar PII); registrar IDs internos con retención y acceso acotados.

## Matriz de tests

Email válido/inválido, verificación, duplicado sin enumeración, Google y Facebook callbacks éxito/denegado/expirado, OTP válido/expirado/intentos agotados, MFA step-up, logout/revocation, cross-user/profile, seller vs admin, cookies CSRF, no tokens en logs, sesión caducada en varias pestañas y acceso por deep link.
