import type { EstadoTesis } from '@prisma/client'

export const ESTADOS_PERMITIDOS_DESISTIMIENTO: EstadoTesis[] = [
  'BORRADOR',
  'EN_REVISION',
  'OBSERVADA',
  'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO',
  'OBSERVADA_JURADO',
  'PROYECTO_APROBADO',
]

const ESTADOS_RETROCEDE_BORRADOR: EstadoTesis[] = ['EN_REVISION', 'OBSERVADA']
const ESTADOS_RETROCEDE_JURADOS: EstadoTesis[] = [
  'ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'PROYECTO_APROBADO',
]

/**
 * Dado un estado previo de la tesis, retorna el estado al que debe ir
 * cuando un coautor desiste y el otro continúa solo.
 */
export function estadoDestinoConCoautor(estadoPrevio: EstadoTesis): EstadoTesis {
  if (ESTADOS_RETROCEDE_BORRADOR.includes(estadoPrevio)) return 'BORRADOR'
  if (ESTADOS_RETROCEDE_JURADOS.includes(estadoPrevio)) return 'ASIGNANDO_JURADOS'
  return estadoPrevio
}

/**
 * True si al aprobar el desistimiento hay resolución vigente que
 * requiere modificatoria.
 */
export function requiereModificatoria(estadoPrevio: EstadoTesis): boolean {
  return ESTADOS_RETROCEDE_JURADOS.includes(estadoPrevio)
}
