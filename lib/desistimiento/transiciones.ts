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

/**
 * Cuando un autor desiste y otro continúa solo, decide a qué estado va la tesis.
 *
 * Regla: si ya existe la resolución de conformación de jurado (RESOLUCION_JURADO),
 * la tesis NO retrocede — esa resolución queda intacta y la evaluación continúa
 * con un solo autor; la RESOLUCION_DESISTIMIENTO formaliza el cambio de composición.
 *
 * Si todavía no hay RESOLUCION_JURADO (estados tempranos o ASIGNANDO_JURADOS sin
 * documento), retrocedemos a BORRADOR para que el autor único reorganice.
 */
export function estadoDestinoConCoautor(
  estadoPrevio: EstadoTesis,
  tieneResolucionJurado: boolean,
): EstadoTesis {
  if (tieneResolucionJurado) return estadoPrevio
  return 'BORRADOR'
}

/**
 * Mesa de partes debe subir la RESOLUCION_DESISTIMIENTO obligatoriamente
 * cuando ya existe RESOLUCION_JURADO emitida (sin importar si hay coautor:
 * si la tesis se cierra, igual hay que formalizar el desistimiento).
 */
export function requiereResolucionDesistimiento(tieneResolucionJurado: boolean): boolean {
  return tieneResolucionJurado
}
