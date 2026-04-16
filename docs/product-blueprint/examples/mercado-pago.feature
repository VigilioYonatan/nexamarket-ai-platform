@payments @mercado-pago @security @p0
Feature: Confirmación verificable con Mercado Pago único
  El retorno del navegador no sustituye a la verificación del proveedor.

  Scenario: Repetir intento de pago no duplica cobro
    Given un checkout reservado para un vendedor conectado a Mercado Pago
    And una clave idempotente fija
    When el comprador repite el intento de pago por pérdida de red
    Then solo existe un intento efectivo identificado por esa clave
    And no se generan asientos contables duplicados

  Scenario: No aprobar pedido por callback del navegador
    Given una seller-order pendiente de pago
    When el navegador visita una URL de resultado que afirma éxito
    Then la seller-order permanece pendiente hasta verificación en Mercado Pago
    And no se consume una reserva por ese callback

  Scenario: Rechazar webhook con firma inválida
    Given un webhook malicioso con datos de payment aprobado
    When llega con firma x-signature inválida
    Then el receptor lo rechaza
    And no actualiza pago, pedido, stock ni ledger

  Scenario: Webhook duplicado es idempotente
    Given una notificación válida de pago confirmado ya procesada
    When el mismo evento llega una segunda vez
    Then se conserva un único efecto financiero
    And la orden y reserva no cambian por segunda vez

  Scenario: Un vendedor cobra y otro falla
    Given una orden principal con seller-orders A y B
    And el intento de A está aprobado y el de B rechazado
    When se reconcilian ambos cobros de Mercado Pago
    Then la orden principal indica pago parcial según política
    And A no se confunde con B
    And B no se envía como pagado
