import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { invalidarCartasAsesores } from '@/lib/cartas-aceptacion/invalidar'

// POST /api/mis-invitaciones/[id]/responder - Aceptar o rechazar una invitación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { accion, motivoRechazo } = body // accion: 'ACEPTAR' o 'RECHAZAR'

    if (!accion || !['ACEPTAR', 'RECHAZAR'].includes(accion)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser ACEPTAR o RECHAZAR' },
        { status: 400 }
      )
    }

    // Primero intentar buscar como coautor
    let invitacionCoautor = await prisma.thesisAuthor.findFirst({
      where: {
        id,
        userId: user.id,
        estado: 'PENDIENTE',
      },
      include: {
        thesis: {
          select: {
            id: true,
            titulo: true,
            estado: true,
          },
        },
      },
    })

    if (invitacionCoautor) {
      // Bloquear si la tesis está congelada (desistimiento en trámite o cerrada)
      const estadoCongelado = ['SOLICITUD_DESISTIMIENTO', 'DESISTIDA', 'RECHAZADA']
      if (estadoCongelado.includes(invitacionCoautor.thesis.estado)) {
        return NextResponse.json(
          { error: 'No puedes responder a esta invitación: la tesis está con un proceso pendiente o cerrada.' },
          { status: 409 }
        )
      }
      // Es una invitación como coautor
      // Para coautores, el motivo de rechazo es obligatorio
      if (accion === 'RECHAZAR' && !motivoRechazo) {
        return NextResponse.json(
          { error: 'Debe proporcionar un motivo de rechazo' },
          { status: 400 }
        )
      }

      // Defensa: si existe un desistimiento APROBADO previo del mismo usuario
      // en esta tesis (caso de datos legacy / invitación creada antes de los
      // guardias actuales), NO permitir aceptar — el desistimiento formal no
      // debe poder revertirse por el usuario.
      if (accion === 'ACEPTAR') {
        const withdrawalPrevio = await prisma.thesisWithdrawal.findFirst({
          where: {
            thesisId: invitacionCoautor.thesis.id,
            userId: user.id,
            estadoSolicitud: 'APROBADO',
          },
          select: { id: true },
        })
        if (withdrawalPrevio) {
          return NextResponse.json(
            {
              error: 'Ya desististe formalmente de esta tesis. No puedes volver a aceptar esta invitación.',
            },
            { status: 409 }
          )
        }
      }

      const nuevoEstado = accion === 'ACEPTAR' ? 'ACEPTADO' : 'RECHAZADO'

      await prisma.thesisAuthor.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaRespuesta: new Date(),
          motivoRechazo: accion === 'RECHAZAR' ? motivoRechazo : null,
        },
      })

      // Registrar en historial de la tesis
      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: invitacionCoautor.thesis.id,
          estadoNuevo: invitacionCoautor.thesis.estado, // Estado actual de la tesis (no cambia)
          comentario: accion === 'ACEPTAR'
            ? `Coautor ${user.nombres} ${user.apellidoPaterno} aceptó la invitación`
            : `Coautor ${user.nombres} ${user.apellidoPaterno} rechazó la invitación: ${motivoRechazo}`,
          changedById: user.id,
        },
      })

      // Si el coautor ACEPTÓ, invalidar cartas de aceptación existentes: las cartas
      // firmadas listan a los tesistas vigentes, y ahora el conjunto cambió.
      if (accion === 'ACEPTAR') {
        await invalidarCartasAsesores(
          prisma,
          invitacionCoautor.thesis.id,
          `El tesista ${user.nombres} ${user.apellidoPaterno} aceptó la invitación como coautor de la tesis "${invitacionCoautor.thesis.titulo}".`,
        )
      }

      return NextResponse.json({
        success: true,
        message: accion === 'ACEPTAR'
          ? 'Invitación aceptada exitosamente. Ahora eres coautor de esta tesis.'
          : 'Invitación rechazada.',
        data: {
          tipo: 'COAUTOR',
          tesisId: invitacionCoautor.thesis.id,
          tesisTitulo: invitacionCoautor.thesis.titulo,
          nuevoEstado,
        },
      })
    }

    // Si no es coautor, buscar como asesor
    const invitacionAsesor = await prisma.thesisAdvisor.findFirst({
      where: {
        id,
        userId: user.id,
        estado: 'PENDIENTE',
      },
      include: {
        thesis: {
          select: {
            id: true,
            titulo: true,
            estado: true,
          },
        },
      },
    })

    if (invitacionAsesor) {
      // Bloquear si la tesis está congelada
      const estadoCongelado = ['SOLICITUD_DESISTIMIENTO', 'DESISTIDA', 'RECHAZADA']
      if (estadoCongelado.includes(invitacionAsesor.thesis.estado)) {
        return NextResponse.json(
          { error: 'No puedes responder a esta invitación: la tesis está con un proceso pendiente o cerrada.' },
          { status: 409 }
        )
      }
      // Es una invitación como asesor
      const nuevoEstado = accion === 'ACEPTAR' ? 'ACEPTADO' : 'RECHAZADO'

      await prisma.thesisAdvisor.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaRespuesta: new Date(),
        },
      })

      // Registrar en historial de la tesis
      const tipoAsesor = invitacionAsesor.tipo === 'PRINCIPAL' ? 'Asesor' : 'Coasesor'
      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: invitacionAsesor.thesis.id,
          estadoNuevo: invitacionAsesor.thesis.estado, // Estado actual de la tesis (no cambia)
          comentario: accion === 'ACEPTAR'
            ? `${tipoAsesor} ${user.nombres} ${user.apellidoPaterno} aceptó la invitación`
            : `${tipoAsesor} ${user.nombres} ${user.apellidoPaterno} rechazó la invitación`,
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: accion === 'ACEPTAR'
          ? `Invitación aceptada exitosamente. Ahora eres ${tipoAsesor.toLowerCase()} de esta tesis.`
          : 'Invitación rechazada.',
        data: {
          tipo: invitacionAsesor.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
          tesisId: invitacionAsesor.thesis.id,
          tesisTitulo: invitacionAsesor.thesis.titulo,
          nuevoEstado,
        },
      })
    }

    // No se encontró ninguna invitación
    return NextResponse.json(
      { error: 'Invitación no encontrada o ya fue procesada' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[POST /api/mis-invitaciones/[id]/responder] Error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la invitación' },
      { status: 500 }
    )
  }
}
