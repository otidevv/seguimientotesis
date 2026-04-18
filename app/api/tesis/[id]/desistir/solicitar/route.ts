import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { EstadoTesis } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { ESTADOS_PERMITIDOS_DESISTIMIENTO } from '@/lib/desistimiento/transiciones'

const Body = z.object({
  motivoCategoria: z.enum([
    'PERSONAL_FAMILIAR','ECONOMICO','SALUD','LABORAL','CAMBIO_TEMA',
    'PROBLEMA_ASESOR','PROBLEMA_COAUTOR','FALTA_TIEMPO','CAMBIO_CARRERA','OTRO',
  ]),
  motivoDescripcion: z.string().min(20, 'La descripción debe tener al menos 20 caracteres').max(2000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const json = await request.json()
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }

    const tesis = await prisma.thesis.findFirst({
      where: {
        id, deletedAt: null,
        autores: { some: { userId: user.id, estado: { in: ['PENDIENTE', 'ACEPTADO'] } } },
      },
      include: {
        autores: {
          include: {
            user: { select: { id: true, nombres: true, apellidoPaterno: true } },
            studentCareer: { include: { facultad: { select: { id: true, nombre: true } } } },
          },
        },
      },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    if (!ESTADOS_PERMITIDOS_DESISTIMIENTO.includes(tesis.estado)) {
      return NextResponse.json({
        error: `No se puede desistir en estado "${tesis.estado}".`
      }, { status: 400 })
    }

    const miAutor = tesis.autores.find(a => a.user.id === user.id && a.estado !== 'DESISTIDO' && a.estado !== 'RECHAZADO')
    if (!miAutor) return NextResponse.json({ error: 'No eres autor activo' }, { status: 404 })

    const existente = await prisma.thesisWithdrawal.findUnique({ where: { thesisAuthorId: miAutor.id } })
    if (existente && existente.estadoSolicitud === 'PENDIENTE') {
      return NextResponse.json({ error: 'Ya tienes una solicitud de desistimiento pendiente' }, { status: 409 })
    }
    if (existente && existente.estadoSolicitud === 'APROBADO') {
      return NextResponse.json({ error: 'Ya existe un desistimiento aprobado' }, { status: 409 })
    }

    const teniaCoautor = tesis.autores.some(a => a.user.id !== user.id && a.estado === 'ACEPTADO')
    const facultadId = miAutor.studentCareer.facultadId
    const carreraNombre = miAutor.studentCareer.carreraNombre

    const mesaPartesUsers = await prisma.userRole.findMany({
      where: {
        role: { codigo: 'MESA_PARTES' },
        OR: [
          { contextType: 'FACULTAD', contextId: facultadId },
          { contextType: null },
        ],
        isActive: true,
      },
      select: { userId: true },
    })

    const result = await prisma.$transaction(async (tx) => {
      const withdrawal = existente
        ? await tx.thesisWithdrawal.update({
            where: { id: existente.id },
            data: {
              motivoCategoria: parsed.data.motivoCategoria,
              motivoDescripcion: parsed.data.motivoDescripcion,
              estadoSolicitud: 'PENDIENTE',
              solicitadoAt: new Date(),
              aprobadoPorId: null,
              aprobadoAt: null,
              motivoRechazoMesaPartes: null,
              resolucionDocumentoId: null,
              estadoTesisAlSolicitar: tesis.estado,
              faseActual: tesis.faseActual ?? null,
              teniaCoautor,
              facultadIdSnapshot: facultadId,
              carreraNombreSnapshot: carreraNombre,
            },
          })
        : await tx.thesisWithdrawal.create({
            data: {
              thesisId: id,
              thesisAuthorId: miAutor.id,
              userId: user.id,
              studentCareerId: miAutor.studentCareerId,
              motivoCategoria: parsed.data.motivoCategoria,
              motivoDescripcion: parsed.data.motivoDescripcion,
              estadoSolicitud: 'PENDIENTE',
              estadoTesisAlSolicitar: tesis.estado,
              faseActual: tesis.faseActual ?? null,
              teniaCoautor,
              facultadIdSnapshot: facultadId,
              carreraNombreSnapshot: carreraNombre,
            },
          })

      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = 'SOLICITUD_DESISTIMIENTO', updated_at = NOW() WHERE id = $1`,
        id
      )

      await tx.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: EstadoTesis.SOLICITUD_DESISTIMIENTO,
          comentario: `Solicitud de desistimiento de ${miAutor.user.nombres} ${miAutor.user.apellidoPaterno}. Motivo: ${parsed.data.motivoCategoria}.`,
          changedById: user.id,
        },
      })

      return withdrawal
    })

    const nombre = `${miAutor.user.nombres} ${miAutor.user.apellidoPaterno}`
    if (mesaPartesUsers.length > 0) {
      await crearNotificacion({
        userId: mesaPartesUsers.map(u => u.userId),
        tipo: 'SOLICITUD_DESISTIMIENTO',
        titulo: 'Nueva solicitud de desistimiento',
        mensaje: `${nombre} solicitó desistir de la tesis "${tesis.titulo}".`,
        enlace: `/mesa-partes/desistimientos/${result.id}`,
      })
    }

    return NextResponse.json({
      message: 'Solicitud enviada. Mesa de partes revisará tu caso.',
      withdrawalId: result.id,
    })
  } catch (error) {
    console.error('[Desistir solicitar] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
