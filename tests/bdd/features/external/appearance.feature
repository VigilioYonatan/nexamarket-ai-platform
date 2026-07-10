# language: es
@external @playwright
Característica: Apariencia NexaMarket y accesibilidad
  Escenario: Publicación de tema global
    Dado un administrador autenticado
    Y un tema válido creado en borrador
    Cuando lo publica desde el Admin Center
    Entonces el storefront utiliza la versión publicada
    Y la versión anterior permanece recuperable

  Escenario: Preferencia de modo oscuro
    Dado un comprador en el marketplace
    Cuando activa el modo oscuro
    Entonces la interfaz cambia de modo sin perder datos
    Y la preferencia permanece al recargar

  Escenario: No permitir temas con contraste insuficiente
    Dado un administrador en el editor visual
    Cuando introduce colores sin contraste suficiente
    Entonces la publicación es rechazada con una explicación
