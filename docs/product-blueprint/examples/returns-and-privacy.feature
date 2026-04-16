@returns @privacy @p0
Feature: Devoluciones con idempotencia y privacidad
  Los reembolsos son autorizados y los datos privados permanecen aislados.

  Scenario: Reembolso parcial sin exceder el monto cobrado
    Given una seller-order pagada mediante Mercado Pago
    And una devolución aprobada de una de sus líneas
    When Finanzas autoriza el reembolso permitido
    Then se crea una solicitud al proveedor por monto válido
    And el resultado se concilia antes de finalizar el reembolso
    And el total de reembolsos nunca excede el cargo confirmado

  Scenario: Seller B no ve el pedido de A
    Given dos vendedores aprobados A y B
    And un seller-order que corresponde al vendedor A
    When el vendedor B consulta su identificador mediante API
    Then la operación se rechaza según política anti-enumeración
    And no se revelan datos del comprador ni montos sensibles

  Scenario: Exportación de datos personales
    Given un comprador autenticado con identidad verificada
    When solicita una exportación de sus datos conforme política aplicable
    Then el backend genera un trabajo autorizado
    And el resultado solo es descargable por el titular
    And el vínculo caduca y deja trazabilidad
