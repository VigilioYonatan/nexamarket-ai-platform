@inventory @checkout @concurrency @p0
Feature: Carrito y reserva de inventario multi-vendedor
  La plataforma evita sobreventa y cotiza el importe auténtico.

  Scenario: Dos compradores compiten por la última unidad
    Given un listing activo con una sola unidad disponible
    And dos compradores autenticados con ese listing en sus carritos
    When crean sus checkouts simultáneamente
    Then exactamente uno obtiene una reserva válida
    And el otro recibe conflicto de disponibilidad
    And el stock disponible nunca es negativo

  Scenario: Repetir checkout con la misma clave idempotente
    Given un comprador autenticado con un carrito válido
    When reintenta la creación de checkout con la misma clave idempotente
    Then recibe la misma operación de checkout
    And la reserva de inventario no se duplica

  Scenario: Revalidar precio tras cambio de listing
    Given un comprador que vio un subtotal anterior
    And el vendedor cambió de precio antes de confirmar
    When el comprador solicita confirmar un checkout
    Then el servidor rechaza o presenta una nueva cotización
    And no cobra el importe del subtotal manipulado por el navegador

  Scenario: Carrito con dos sellers
    Given un carrito con listings de dos vendedores aprobados
    When se prepara el checkout
    Then se crea una orden principal con dos seller-orders
    And cada seller-order conserva su snapshot financiero
    And se explica al comprador cómo se procesarán los pagos por seller
