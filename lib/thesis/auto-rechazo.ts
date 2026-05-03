/**
 * Marcador único usado en el comentario de `thesisStatusHistory` cuando el
 * rechazo es automático por vencimiento de plazo (cron). Permite distinguirlo
 * de un rechazo manual de mesa de partes sin agregar un campo nuevo al schema.
 *
 * Reglas:
 *  - El cron escribe el comentario PREFIJADO con AUTO_RECHAZO_MARKER.
 *  - Quien lea el historial usa `isAutoRechazo()` para detectarlo.
 *  - Cambiar este string requiere migrar registros existentes — por eso vive
 *    aislado en este módulo.
 */

export const AUTO_RECHAZO_MARKER = '[AUTO_RECHAZO]'

/** Detecta si una entrada de thesisStatusHistory corresponde a un auto-rechazo del cron. */
export function isAutoRechazo(comentario: string | null | undefined): boolean {
  return !!comentario?.startsWith(AUTO_RECHAZO_MARKER)
}

/** Compone el comentario completo del cron de auto-rechazo. */
export function buildAutoRechazoComentario(fechaVencimiento: Date): string {
  const fechaLima = fechaVencimiento.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
  return `${AUTO_RECHAZO_MARKER} Trámite reiniciado automáticamente: el plazo de subsanación venció el ${fechaLima} sin que el tesista presentara las correcciones. Reglamento UNAMAD — fase de gestión de proyecto.`
}
