import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'

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
        autores: { some: { userId: user.id, estado: { notIn: ['DESISTIDO', 'RECHAZADO'] } } },
      },
      include: {
        documentos: {
          where: { esVersionActual: true },
        },
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

    const docVoucherInforme = tesis.documentos.find((d) => d.tipo === 'VOUCHER_PAGO_INFORME')
    requisitos.push({
      nombre: 'Voucher de Pago (S/. 20 - Código 465)',
      cumplido: !!docVoucherInforme,
      detalle: docVoucherInforme ? 'Subido' : 'Falta subir el voucher de pago del informe final',
    })

    const docTurnitin = tesis.documentos.find((d) => d.tipo === 'REPORTE_TURNITIN')
    requisitos.push({
      nombre: 'Reporte Turnitin',
      cumplido: !!docTurnitin,
      detalle: docTurnitin ? 'Subido' : 'Falta subir el reporte de Turnitin firmado por el asesor',
    })

    const docActaVerificacion = tesis.documentos.find((d) => d.tipo === 'ACTA_VERIFICACION_ASESOR')
    requisitos.push({
      nombre: 'Acta de Verificación del Asesor',
      cumplido: !!docActaVerificacion,
      detalle: docActaVerificacion ? 'Subido' : 'Falta subir el acta de verificación de similitud del asesor',
    })

    const docResolucion = tesis.documentos.find((d) => d.tipo === 'RESOLUCION_APROBACION')
    requisitos.push({
      nombre: 'Resolución de Aprobación',
      cumplido: !!docResolucion,
      detalle: docResolucion ? 'Subido' : 'Falta la resolución de aprobación (subida por mesa de partes)',
    })

    // Nota: La resolución de jurado informe, voucher físico y jurados asignados
    // se verifican cuando mesa de partes apruebe el informe (EN_REVISION_INFORME → EN_EVALUACION_INFORME),
    // no al momento de enviar.

    const requisitosNoCumplidos = requisitos.filter((r) => !r.cumplido)

    if (requisitosNoCumplidos.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'No se cumplen todos los requisitos para enviar el informe final',
        requisitos,
      }, { status: 400 })
    }

    // Desactivar dictámenes de la fase anterior (PROYECTO) para no confundir con INFORME_FINAL
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId: tesisId,
        tipo: 'DICTAMEN_JURADO',
        esVersionActual: true,
      },
      data: { esVersionActual: false },
    })

    // Enviar a revisión de mesa de partes (NO directamente a jurados)
    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: tesisId },
        data: {
          estado: 'EN_REVISION_INFORME',
          faseActual: 'INFORME_FINAL',
          fechaLimiteCorreccion: null,
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesisId,
          estadoAnterior: 'INFORME_FINAL',
          estadoNuevo: 'EN_REVISION_INFORME',
          comentario: 'Informe final enviado para revisión por mesa de partes.',
          changedById: user.id,
        },
      }),
    ])

    // === NOTIFICACIONES ===
    const primerAutor = tesis.autores[0]

    const nombreTesista = primerAutor?.user
      ? `${primerAutor.user.nombres} ${primerAutor.user.apellidoPaterno} ${primerAutor.user.apellidoMaterno || ''}`.trim()
      : 'Tesista'

    // Notificación por sistema a mesa de partes (para que revisen el informe)
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
          tipo: 'INFORME_ENVIADO_REVISION',
          titulo: 'Informe final enviado para revisión',
          mensaje: `El tesista ${nombreTesista} ha enviado su informe final para revisión: "${tesis.titulo}"`,
          enlace: `/mesa-partes/${tesisId}`,
        })
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar mesa de partes:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Informe final enviado para revisión por mesa de partes',
      data: { nuevoEstado: 'EN_REVISION_INFORME' },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/enviar-informe] Error:', error)
    return NextResponse.json({ error: 'Error al enviar informe' }, { status: 500 })
  }
}
