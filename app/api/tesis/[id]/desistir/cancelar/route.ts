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

    await prisma.$transaction(async (tx) => {
      await tx.thesisWithdrawal.update({
        where: { id: solicitud.id },
        data: { estadoSolicitud: 'CANCELADO' },
      })
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
    console.error('[Desistir cancelar] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
