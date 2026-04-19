import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { agregarDiasHabiles, DIAS_HABILES_EVALUACION } from '@/lib/business-days'
import { crearNotificacion } from '@/lib/notificaciones'
import { sendEmailByFaculty, emailTemplates } from '@/lib/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/tesis/[id]/reenviar-jurado - Estudiante reenvia proyecto corregido
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tesis = await prisma.thesis.findFirst({
      where: {
        id: tesisId,
        deletedAt: null,
        autores: { some: { userId: user.id, estado: { notIn: ['DESISTIDO', 'RECHAZADO'] } } },
      },
      include: {
        autores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
              },
            },
            studentCareer: {
              select: {
                facultad: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true,
                  },
                },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        jurados: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'Hay una solicitud de desistimiento pendiente. Cancela la solicitud o espera la resolución antes de reenviar.' },
        { status: 409 }
      )
    }
    // Solo permitir reenvio desde estados observados por jurado
    const estadosPermitidos = ['OBSERVADA_JURADO', 'OBSERVADA_INFORME']
    if (!estadosPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'Solo se puede reenviar en estado de observacion del jurado' },
        { status: 400 }
      )
    }

    // Verificar que hay un documento de proyecto actualizado
    const tipoDoc = tesis.estado === 'OBSERVADA_INFORME' ? 'INFORME_FINAL_DOC' : 'PROYECTO'
    const docProyecto = await prisma.thesisDocument.findFirst({
      where: {
        thesisId: tesisId,
        tipo: tipoDoc,
        esVersionActual: true,
      },
    })

    if (!docProyecto) {
      return NextResponse.json(
        { error: 'Debe subir el documento corregido antes de reenviar' },
        { status: 400 }
      )
    }

    // Verificar que el documento fue subido DESPUÉS de la observación
    // (el documento antiguo no cuenta como corrección)
    const ultimaObservacion = await prisma.thesisStatusHistory.findFirst({
      where: {
        thesisId: tesisId,
        estadoNuevo: tesis.estado as any,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (ultimaObservacion && docProyecto.createdAt <= ultimaObservacion.createdAt) {
      return NextResponse.json(
        { error: 'Debe subir el documento corregido antes de reenviar. El documento actual es anterior a la observación.' },
        { status: 400 }
      )
    }

    const nuevaRonda = tesis.rondaActual + 1
    const fechaLimite = agregarDiasHabiles(new Date(), DIAS_HABILES_EVALUACION)

    const nuevoEstado = tesis.estado === 'OBSERVADA_INFORME'
      ? 'EN_EVALUACION_INFORME'
      : 'EN_EVALUACION_JURADO'

    const faseTexto = tesis.estado === 'OBSERVADA_INFORME' ? 'informe final' : 'proyecto de tesis'
    const faseEvaluacion = tesis.estado === 'OBSERVADA_INFORME' ? 'INFORME_FINAL' : 'PROYECTO'

    await prisma.$transaction([
      // Desactivar dictámenes anteriores para que el presidente pueda subir uno nuevo en la nueva ronda
      prisma.thesisDocument.updateMany({
        where: {
          thesisId: tesisId,
          tipo: 'DICTAMEN_JURADO',
          esVersionActual: true,
        },
        data: { esVersionActual: false },
      }),
      prisma.thesis.update({
        where: { id: tesisId },
        data: {
          estado: nuevoEstado as any,
          rondaActual: nuevaRonda,
          fechaLimiteEvaluacion: fechaLimite,
          fechaLimiteCorreccion: null,
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesisId,
          estadoAnterior: tesis.estado,
          estadoNuevo: nuevoEstado as any,
          comentario: `Documento corregido reenviado por el estudiante. Ronda ${nuevaRonda}. Fecha límite de evaluación (${DIAS_HABILES_EVALUACION} días hábiles): ${fechaLimite.toLocaleDateString('es-PE')}`,
          changedById: user.id,
        },
      }),
    ])

    // === NOTIFICACIONES ===
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const primerAutor = tesis.autores[0]
    const facultad = primerAutor?.studentCareer?.facultad
    const facultadCodigo = facultad?.codigo || 'FI'
    const facultadNombre = facultad?.nombre || 'Facultad'
    const fechaLimiteStr = fechaLimite.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })

    const nombreTesista = primerAutor?.user
      ? `${primerAutor.user.nombres} ${primerAutor.user.apellidoPaterno} ${primerAutor.user.apellidoMaterno || ''}`.trim()
      : 'Tesista'

    // Filtrar jurados de la fase correspondiente
    const juradosFase = tesis.jurados.filter((j) => j.fase === faseEvaluacion)

    // Notificación por sistema a cada jurado
    try {
      const juradoIds = juradosFase.map((j) => j.user.id)
      if (juradoIds.length > 0) {
        await crearNotificacion({
          userId: juradoIds,
          tipo: 'TESIS_REENVIADA',
          titulo: `Documento corregido reenviado - Ronda ${nuevaRonda}`,
          mensaje: `El tesista ${nombreTesista} ha reenviado su ${faseTexto} corregido: "${tesis.titulo}". Fecha límite de evaluación: ${fechaLimiteStr}`,
          enlace: `/mis-evaluaciones/${tesisId}`,
        })
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar jurados:', notifError)
    }

    // Notificación por sistema a mesa de partes
    try {
      const mesaPartesUsers = await prisma.userRole.findMany({
        where: {
          role: { codigo: 'MESA_PARTES' },
          isActive: true,
        },
        select: { userId: true },
      })
      const mesaPartesIds = mesaPartesUsers.map((u) => u.userId)
      if (mesaPartesIds.length > 0) {
        await crearNotificacion({
          userId: mesaPartesIds,
          tipo: 'TESIS_REENVIADA',
          titulo: `Documento corregido reenviado - Ronda ${nuevaRonda}`,
          mensaje: `El tesista ${nombreTesista} ha reenviado su ${faseTexto} corregido: "${tesis.titulo}"`,
          enlace: `/mesa-partes/${tesisId}`,
        })
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar mesa de partes:', notifError)
    }

    // Email a cada jurado
    for (const jurado of juradosFase) {
      if (jurado.user?.email) {
        try {
          const nombreJurado = `${jurado.user.nombres} ${jurado.user.apellidoPaterno} ${jurado.user.apellidoMaterno || ''}`.trim()
          const tesisUrl = `${appUrl}/mis-evaluaciones/${tesisId}?juradoId=${jurado.id}`
          const template = emailTemplates.thesisResubmittedToJury(
            nombreJurado,
            nombreTesista,
            tesis.titulo,
            faseEvaluacion,
            nuevaRonda,
            facultadNombre,
            fechaLimiteStr,
            tesisUrl
          )
          await sendEmailByFaculty(facultadCodigo, {
            to: jurado.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })
          console.log(`[Email] Notificacion reenvio enviada al jurado: ${jurado.user.email}`)
        } catch (emailError) {
          console.error(`[Email] Error al notificar jurado ${jurado.user.email}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Documento reenviado exitosamente para evaluacion',
      data: { nuevoEstado, ronda: nuevaRonda },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/reenviar-jurado] Error:', error)
    return NextResponse.json({ error: 'Error al reenviar' }, { status: 500 })
  }
}
