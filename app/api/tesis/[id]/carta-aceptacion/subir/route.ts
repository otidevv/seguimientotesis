/**
 * API Route: /api/tesis/[id]/carta-aceptacion/subir
 *
 * POST: Sube la carta de aceptación del asesor (sin firmar) temporalmente
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

    // Verificar que la tesis existe y el usuario es asesor de ella
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
        { error: 'Debes aceptar la asesoría antes de subir tu carta' },
        { status: 400 }
      )
    }

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 }
      )
    }

    // Validar que sea PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      )
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 10MB' },
        { status: 400 }
      )
    }

    // Crear directorio para cartas temporales si no existe
    const tipoAsesor = asesorRegistro.tipo === 'PRINCIPAL' ? 'asesor' : 'coasesor'
    const tempDir = path.join(
      process.cwd(),
      'public',
      'documentos',
      'cartas-aceptacion',
      'temp'
    )

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `carta_${tipoAsesor}_${tesisId}_${user.id}_${timestamp}_${safeFileName}`
    const filePath = path.join(tempDir, fileName)

    // Guardar el archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    console.log(`[Carta Aceptación] Archivo subido: ${fileName}`)

    return NextResponse.json({
      success: true,
      message: 'Carta subida correctamente',
      data: {
        fileName,
        filePath: `/documentos/cartas-aceptacion/temp/${fileName}`,
        size: file.size,
        mimeType: file.type,
      },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/carta-aceptacion/subir] Error:', error)
    return NextResponse.json(
      { error: 'Error al subir la carta de aceptación' },
      { status: 500 }
    )
  }
}
