/**
 * API Route: /api/tesis/[id]/carta-aceptacion/registrar
 *
 * POST: Registra la carta de aceptación subida directamente (sin firma digital)
 * Se usa cuando el asesor ya tiene la carta firmada físicamente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

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

    const body = await request.json()
    const { fileName } = body

    if (!fileName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del archivo' },
        { status: 400 }
      )
    }

    // Verificar que la tesis existe y el usuario es asesor
    const tesis = await prisma.thesis.findUnique({
      where: { id: tesisId, deletedAt: null },
      include: {
        asesores: {
          where: { userId: user.id },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    const asesorRegistro = tesis.asesores[0]

    if (!asesorRegistro) {
      return NextResponse.json(
        { error: 'No eres asesor de esta tesis' },
        { status: 403 }
      )
    }

    if (asesorRegistro.estado !== 'ACEPTADO') {
      return NextResponse.json(
        { error: 'Debes aceptar la asesoría antes de registrar tu carta' },
        { status: 400 }
      )
    }

    // Verificar que el archivo temporal existe
    const tempPath = path.join(
      process.cwd(),
      'public',
      'documentos',
      'cartas-aceptacion',
      'temp',
      fileName
    )

    if (!fs.existsSync(tempPath)) {
      return NextResponse.json(
        { error: 'El archivo no fue encontrado. Vuelve a subirlo.' },
        { status: 404 }
      )
    }

    // Mover de temp a directorio final
    const tipoAsesor = asesorRegistro.tipo === 'PRINCIPAL' ? 'asesor' : 'coasesor'
    const finalDir = path.join(
      process.cwd(),
      'public',
      'documentos',
      'cartas-aceptacion'
    )

    const destFileName = `carta_${tipoAsesor}_${tesisId}_${Date.now()}.pdf`
    const destPath = path.join(finalDir, destFileName)

    fs.copyFileSync(tempPath, destPath)

    // Leer tamaño
    const stats = fs.statSync(destPath)

    // Determinar tipo de documento
    const tipoDoc = asesorRegistro.tipo === 'PRINCIPAL'
      ? 'CARTA_ACEPTACION_ASESOR' as const
      : 'CARTA_ACEPTACION_COASESOR' as const

    // Desactivar versiones anteriores
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId: tesisId,
        tipo: tipoDoc,
        esVersionActual: true,
      },
      data: {
        esVersionActual: false,
      },
    })

    // Registrar en DB sin firma digital
    await prisma.thesisDocument.create({
      data: {
        thesisId: tesisId,
        tipo: tipoDoc,
        nombre: `Carta de Aceptación ${asesorRegistro.tipo === 'PRINCIPAL' ? 'del Asesor' : 'del Coasesor'}`,
        descripcion: 'Carta de aceptación registrada (firmada físicamente)',
        rutaArchivo: `/documentos/cartas-aceptacion/${destFileName}`,
        mimeType: 'application/pdf',
        tamano: stats.size,
        version: 1,
        esVersionActual: true,
        firmadoDigitalmente: false,
        uploadedById: user.id,
      },
    })

    // Eliminar archivo temporal
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // No es crítico si no se puede borrar
    }

    console.log(`[Carta Aceptación] Carta registrada sin firma digital: ${destFileName}`)

    return NextResponse.json({
      success: true,
      message: 'Carta de aceptación registrada correctamente',
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/carta-aceptacion/registrar] Error:', error)
    return NextResponse.json(
      { error: 'Error al registrar la carta de aceptación' },
      { status: 500 }
    )
  }
}
