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

    // Determinar la fase de evaluación según el estado actual
    const faseEvaluacion = tesis.estado === 'EN_EVALUACION_INFORME' ? 'INFORME_FINAL' : 'PROYECTO'

    // Verificar que el usuario es PRESIDENTE del jurado en la fase correcta
    const miJurado = await prisma.thesisJury.findFirst({
      where: { thesisId, userId: user.id, isActive: true, tipo: 'PRESIDENTE', fase: faseEvaluacion },
    })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'Solo el presidente del jurado puede subir el dictamen' },
        { status: 403 }
      )
    }

    // Verificar que TODOS los jurados requeridos ya evaluaron
    const juradosRequeridos = await prisma.thesisJury.findMany({
      where: {
        thesisId,
        isActive: true,
        fase: faseEvaluacion,
        tipo: { in: ['PRESIDENTE', 'VOCAL', 'SECRETARIO'] },
      },
      include: {
        evaluaciones: {
          where: { ronda: tesis.rondaActual },
        },
      },
    })

    const juradosSinEvaluar = juradosRequeridos.filter((j) => j.evaluaciones.length === 0)
    if (juradosSinEvaluar.length > 0) {
      return NextResponse.json(
        { error: `Faltan ${juradosSinEvaluar.length} jurado(s) por evaluar. Todos deben votar antes de subir el dictamen.` },
        { status: 400 }
      )
    }

    // Calcular resultado por unanimidad: todos deben aprobar para que sea APROBADO
    const aprobados = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.resultado === 'APROBADO')
    ).length
    const observados = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.resultado === 'OBSERVADO')
    ).length
    const resultadoMayoria = observados === 0 ? 'APROBADO' : 'OBSERVADO'

    const formData = await request.formData()
    const observaciones = formData.get('observaciones') as string | null
    const archivoDictamen = formData.get('dictamen') as File | null

    // Campos de sustentación (solo para aprobación de informe final)
    const fechaSustentacion = formData.get('fechaSustentacion') as string | null
    const horaSustentacion = formData.get('horaSustentacion') as string | null
    const lugarSustentacion = formData.get('lugarSustentacion') as string | null
    const modalidadSustentacion = formData.get('modalidadSustentacion') as string | null

    // Validar campos de sustentación cuando es aprobación de informe final
    const esAprobacionInformeFinal = resultadoMayoria === 'APROBADO' && faseEvaluacion === 'INFORME_FINAL'
    if (esAprobacionInformeFinal) {
      if (!fechaSustentacion || !horaSustentacion || !lugarSustentacion || !modalidadSustentacion) {
        return NextResponse.json(
          { error: 'Debe completar todos los datos de la sustentación (fecha, hora, lugar y modalidad)' },
          { status: 400 }
        )
      }
      if (!['PRESENCIAL', 'VIRTUAL', 'MIXTA'].includes(modalidadSustentacion)) {
        return NextResponse.json(
          { error: 'Modalidad de sustentación inválida' },
          { status: 400 }
        )
      }
    }

    // El resultado del dictamen es determinado por mayoría, no por el presidente
    const resultado = resultadoMayoria
    const detalleVotacion = `Votacion: ${aprobados} aprobado(s), ${observados} observado(s)`

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
    const fileName = `dictamen_${faseEvaluacion.toLowerCase()}_ronda${tesis.rondaActual}_${timestamp}_${safeFileName}`
    const filePath = path.join(docDir, fileName)

    const bytes = await archivoDictamen.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    const dictamenUrl = `/documentos/tesis/${thesisId}/${fileName}`

    // Desactivar versiones anteriores de dictamen (solo de la misma fase)
    const faseLabelBuscar = faseEvaluacion === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        esVersionActual: true,
        nombre: { contains: faseLabelBuscar },
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
        nombre: `Dictamen del Jurado - ${faseEvaluacion === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'} - Ronda ${tesis.rondaActual}`,
        descripcion: `Dictamen ${resultado.toLowerCase()} - ${faseEvaluacion} - Ronda ${tesis.rondaActual}. ${detalleVotacion}`,
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
        nuevoEstado = 'EN_SUSTENTACION'
        mensajeHistorial = 'Informe final aprobado por el jurado. Sustentación programada.'
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
          ...(resultado === 'APROBADO' && nuevoEstado === 'EN_SUSTENTACION' && {
            fechaAprobacion: new Date(),
            fechaSustentacion: new Date(`${fechaSustentacion}T${horaSustentacion}:00`),
            lugarSustentacion: lugarSustentacion!,
            modalidadSustentacion: modalidadSustentacion as 'PRESENCIAL' | 'VIRTUAL' | 'MIXTA',
          }),
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
        ? `Dictamen de aprobacion subido exitosamente. ${detalleVotacion}`
        : `Dictamen con observaciones subido exitosamente. ${detalleVotacion}`,
      data: { nuevoEstado },
    })
  } catch (error) {
    console.error('[POST /api/mis-evaluaciones/[id]/dictamen] Error:', error)
    return NextResponse.json({ error: 'Error al subir dictamen' }, { status: 500 })
  }
}
