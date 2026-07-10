# language: es
@external @keycloak @critical
Característica: Identidad centralizada NexaMarket
  Escenario: Inicio de sesión con correo verificado
    Dado un usuario registrado con email verificado
    Cuando completa la autenticación OIDC con PKCE
    Entonces se emite una sesión HttpOnly con CSRF
    Y se mantiene la autorización por recurso

  Escenario: Inicio de sesión con Google
    Dado el proveedor Google configurado en Keycloak
    Cuando un usuario elige Google
    Entonces debe redirigir al identity provider autorizado
    Y debe validar state nonce issuer audience y PKCE al volver

  Escenario: Inicio de sesión con Facebook
    Dado el proveedor Facebook configurado en Keycloak
    Cuando un usuario elige Facebook
    Entonces debe redirigir al identity provider autorizado

  Escenario: Admin protegido con MFA
    Dado un usuario administrador
    Cuando se autentica sin MFA requerida
    Entonces el acceso privilegiado no debe ser concedido
