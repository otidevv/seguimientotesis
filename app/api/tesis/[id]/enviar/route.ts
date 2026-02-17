/**
 * API Route: /api/tesis/[id]/enviar
 *
 * POST: Envía la tesis a revisión
 * Cambia el estado de BORRADOR a EN_REVISION
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearNotificacion } from '@/lib/notificaciones'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener la tesis con todos los datos necesarios
    const tesis = await prisma.thesis.findFirst({
      where: {
        id: tesisId,
        deletedAt: null,
      },
      include: {
        autores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        asesores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
              },
            },
          },
        },
        documentos: {
          where: { esVersionActual: true },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es autor de la tesis
    const esAutor = tesis.autores.some((a) => a.userId === user.id)
    if (!esAutor) {
      return NextResponse.json(
        { error: 'Solo los autores pueden enviar la tesis a revisión' },
        { status: 403 }
      )
    }

    // Verificar que la tesis está en estado BORRADOR
    if (tesis.estado !== 'BORRADOR') {
      return NextResponse.json(
        { error: 'Solo se pueden enviar tesis en estado borrador' },
        { status: 400 }
      )
    }

    // Verificar requisitos
    const requisitos: { nombre: string; cumplido: boolean; detalle?: string }[] = []

    // 1. Documento de proyecto
    const docProyecto = tesis.documentos.find((d) => d.tipo === 'PROYECTO')
    requisitos.push({
      nombre: 'Proyecto de Tesis',
      cumplido: !!docProyecto,
      detalle: docProyecto ? 'Subido' : 'Falta subir el documento del proyecto',
    })

    // 2. Asesor principal aceptó
    const asesor = tesis.asesores.find((a) => a.tipo === 'PRINCIPAL')
    const asesorAcepto = asesor?.estado === 'ACEPTADO'
    requisitos.push({
      nombre: 'Aceptación del Asesor',
      cumplido: asesorAcepto,
      detalle: asesor
        ? asesorAcepto
          ? `${asesor.user.nombres} ${asesor.user.apellidoPaterno} aceptó`
          : 'Esperando aceptación del asesor'
        : 'No hay asesor asignado',
    })

    // 3. Carta de aceptación del asesor (firmada digital o físicamente)
    const cartaAsesor = tesis.documentos.find(
      (d) => d.tipo === 'CARTA_ACEPTACION_ASESOR'
    )
    requisitos.push({
      nombre: 'Carta de Aceptación del Asesor',
      cumplido: !!cartaAsesor,
      detalle: cartaAsesor
        ? cartaAsesor.firmadoDigitalmente ? 'Carta firmada digitalmente' : 'Carta registrada'
        : 'El asesor debe subir su carta de aceptación',
    })

    // 4. Coasesor (si existe) aceptó
    const coasesor = tesis.asesores.find((a) => a.tipo === 'CO_ASESOR')
    if (coasesor) {
      const coasesorAcepto = coasesor.estado === 'ACEPTADO'
      requisitos.push({
        nombre: 'Aceptación del Coasesor',
        cumplido: coasesorAcepto,
        detalle: coasesorAcepto
          ? `${coasesor.user.nombres} ${coasesor.user.apellidoPaterno} aceptó`
          : 'Esperando aceptación del coasesor',
      })

      // 5. Carta de aceptación del coasesor (firmada digital o físicamente)
      const cartaCoasesor = tesis.documentos.find(
        (d) => d.tipo === 'CARTA_ACEPTACION_COASESOR'
      )
      requisitos.push({
        nombre: 'Carta de Aceptación del Coasesor',
        cumplido: !!cartaCoasesor,
        detalle: cartaCoasesor
          ? cartaCoasesor.firmadoDigitalmente ? 'Carta firmada digitalmente' : 'Carta registrada'
          : 'El coasesor debe subir su carta de aceptación',
      })
    }

    // 6. Coautor (si existe) aceptó
    const coautor = tesis.autores.find((a) => a.orden > 1)
    if (coautor) {
      const coautorAcepto = coautor.estado === 'ACEPTADO'
      requisitos.push({
        nombre: 'Aceptación del Coautor',
        cumplido: coautorAcepto,
        detalle: coautorAcepto
          ? `${coautor.user.nombres} ${coautor.user.apellidoPaterno} aceptó`
          : coautor.estado === 'RECHAZADO'
            ? 'El coautor rechazó participar'
            : 'Esperando aceptación del coautor',
      })
    }

    // 7. Voucher de pago
    const docVoucher = tesis.documentos.find((d) => d.tipo === 'VOUCHER_PAGO')
    requisitos.push({
      nombre: 'Voucher de Pago',
      cumplido: !!docVoucher,
      detalle: docVoucher
        ? 'Voucher subido'
        : 'Falta subir el voucher de pago de S/. 30.00 (código 277)',
    })

    // 8. Documento sustentatorio (cada tesista debe subir el suyo)
    const docsSustentatorios = tesis.documentos.filter((d) => d.tipo === 'DOCUMENTO_SUSTENTATORIO')
    for (const autor of tesis.autores) {
      const tieneDoc = docsSustentatorios.some((d) => d.uploadedById === autor.userId)
      const nombreAutor = `${autor.user.nombres} ${autor.user.apellidoPaterno}`
      requisitos.push({
        nombre: tesis.autores.length > 1
          ? `Documento Sustentatorio - ${nombreAutor}`
          : 'Documento Sustentatorio',
        cumplido: tieneDoc,
        detalle: tieneDoc
          ? tesis.autores.length > 1
            ? `Documento sustentatorio de ${nombreAutor} subido`
            : 'Documento sustentatorio subido'
          : tesis.autores.length > 1
            ? `Falta documento sustentatorio de ${nombreAutor} (ficha de matrícula, inscripción SUNEDU o constancia de egresado)`
            : 'Falta subir documento sustentatorio (ficha de matrícula, inscripción SUNEDU o constancia de egresado)',
      })
    }

    // Verificar si todos los requisitos están cumplidos
    const requisitosNoCumplidos = requisitos.filter((r) => !r.cumplido)

    if (requisitosNoCumplidos.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se cumplen todos los requisitos para enviar a revisión',
          detalles: requisitosNoCumplidos.map((r) => r.detalle),
          requisitos,
        },
        { status: 400 }
      )
    }

    // Actualizar estado de la tesis
    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: tesisId },
        data: {
          estado: 'EN_REVISION',
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId: tesisId,
          estadoAnterior: 'BORRADOR',
          estadoNuevo: 'EN_REVISION',
          comentario: 'Tesis enviada a revisión por el autor',
          changedById: user.id,
        },
      }),
    ])

    console.log(`[Enviar Tesis] Tesis ${tesisId} enviada a revisión por ${user.id}`)

    // Notificar a usuarios con rol MESA_PARTES
    try {
      const mesaPartesUsers = await prisma.userRole.findMany({
        where: {
          role: { codigo: 'MESA_PARTES' },
          isActive: true,
        },
        select: { userId: true },
      })
      const mesaPartesIds = mesaPartesUsers.map(u => u.userId)
      if (mesaPartesIds.length > 0) {
        await crearNotificacion({
          userId: mesaPartesIds,
          tipo: 'TESIS_EN_REVISION',
          titulo: 'Nueva tesis enviada a revisión',
          mensaje: `Se ha enviado a revisión: "${tesis.titulo}"`,
          enlace: `/mesa-partes/${tesisId}`,
        })
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar mesa de partes:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Tesis enviada a revisión exitosamente',
      data: {
        nuevoEstado: 'EN_REVISION',
      },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/enviar] Error:', error)
    return NextResponse.json(
      { error: 'Error al enviar la tesis a revisión' },
      { status: 500 }
    )
  }
}
