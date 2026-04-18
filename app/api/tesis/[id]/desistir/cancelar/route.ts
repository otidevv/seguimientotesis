import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EstadoTesis } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const tesis = await prisma.thesis.findFirst({
      where: { id, deletedAt: null },
      include: {
        autores: { where: { userId: user.id } },
        desistimientos: { where: { estadoSolicitud: 'PENDIENTE' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    const miAutor = tesis.autores[0]
    if (!miAutor) return NextResponse.json({ error: 'No eres autor de esta tesis' }, { status: 403 })

    const solicitud = tesis.desistimientos.find(d => d.thesisAuthorId === miAutor.id)
    if (!solicitud) {
      return NextResponse.json({ error: 'No tienes una solicitud pendiente' }, { status: 404 })
    }
    // Defensa: si la tesis ya no está en SOLICITUD_DESISTIMIENTO,
    // mesa-partes probablemente ya resolvió — no cancelar.
    if (tesis.estado !== 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'Tu solicitud ya fue procesada por mesa de partes. Refresca la página.' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.thesisWithdrawal.updateMany({
        where: { id: solicitud.id, estadoSolicitud: 'PENDIENTE' },
        data: { estadoSolicitud: 'CANCELADO' },
      })
      if (updated.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION')
      }
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
        solicitud.estadoTesisAlSolicitar,
        id
      )
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: EstadoTesis.SOLICITUD_DESISTIMIENTO,
          estadoNuevo: solicitud.estadoTesisAlSolicitar,
          comentario: 'Cancelación de solicitud de desistimiento por el tesista.',
          changedById: user.id,
        },
      })
    })

    return NextResponse.json({ message: 'Solicitud cancelada.' })
  } catch (error) {
    if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
      return NextResponse.json(
        { error: 'Mesa de partes ya resolvió tu solicitud. Refresca la página.' },
        { status: 409 }
      )
    }
    console.error('[Desistir cancelar] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
