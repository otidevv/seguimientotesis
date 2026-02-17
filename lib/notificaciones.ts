import { prisma } from '@/lib/prisma'

interface CrearNotificacionParams {
  userId: string | string[]
  tipo: string
  titulo: string
  mensaje: string
  enlace?: string
}

export async function crearNotificacion({ userId, tipo, titulo, mensaje, enlace }: CrearNotificacionParams) {
  const userIds = Array.isArray(userId) ? userId : [userId]
  if (userIds.length === 0) return

  try {
    await prisma.notification.createMany({
      data: userIds.map(uid => ({ userId: uid, tipo, titulo, mensaje, enlace }))
    })
  } catch (error) {
    console.error('[Notificacion] Error al crear notificación:', error)
  }
}
