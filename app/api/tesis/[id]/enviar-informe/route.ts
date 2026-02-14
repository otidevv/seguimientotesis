import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { agregarDiasHabiles, DIAS_HABILES_EVALUACION } from '@/lib/business-days'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/tesis/[id]/enviar-informe - Estudiante envia informe final para evaluacion
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
      include: {
        documentos: {
          where: { esVersionActual: true },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    if (tesis.estado !== 'INFORME_FINAL') {
      return NextResponse.json(
        { error: 'Solo se puede enviar el informe final en el estado correspondiente' },
        { status: 400 }
      )
    }

    // Verificar requisitos para informe final
    const requisitos: { nombre: string; cumplido: boolean; detalle: string }[] = []

    const docInforme = tesis.documentos.find((d) => d.tipo === 'INFORME_FINAL_DOC')
    requisitos.push({
      nombre: 'Informe Final',
      cumplido: !!docInforme,
      detalle: docInforme ? 'Subido' : 'Falta subir el informe final',
    })

    const docTurnitin = tesis.documentos.find((d) => d.tipo === 'REPORTE_TURNITIN')
    requisitos.push({
      nombre: 'Reporte Turnitin',
      cumplido: !!docTurnitin,
      detalle: docTurnitin ? 'Subido' : 'Falta subir el reporte de Turnitin',
    })

    const requisitosNoCumplidos = requisitos.filter((r) => !r.cumplido)

    if (requisitosNoCumplidos.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'No se cumplen todos los requisitos para enviar el informe final',
        requisitos,
      }, { status: 400 })
    }

    const fechaLimite = agregarDiasHabiles(new Date(), DIAS_HABILES_EVALUACION)

    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: tesisId },
        data: {
          estado: 'EN_EVALUACION_INFORME',
          rondaActual: 1,
          faseActual: 'INFORME_FINAL',
          fechaLimiteEvaluacion: fechaLimite,
          fechaLimiteCorreccion: null,
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesisId,
          estadoAnterior: 'INFORME_FINAL',
          estadoNuevo: 'EN_EVALUACION_INFORME',
          comentario: `Informe final enviado para evaluación por el jurado. Fecha límite (${DIAS_HABILES_EVALUACION} días hábiles): ${fechaLimite.toLocaleDateString('es-PE')}`,
          changedById: user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Informe final enviado para evaluacion',
      data: { nuevoEstado: 'EN_EVALUACION_INFORME' },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/enviar-informe] Error:', error)
    return NextResponse.json({ error: 'Error al enviar informe' }, { status: 500 })
  }
}
