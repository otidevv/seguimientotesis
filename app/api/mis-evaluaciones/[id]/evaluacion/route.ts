import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/mis-evaluaciones/[id]/evaluacion - Enviar evaluacion individual
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

    // Verificar que la tesis está en estado de evaluacion
    const estadosEvaluacion = ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME']
    if (!estadosEvaluacion.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'La tesis no está en estado de evaluacion' },
        { status: 400 }
      )
    }

    // Determinar la fase de evaluación según el estado actual
    const faseEvaluacion = tesis.estado === 'EN_EVALUACION_INFORME' ? 'INFORME_FINAL' : 'PROYECTO'

    // Verificar que el usuario es jurado de esta tesis en la fase correcta
    const miJurado = await prisma.thesisJury.findFirst({
      where: { thesisId, userId: user.id, isActive: true, fase: faseEvaluacion },
    })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'No eres jurado de esta tesis en la fase actual' },
        { status: 403 }
      )
    }

    // Verificar que no haya evaluacion previa para esta ronda
    const evalExistente = await prisma.juryEvaluation.findFirst({
      where: {
        juryMemberId: miJurado.id,
        ronda: tesis.rondaActual,
      },
    })

    if (evalExistente) {
      return NextResponse.json(
        { error: 'Ya has enviado tu evaluacion para esta ronda' },
        { status: 400 }
      )
    }

    // Leer datos del form
    const formData = await request.formData()
    const resultado = formData.get('resultado') as string
    const observaciones = formData.get('observaciones') as string | null
    const archivo = formData.get('archivo') as File | null

    if (!resultado || !['APROBADO', 'OBSERVADO'].includes(resultado)) {
      return NextResponse.json(
        { error: 'Resultado invalido. Debe ser APROBADO u OBSERVADO' },
        { status: 400 }
      )
    }

    if (resultado === 'OBSERVADO' && !observaciones?.trim()) {
      return NextResponse.json(
        { error: 'Las observaciones son requeridas cuando el resultado es OBSERVADO' },
        { status: 400 }
      )
    }

    let archivoUrl: string | null = null

    // Guardar archivo si existe
    if (archivo && archivo.size > 0) {
      if (archivo.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Solo se permiten archivos PDF' },
          { status: 400 }
        )
      }

      const maxSize = 25 * 1024 * 1024
      if (archivo.size > maxSize) {
        return NextResponse.json(
          { error: 'El archivo no debe superar los 25MB' },
          { status: 400 }
        )
      }

      const docDir = path.join(
        process.cwd(),
        'public',
        'documentos',
        'tesis',
        thesisId,
        'observaciones'
      )

      if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true })
      }

      const timestamp = Date.now()
      const safeFileName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `eval_${miJurado.tipo.toLowerCase()}_ronda${tesis.rondaActual}_${timestamp}_${safeFileName}`
      const filePath = path.join(docDir, fileName)

      const bytes = await archivo.arrayBuffer()
      const buffer = Buffer.from(bytes)
      fs.writeFileSync(filePath, buffer)

      archivoUrl = `/documentos/tesis/${thesisId}/observaciones/${fileName}`
    }

    // Crear la evaluacion
    await prisma.juryEvaluation.create({
      data: {
        thesisId,
        juryMemberId: miJurado.id,
        ronda: tesis.rondaActual,
        resultado: resultado as any,
        observaciones: observaciones?.trim() || null,
        archivoUrl,
      },
    })

    // Verificar si todos los jurados requeridos ya evaluaron (solo de la fase actual)
    const juradosActivos = await prisma.thesisJury.findMany({
      where: { thesisId, isActive: true, fase: faseEvaluacion },
      include: {
        evaluaciones: {
          where: { ronda: tesis.rondaActual },
        },
      },
    })

    const juradosRequeridos = juradosActivos.filter(
      (j) => ['PRESIDENTE', 'VOCAL', 'SECRETARIO'].includes(j.tipo)
    )
    const juradosQueEvaluaron = juradosRequeridos.filter(
      (j) => j.evaluaciones.length > 0
    )
    const todosEvaluaron = juradosRequeridos.length > 0 &&
      juradosQueEvaluaron.length === juradosRequeridos.length

    let mensaje = 'Evaluacion enviada exitosamente'
    if (todosEvaluaron) {
      mensaje = 'Evaluacion enviada. Todos los jurados han completado su evaluación. El presidente puede subir el dictamen.'
    } else {
      const pendientes = juradosRequeridos.length - juradosQueEvaluaron.length
      mensaje = `Evaluacion enviada exitosamente. Faltan ${pendientes} jurado(s) por evaluar.`
    }

    return NextResponse.json({
      success: true,
      message: mensaje,
      progresoEvaluacion: {
        evaluados: juradosQueEvaluaron.length,
        total: juradosRequeridos.length,
        todosEvaluaron,
      },
    })
  } catch (error) {
    console.error('[POST /api/mis-evaluaciones/[id]/evaluacion] Error:', error)
    return NextResponse.json({ error: 'Error al enviar evaluacion' }, { status: 500 })
  }
}
