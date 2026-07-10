# language: es
Característica: Inventario reservado bajo concurrencia
  Una reserva no puede exceder las existencias físicas disponibles.

  Escenario: Una reserva válida
    Dado que un artículo tiene 2 unidades y 0 reservadas
    Cuando intento reservar 2 unidades
    Entonces la reserva es permitida

  Escenario: Rechazar sobreventa
    Dado que un artículo tiene 1 unidades y 1 reservadas
    Cuando intento reservar 1 unidades
    Entonces la reserva es rechazada con "INSUFFICIENT_STOCK"

  Escenario: Detectar inconsistencia contable del inventario
    Dado que un artículo tiene 0 unidades y 1 reservadas
    Cuando intento reservar 1 unidades
    Entonces la reserva es rechazada con "INVALID_INVENTORY"
