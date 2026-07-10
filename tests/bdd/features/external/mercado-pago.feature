# language: es
@external @mercadopago @critical
Característica: Pagos de vendedores con Mercado Pago
  Escenario: Checkout con artículos de dos vendedores
    Dado que hay productos de dos vendedores en el carrito
    Cuando se confirma el checkout
    Entonces se generan subpedidos separados por vendedor
    Y el comprador ve la necesidad de pagos individuales

  Escenario: Webhook duplicado aprobado
    Dado un intento pendiente de pago en sandbox
    Cuando llegan dos notificaciones firmadas del mismo pago
    Entonces el asiento contable se registra exactamente una vez
    Y el inventario se consume exactamente una vez

  Escenario: Firma de webhook incorrecta
    Dado una notificación con firma errónea
    Cuando la API de webhook recibe la notificación
    Entonces responde 401 y no actualiza el estado del pedido

  Escenario: Timeout ambiguo al cobrar
    Dado un intento enviado a Mercado Pago
    Cuando se pierde la respuesta de la red
    Entonces no se reenvía un segundo cobro automáticamente
    Y la operación queda pendiente de conciliación
