# language: es
Característica: Reseñas con decisión humana irreversible
  Una reseña ya aprobada o rechazada no puede moderarse nuevamente sin un nuevo proceso auditado.

  Escenario: Aprobar una reseña pendiente
    Dado una reseña en estado "PENDING"
    Cuando la moderación decide "APPROVED"
    Entonces la reseña queda en estado "APPROVED"

  Escenario: No alterar silenciosamente una decisión anterior
    Dado una reseña en estado "APPROVED"
    Cuando la moderación decide "REJECTED"
    Entonces la moderación se rechaza con "REVIEW_NOT_PENDING"
