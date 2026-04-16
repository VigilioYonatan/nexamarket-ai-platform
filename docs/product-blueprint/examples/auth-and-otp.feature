# Scenario source: references/security-identity.md. Requires real Keycloak test realm and step definitions.
@identity @p0 @security
Feature: Autenticación de compradores y administradores
  La plataforma debe autenticar usuarios sin exponer tokens y exigir MFA a administradores.

  Scenario: Registro con correo verificado
    Given un visitante sin cuenta NexaMarket
    When completa un registro válido usando su correo
    Then se crea una identidad pendiente de verificar
    And se solicita confirmación de correo sin exponer secretos
    And no obtiene permisos de vendedor ni administrador

  Scenario: Inicio con Google vinculado correctamente
    Given un proveedor Google de prueba configurado
    And un comprador sin sesión
    When autoriza el inicio de sesión con un callback OIDC válido
    Then queda autenticado como comprador
    And su sesión del navegador usa cookies seguras
    And no se almacena un access token en localStorage

  Scenario: Rechazar callback social con state inválido
    Given un intento de autenticación social iniciado
    When vuelve un callback con state diferente
    Then no se crea sesión de comprador
    And se registra el intento de forma segura

  Scenario: Bloquear MFA inválido de administrador
    Given un administrador con MFA requerido
    When presenta un código TOTP incorrecto o reutilizado
    Then no accede al panel de administración
    And el sistema contabiliza el intento según su política

  Scenario: Revocar sesión al cerrar sesión
    Given un comprador autenticado
    When cierra sesión
    Then la sesión de BFF/Keycloak queda revocada según contrato
    And una solicitud posterior a órdenes privadas se rechaza
