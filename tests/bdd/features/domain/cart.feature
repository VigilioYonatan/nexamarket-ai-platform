# language: es
Característica: Cantidad real disponible en el carrito
  El backend prohíbe exceder el inventario o 100 unidades por publicación.

  Escenario: Agregar unidades sin exceder la disponibilidad
    Dado un carrito con 2 unidades de la publicación
    Y el stock vendible es 10
    Cuando añado 3 unidades al carrito
    Entonces el carrito tiene 5 unidades

  Escenario: No aumentar más allá del stock disponible
    Dado un carrito con 9 unidades de la publicación
    Y el stock vendible es 10
    Cuando añado 2 unidades al carrito
    Entonces el carrito rechaza la operación con "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT"

  Escenario: No saltar máximo de 100 con múltiples operaciones
    Dado un carrito con 100 unidades de la publicación
    Y el stock vendible es 500
    Cuando añado 1 unidades al carrito
    Entonces el carrito rechaza la operación con "CART_QUANTITY_EXCEEDS_STOCK_OR_LIMIT"
