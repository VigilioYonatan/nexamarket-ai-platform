@catalog @seller @p0
Feature: Publicaciones de múltiples vendedores en un catálogo único
  Los sellers tienen ofertas propias, pero no tiendas independientes.

  Scenario: Seller aprobado publica una oferta
    Given un vendedor aprobado y conectado a Mercado Pago
    And un producto canónico autorizado con una variante
    When registra una oferta válida para esa variante
    And la envía a publicación
    Then su oferta aparece en el catálogo central según moderación
    And el vendedor no obtiene controles sobre el tema global

  Scenario: Seller suspendido no publica
    Given un vendedor suspendido
    When intenta publicar una oferta válida
    Then la plataforma rechaza la operación
    And no existe una nueva oferta publicada

  Scenario: No fusionar dos productos parecidos sin evidencia
    Given dos fichas de laptops con nombres similares y atributos contradictorios
    When el detector de duplicados propone una coincidencia incierta
    Then se crea un candidato de revisión
    And no se fusionan automáticamente los productos canónicos
