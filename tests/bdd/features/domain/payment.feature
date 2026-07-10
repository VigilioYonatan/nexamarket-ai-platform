# language: es
Característica: Reembolsos y ledger
  Solo se puede devolver el importe realmente cobrado.

  Escenario: Reembolso parcial dentro del pago
    Dado que cobré 10000 centavos y devolví 2000 centavos
    Cuando solicito devolver 8000 centavos
    Entonces el reembolso es permitido

  Escenario: Rechazar reembolso mayor al saldo
    Dado que cobré 10000 centavos y devolví 2000 centavos
    Cuando solicito devolver 8001 centavos
    Entonces el reembolso es rechazado con "REFUND_EXCEEDS_PAYMENT"

  Escenario: Ledger balanceado
    Dado un asiento con débito 2500 y crédito -2500 centavos PEN
    Cuando verifico el asiento
    Entonces el asiento es válido

  Escenario: Ledger desbalanceado
    Dado un asiento con débito 2500 y crédito -2000 centavos PEN
    Cuando verifico el asiento
    Entonces el asiento es rechazado con "UNBALANCED_JOURNAL"
