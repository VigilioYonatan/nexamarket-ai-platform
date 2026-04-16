@branding @settings @security @p0
Feature: Apariencia global versionada y segura
  Solo roles autorizados cambian el tema de todo NexaMarket.

  Scenario: Publicar tema global tras validar accesibilidad
    Given un Brand Manager autenticado con MFA requerido por política
    And un tema en borrador con logos, fuentes y tokens válidos
    When valida y publica la versión del tema
    Then las páginas públicas aplican la versión publicada
    And la versión anterior continúa disponible para rollback
    And la acción queda auditada

  Scenario: Un seller no puede editar el tema de la plataforma
    Given un vendedor aprobado que solo gestiona sus productos
    When solicita publicar un nuevo tema global
    Then el servidor rechaza la operación
    And el tema global no cambia

  Scenario: Impedir script en logo SVG o settings
    Given un usuario con acceso a edición visual
    When carga un SVG con scripts o un campo de tema con JavaScript
    Then la carga o publicación se rechaza o sanea según política segura
    And el script no se ejecuta en preview ni login

  Scenario: Rollback de tema defectuoso
    Given dos versiones publicables del tema
    And una versión reciente provoca una regresión visual
    When el administrador ejecuta rollback autorizado
    Then la plataforma recupera el snapshot anterior
    And se registra el rollback en auditoría
