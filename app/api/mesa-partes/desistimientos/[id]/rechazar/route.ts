import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'

const Body = z.object({
  motivoRechazo: z.string().min(10).max(1000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'edit')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const parsed = Body.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: { thesis: { select: { titulo: true } } },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.thesisWithdrawal.update({
        where: { id },
        data: {
          estadoSolicitud: 'RECHAZADO',
          aprobadoPorId: user.id,
          aprobadoAt: new Date(),
          motivoRechazoMesaPartes: parsed.data.motivoRechazo,
        },
      })
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
        w.estadoTesisAlSolicitar,
        w.thesisId
      )
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: 'SOLICITUD_DESISTIMIENTO' as any,
          estadoNuevo: w.estadoTesisAlSolicitar,
          comentario: `Solicitud de desistimiento rechazada por mesa de partes. Motivo: ${parsed.data.motivoRechazo}`,
          changedById: user.id,
        },
      })
    })

    await crearNotificacion({
      userId: w.userId,
      tipo: 'DESISTIMIENTO_RECHAZADO',
      titulo: 'Solicitud de desistimiento rechazada',
      mensaje: `Mesa de partes rechazó tu solicitud: ${parsed.data.motivoRechazo}`,
      enlace: `/mis-tesis/${w.thesisId}`,
    })

    return NextResponse.json({ message: 'Solicitud rechazada.' })
  } catch (error) {
    console.error('[Rechazar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
