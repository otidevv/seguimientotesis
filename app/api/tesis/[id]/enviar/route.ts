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
import { sendEmailByFaculty, emailTemplates } from '@/lib/email'

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
        asesores: {
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
        documentos: {
          where: { esVersionActual: true },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es autor ACTIVO (no desistido) de la tesis
    const esAutor = tesis.autores.some((a) => a.userId === user.id && a.estado !== 'DESISTIDO')
    if (!esAutor) {
      return NextResponse.json(
        { error: 'Solo los autores activos pueden enviar la tesis a revisión' },
        { status: 403 }
      )
    }

    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'Hay una solicitud de desistimiento pendiente. Cancélala o espera la resolución antes de enviar.' },
        { status: 409 }
      )
    }
    // Verificar que la tesis está en estado BORRADOR u OBSERVADA (reenvío tras correcciones)
    if (tesis.estado !== 'BORRADOR' && tesis.estado !== 'OBSERVADA') {
      return NextResponse.json(
        { error: 'Solo se pueden enviar tesis en estado borrador u observada' },
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
          : asesor.estado === 'RECHAZADO'
            ? `${asesor.user.nombres} ${asesor.user.apellidoPaterno} rechazó la asesoría. Debes reemplazarlo antes de enviar.`
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

    // 6. Coautor activo (si existe) aceptó. Los DESISTIDOs son históricos
    // y no deben bloquear el envío del nuevo autor principal.
    const coautor = tesis.autores.find((a) => a.orden > 1 && a.estado !== 'DESISTIDO')
    if (coautor) {
      const coautorAcepto = coautor.estado === 'ACEPTADO'
      requisitos.push({
        nombre: 'Aceptación del Coautor',
        cumplido: coautorAcepto,
        detalle: coautorAcepto
          ? `${coautor.user.nombres} ${coautor.user.apellidoPaterno} aceptó`
          : coautor.estado === 'RECHAZADO'
            ? `${coautor.user.nombres} ${coautor.user.apellidoPaterno} rechazó participar. Debes reemplazarlo o eliminarlo antes de enviar.`
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

    // 8. Documento sustentatorio (cada tesista ACEPTADO debe subir el suyo).
    // PENDIENTE no puede subir docs hasta aceptar; RECHAZADO debe reemplazarse;
    // DESISTIDO es histórico. Solo pedimos sustentatorio de quienes participan.
    const docsSustentatorios = tesis.documentos.filter((d) => d.tipo === 'DOCUMENTO_SUSTENTATORIO')
    const autoresActivos = tesis.autores.filter(a => a.estado === 'ACEPTADO')
    for (const autor of autoresActivos) {
      const tieneDoc = docsSustentatorios.some((d) => d.uploadedById === autor.userId)
      const nombreAutor = `${autor.user.nombres} ${autor.user.apellidoPaterno}`
      requisitos.push({
        nombre: autoresActivos.length > 1
          ? `Documento Sustentatorio - ${nombreAutor}`
          : 'Documento Sustentatorio',
        cumplido: tieneDoc,
        detalle: tieneDoc
          ? autoresActivos.length > 1
            ? `Documento sustentatorio de ${nombreAutor} subido`
            : 'Documento sustentatorio subido'
          : autoresActivos.length > 1
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
          estadoAnterior: tesis.estado,
          estadoNuevo: 'EN_REVISION',
          comentario: tesis.estado === 'OBSERVADA'
            ? 'Tesis reenviada a revisión tras correcciones'
            : 'Tesis enviada a revisión por el autor',
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

    // === ENVIAR CORREOS ELECTRÓNICOS ===
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const primerAutor = tesis.autores[0]
    const facultad = primerAutor?.studentCareer?.facultad
    const facultadCodigo = facultad?.codigo || 'FI'
    const facultadNombre = facultad?.nombre || 'Facultad'

    // Email a cada autor (tesistas)
    for (const autor of tesis.autores.filter(a => a.estado !== 'DESISTIDO')) {
      if (autor.user?.email) {
        try {
          const nombreAutor = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
          const tesisUrl = `${appUrl}/mis-tesis/${tesisId}`
          const template = emailTemplates.thesisSubmittedForReview(
            nombreAutor,
            tesis.titulo,
            facultadNombre,
            tesisUrl
          )
          await sendEmailByFaculty(facultadCodigo, {
            to: autor.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })
          console.log(`[Email] Notificacion revision enviada al tesista: ${autor.user.email}`)
        } catch (emailError) {
          console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
        }
      }
    }

    // Email a cada asesor
    for (const asesor of tesis.asesores.filter(a => a.estado === 'ACEPTADO')) {
      if (asesor.user?.email) {
        try {
          const nombreAsesor = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno || ''}`.trim()
          const nombreTesista = primerAutor?.user
            ? `${primerAutor.user.nombres} ${primerAutor.user.apellidoPaterno} ${primerAutor.user.apellidoMaterno || ''}`.trim()
            : 'Tesista'
          const tesisUrl = `${appUrl}/mis-asesorias/${tesisId}`
          const template = emailTemplates.thesisSubmittedForReviewAdvisor(
            nombreAsesor,
            nombreTesista,
            tesis.titulo,
            facultadNombre,
            tesisUrl
          )
          await sendEmailByFaculty(facultadCodigo, {
            to: asesor.user.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          })
          console.log(`[Email] Notificacion revision enviada al asesor: ${asesor.user.email}`)
        } catch (emailError) {
          console.error(`[Email] Error al notificar asesor ${asesor.user.email}:`, emailError)
        }
      }
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
