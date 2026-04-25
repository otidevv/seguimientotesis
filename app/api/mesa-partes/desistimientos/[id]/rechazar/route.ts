import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { EstadoTesis } from '@prisma/client'

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

    // Scope de facultad
    const esAdmin = user.roles?.some(
      r => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )
    const rolMesaPartes = !esAdmin ? user.roles?.find(
      r => r.role.codigo === 'MESA_PARTES' && r.isActive && r.contextType === 'FACULTAD' && r.contextId
    ) : null

    const parsed = Body.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        thesis: {
          select: {
            titulo: true,
            estado: true,
            autores: {
              where: { estado: 'ACEPTADO' },
              select: { userId: true, orden: true },
            },
            asesores: { where: { estado: 'ACEPTADO' }, select: { userId: true } },
          },
        },
        thesisAuthor: {
          select: {
            orden: true,
            user: { select: { nombres: true, apellidoPaterno: true } },
          },
        },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (rolMesaPartes && w.facultadIdSnapshot !== rolMesaPartes.contextId) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }
    if (w.thesis.estado !== 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: `Conflicto: la tesis cambió de estado (${w.thesis.estado}). Refresca la página.` },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.thesisWithdrawal.updateMany({
        where: { id, estadoSolicitud: 'PENDIENTE' },
        data: {
          estadoSolicitud: 'RECHAZADO',
          aprobadoPorId: user.id,
          aprobadoAt: new Date(),
          motivoRechazoMesaPartes: parsed.data.motivoRechazo,
        },
      })
      if (updated.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION')
      }
      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
        w.estadoTesisAlSolicitar,
        w.thesisId
      )
      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: EstadoTesis.SOLICITUD_DESISTIMIENTO,
          estadoNuevo: w.estadoTesisAlSolicitar,
          comentario: `Solicitud de desistimiento rechazada por mesa de partes. Motivo: ${parsed.data.motivoRechazo}`,
          changedById: user.id,
        },
      })
    })

    // Notificar al tesista solicitante
    await crearNotificacion({
      userId: w.userId,
      tipo: 'DESISTIMIENTO_RECHAZADO',
      titulo: 'Solicitud de desistimiento rechazada',
      mensaje: `Mesa de partes rechazó tu solicitud: ${parsed.data.motivoRechazo}`,
      enlace: `/mis-tesis/${w.thesisId}`,
    })

    // Notificar al otro tesista ACEPTADO y asesores (si estaban en vilo por la solicitud).
    // Usamos el nombre del solicitante en vez de asumir "coautor", porque podría haber sido
    // tanto el principal como un coautor quien pidió desistir.
    const coautorIds = w.thesis.autores
      .map(a => a.userId)
      .filter(uid => uid !== w.userId)
    if (coautorIds.length > 0) {
      const nombreSolicitante = w.thesisAuthor?.user
        ? `${w.thesisAuthor.user.nombres} ${w.thesisAuthor.user.apellidoPaterno}`
        : 'El otro tesista'
      await crearNotificacion({
        userId: coautorIds,
        tipo: 'DESISTIMIENTO_RECHAZADO',
        titulo: 'Solicitud de desistimiento rechazada',
        mensaje: `Mesa de partes rechazó la solicitud de desistimiento de ${nombreSolicitante}. La tesis "${w.thesis.titulo}" continúa normalmente.`,
        enlace: `/mis-tesis/${w.thesisId}`,
      })
    }
    const asesorIds = w.thesis.asesores.map(a => a.userId)
    if (asesorIds.length > 0) {
      await crearNotificacion({
        userId: asesorIds,
        tipo: 'DESISTIMIENTO_RECHAZADO',
        titulo: 'Solicitud de desistimiento rechazada',
        mensaje: `Mesa de partes rechazó la solicitud en "${w.thesis.titulo}". La tesis continúa su trámite normal.`,
        enlace: `/mis-asesorias`,
      })
    }

    return NextResponse.json({ message: 'Solicitud rechazada.' })
  } catch (error) {
    if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
      return NextResponse.json(
        { error: 'La solicitud fue modificada por otro proceso. Refresca la página.' },
        { status: 409 }
      )
    }
    console.error('[Rechazar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
