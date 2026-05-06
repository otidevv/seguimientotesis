/**
 * API Route: /api/tesis/[id]/carta-aceptacion/subir
 *
 * POST: Sube la carta de aceptación del asesor como BORRADOR.
 *
 * A diferencia del flujo antiguo (que dejaba el archivo en temp/ sin persistirlo en DB),
 * este flujo crea un ThesisDocument con `esBorrador: true` y `esVersionActual: false`.
 * El borrador se promueve a documento definitivo al llamar a `/registrar` o al completar
 * el flujo de firma digital. Esto permite:
 *   - Subir en un dispositivo y firmar/registrar en otro (persistencia real).
 *   - Recargar la página sin perder el archivo subido.
 *   - Reemplazar automáticamente borradores previos del mismo usuario+tesis+tipo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import { validarPDFContenido } from '@/lib/file-validation'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const BORRADORES_DIR_REL = path.join('documentos', 'cartas-aceptacion', 'borradores')

function getBorradoresDir(): string {
  return path.join(process.cwd(), 'public', BORRADORES_DIR_REL)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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

    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'La tesis tiene una solicitud de desistimiento pendiente. No puedes subir la carta mientras esté en trámite.' },
        { status: 409 }
      )
    }

    const estadosCartaPermitidos = ['BORRADOR', 'EN_REVISION', 'OBSERVADA']
    if (!estadosCartaPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: `No se puede subir la carta en el estado actual de la tesis (${tesis.estado}).` },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 10MB' },
        { status: 400 }
      )
    }

    // Validar magic bytes — `file.type` es falsificable por el cliente.
    const errorContenido = await validarPDFContenido(file)
    if (errorContenido) {
      return NextResponse.json({ error: errorContenido }, { status: 400 })
    }

    const tipoDoc = asesorRegistro.tipo === 'PRINCIPAL'
      ? 'CARTA_ACEPTACION_ASESOR' as const
      : 'CARTA_ACEPTACION_COASESOR' as const
    const tipoAsesorSlug = asesorRegistro.tipo === 'PRINCIPAL' ? 'asesor' : 'coasesor'

    // Reemplazar borrador anterior del mismo (tesis, usuario, tipo): eliminar fila y archivo.
    const borradorPrevio = await prisma.thesisDocument.findFirst({
      where: {
        thesisId: tesisId,
        uploadedById: user.id,
        tipo: tipoDoc,
        esBorrador: true,
      },
    })

    if (borradorPrevio) {
      try {
        const rutaAbs = path.join(process.cwd(), 'public', borradorPrevio.rutaArchivo.replace(/^\//, ''))
        if (fs.existsSync(rutaAbs)) fs.unlinkSync(rutaAbs)
      } catch (err) {
        console.warn('[Carta Aceptación] No se pudo borrar archivo de borrador previo:', err)
      }
      await prisma.thesisDocument.delete({ where: { id: borradorPrevio.id } })
    }

    const borradoresDir = getBorradoresDir()
    if (!fs.existsSync(borradoresDir)) {
      fs.mkdirSync(borradoresDir, { recursive: true })
    }

    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `carta_${tipoAsesorSlug}_${tesisId}_${user.id}_${timestamp}_${safeFileName}`
    const filePath = path.join(borradoresDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    const rutaArchivoRel = `/${BORRADORES_DIR_REL.replace(/\\/g, '/')}/${fileName}`

    const nombreDoc = `Carta de Aceptación ${asesorRegistro.tipo === 'PRINCIPAL' ? 'del Asesor' : 'del Coasesor'}`

    const borrador = await prisma.thesisDocument.create({
      data: {
        thesisId: tesisId,
        tipo: tipoDoc,
        nombre: nombreDoc,
        descripcion: 'Carta subida, pendiente de registrar o firmar digitalmente',
        rutaArchivo: rutaArchivoRel,
        mimeType: 'application/pdf',
        tamano: buffer.length,
        version: 1,
        esVersionActual: false,
        esBorrador: true,
        firmadoDigitalmente: false,
        uploadedById: user.id,
      },
    })

    console.log(`[Carta Aceptación] Borrador creado: ${borrador.id} (${fileName})`)

    return NextResponse.json({
      success: true,
      message: 'Carta subida correctamente',
      data: {
        documentoId: borrador.id,
        fileName,
        filePath: rutaArchivoRel,
        size: buffer.length,
        mimeType: 'application/pdf',
        subidoEn: borrador.createdAt,
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
