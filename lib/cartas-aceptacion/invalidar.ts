/**
 * Helper para marcar cartas de aceptación como "requieren actualización" cuando
 * cambia el conjunto de autores ACEPTADOs de una tesis.
 *
 * Razón: las cartas de aceptación listan siempre los nombres de los tesistas
 * vigentes. Si el listado cambia (un coautor acepta su invitación, o un autor
 * ACEPTADO desiste y mesa de partes aprueba), la carta firmada queda con datos
 * obsoletos.
 *
 * En vez de desactivar la carta (esVersionActual=false) — lo que la haría
 * "desaparecer" de la UI como si no existiera — la dejamos vigente pero con el
 * flag `requiereActualizacion=true` y un motivo legible. Así:
 *   - La carta sigue visible (el asesor y el tesista la pueden revisar).
 *   - Aparece con un badge de "Desactualizada" y la razón del cambio.
 *   - El asesor recibe notificación + ve el aviso en la UI.
 *   - El envío a mesa de partes queda bloqueado hasta que el asesor suba una
 *     nueva versión (esa nueva versión limpia el flag).
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { crearNotificacion } from '@/lib/notificaciones'

export interface InvalidarCartasResult {
  cartasMarcadas: number
  asesoresNotificados: string[]
}

type TxOrClient = PrismaClient | Prisma.TransactionClient

/**
 * Marca como "requieren actualización" las cartas de aceptación vigentes de
 * asesor y coasesor en la tesis dada, y notifica a los asesores afectados.
 *
 * @param tx cliente Prisma o transacción.
 * @param tesisId id de la tesis.
 * @param motivo texto legible (se guarda en el documento y se usa en la notificación).
 */
export async function invalidarCartasAsesores(
  tx: TxOrClient,
  tesisId: string,
  motivo: string,
): Promise<InvalidarCartasResult> {
  const cartasActivas = await tx.thesisDocument.findMany({
    where: {
      thesisId: tesisId,
      tipo: { in: ['CARTA_ACEPTACION_ASESOR', 'CARTA_ACEPTACION_COASESOR'] },
      esVersionActual: true,
      esBorrador: false,
      requiereActualizacion: false, // Solo marcar las que aún no estén marcadas
    },
    select: {
      id: true,
      tipo: true,
      uploadedById: true,
    },
  })

  if (cartasActivas.length === 0) {
    return { cartasMarcadas: 0, asesoresNotificados: [] }
  }

  await tx.thesisDocument.updateMany({
    where: { id: { in: cartasActivas.map((c) => c.id) } },
    data: {
      requiereActualizacion: true,
      motivoActualizacion: motivo,
    },
  })

  const userIdsUnicos = Array.from(new Set(cartasActivas.map((c) => c.uploadedById)))

  try {
    await crearNotificacion({
      userId: userIdsUnicos,
      tipo: 'CARTA_ACEPTACION_INVALIDADA',
      titulo: 'Actualiza tu carta de aceptación',
      mensaje: `${motivo} Tu carta sigue visible en el expediente pero está marcada como desactualizada. Debes subir una nueva versión con los datos vigentes — el tesista no podrá enviar el expediente hasta que lo hagas.`,
      enlace: '/mis-asesorias',
    })
  } catch (err) {
    // No crítico: si falla la notificación, la marcación ya ocurrió.
    console.error('[invalidarCartasAsesores] Error enviando notificación:', err)
  }

  return {
    cartasMarcadas: cartasActivas.length,
    asesoresNotificados: userIdsUnicos,
  }
}
