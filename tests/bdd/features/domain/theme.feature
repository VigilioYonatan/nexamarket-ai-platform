# language: es
Característica: Diseño visual global accesible
  Los colores y fuentes deben respetar reglas de accesibilidad y allowlist.

  Escenario: Tema inicial válido
    Dado el tema global predeterminado
    Cuando valido el tema
    Entonces el tema es válido

  Escenario: Rechazar contraste deficiente
    Dado el tema global predeterminado
    Y el texto del tema es "#FFFFFF"
    Cuando valido el tema
    Entonces el tema es rechazado con "LOW_CONTRAST"

  Escenario: Rechazar fuente no permitida
    Dado el tema global predeterminado
    Y la fuente del tema es "url(http://malicioso)"
    Cuando valido el tema
    Entonces el tema es rechazado con "INVALID_THEME"
