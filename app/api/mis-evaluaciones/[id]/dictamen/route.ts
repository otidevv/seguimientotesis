import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import path from 'path'
import fs from 'fs'
import { EstadoTesis } from '@prisma/client'
import { agregarDiasHabiles, DIAS_HABILES_CORRECCION } from '@/lib/business-days'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/mis-evaluaciones/[id]/dictamen - Presidente sube dictamen
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: thesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es PRESIDENTE del jurado
    const miJurado = await prisma.thesisJury.findFirst({
      where: { thesisId, userId: user.id, isActive: true, tipo: 'PRESIDENTE' },
    })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'Solo el presidente del jurado puede subir el dictamen' },
        { status: 403 }
      )
    }

    const tesis = await prisma.thesis.findUnique({
      where: { id: thesisId, deletedAt: null },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    const estadosEvaluacion = ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME']
    if (!estadosEvaluacion.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'La tesis no está en estado de evaluacion' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const resultado = formData.get('resultado') as string
    const observaciones = formData.get('observaciones') as string | null
    const archivoDictamen = formData.get('dictamen') as File | null

    if (!resultado || !['APROBADO', 'OBSERVADO'].includes(resultado)) {
      return NextResponse.json(
        { error: 'Resultado invalido' },
        { status: 400 }
      )
    }

    if (!archivoDictamen || archivoDictamen.size === 0) {
      return NextResponse.json(
        { error: 'Debe subir el dictamen firmado en PDF' },
        { status: 400 }
      )
    }

    if (archivoDictamen.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      )
    }

    const maxSize = 25 * 1024 * 1024
    if (archivoDictamen.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 25MB' },
        { status: 400 }
      )
    }

    // Guardar el dictamen
    const docDir = path.join(process.cwd(), 'public', 'documentos', 'tesis', thesisId)
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true })
    }

    const timestamp = Date.now()
    const safeFileName = archivoDictamen.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `dictamen_ronda${tesis.rondaActual}_${timestamp}_${safeFileName}`
    const filePath = path.join(docDir, fileName)

    const bytes = await archivoDictamen.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    const dictamenUrl = `/documentos/tesis/${thesisId}/${fileName}`

    // Guardar evaluacion del presidente si no existe
    const evalExistente = await prisma.juryEvaluation.findFirst({
      where: { juryMemberId: miJurado.id, ronda: tesis.rondaActual },
    })

    if (!evalExistente) {
      await prisma.juryEvaluation.create({
        data: {
          thesisId,
          juryMemberId: miJurado.id,
          ronda: tesis.rondaActual,
          resultado: resultado as any,
          observaciones: observaciones?.trim() || null,
          archivoUrl: dictamenUrl,
        },
      })
    }

    // Desactivar versiones anteriores de dictamen
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        esVersionActual: true,
      },
      data: { esVersionActual: false },
    })

    // Guardar documento de dictamen
    const ultimaVersion = await prisma.thesisDocument.findFirst({
      where: { thesisId, tipo: 'DICTAMEN_JURADO' },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    await prisma.thesisDocument.create({
      data: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        nombre: `Dictamen del Jurado - Ronda ${tesis.rondaActual}`,
        descripcion: `Dictamen ${resultado.toLowerCase()} - Ronda ${tesis.rondaActual}`,
        rutaArchivo: dictamenUrl,
        mimeType: 'application/pdf',
        tamano: archivoDictamen.size,
        version: (ultimaVersion?.version || 0) + 1,
        esVersionActual: true,
        uploadedById: user.id,
      },
    })

    // Determinar nuevo estado
    let nuevoEstado: EstadoTesis
    let mensajeHistorial: string

    if (resultado === 'APROBADO') {
      if (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') {
        nuevoEstado = 'APROBADA'
        mensajeHistorial = 'Informe final aprobado por el jurado. Tesis aprobada.'
      } else {
        nuevoEstado = 'PROYECTO_APROBADO'
        mensajeHistorial = 'Proyecto de tesis aprobado por el jurado.'
      }
    } else {
      const fechaLimiteCorreccion = agregarDiasHabiles(new Date(), DIAS_HABILES_CORRECCION)

      if (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') {
        nuevoEstado = 'OBSERVADA_INFORME'
        mensajeHistorial = `Informe final observado por el jurado. El estudiante tiene ${DIAS_HABILES_CORRECCION} días hábiles para corregir.`
      } else {
        nuevoEstado = 'OBSERVADA_JURADO'
        mensajeHistorial = `Proyecto observado por el jurado. El estudiante tiene ${DIAS_HABILES_CORRECCION} días hábiles para corregir.`
      }

      await prisma.thesis.update({
        where: { id: thesisId },
        data: { fechaLimiteCorreccion },
      })
    }

    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: thesisId },
        data: {
          estado: nuevoEstado,
          ...(resultado === 'APROBADO' && nuevoEstado === 'APROBADA' && { fechaAprobacion: new Date() }),
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId,
          estadoAnterior: tesis.estado,
          estadoNuevo: nuevoEstado,
          comentario: mensajeHistorial + (observaciones?.trim() ? ` Observaciones: ${observaciones.trim()}` : ''),
          changedById: user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: resultado === 'APROBADO'
        ? 'Dictamen de aprobacion subido exitosamente'
        : 'Dictamen con observaciones subido exitosamente',
      data: { nuevoEstado },
    })
  } catch (error) {
    console.error('[POST /api/mis-evaluaciones/[id]/dictamen] Error:', error)
    return NextResponse.json({ error: 'Error al subir dictamen' }, { status: 500 })
  }
}
