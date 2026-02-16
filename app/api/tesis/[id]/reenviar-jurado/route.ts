import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { agregarDiasHabiles, DIAS_HABILES_EVALUACION } from '@/lib/business-days'

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
        autores: { some: { userId: user.id } },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
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
