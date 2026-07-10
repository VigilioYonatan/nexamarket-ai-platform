# language: es
@external @postgres @critical
Característica: Checkout transaccional
  Escenario: Dos compradores compiten por la última unidad
    Dado un SKU publicado con 1 unidad disponible
    Y dos compradores distintos con el mismo SKU en carrito
    Cuando ambos hacen checkout con claves idempotentes diferentes en paralelo
    Entonces solo se reserva 1 unidad
    Y uno de los checkouts recibe 409 sin sobreventa

  Escenario: Repetición de checkout con la misma clave
    Dado un carrito válido con stock
    Cuando el comprador confirma checkout dos veces con la misma clave
    Entonces ambas respuestas se refieren al mismo pedido
    Y no hay doble descuento de inventario

  Escenario: Un vendedor no puede ver el pedido de otro
    Dado dos vendedores aprobados con productos y pedidos
    Cuando el vendedor A solicita el pedido del vendedor B
    Entonces la API devuelve 403 o 404 sin datos ajenos
