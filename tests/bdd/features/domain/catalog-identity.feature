# language: es
Característica: Identidad canónica de producto por GTIN
  Nunca se fusionan publicaciones distintas solo porque sus títulos se parezcan.

  Escenario: Código GTIN-13 válido
    Dado un código de barras "4006381333931"
    Cuando compruebo el dígito GS1
    Entonces el código de barras es válido

  Escenario: Código con dígito de control incorrecto
    Dado un código de barras "4006381333932"
    Cuando compruebo el dígito GS1
    Entonces el código de barras es inválido

  Escenario: Código demasiado corto
    Dado un código de barras "1234"
    Cuando compruebo el dígito GS1
    Entonces el código de barras es inválido
