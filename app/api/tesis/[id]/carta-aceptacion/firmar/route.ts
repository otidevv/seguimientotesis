/**
 * API Route: /api/tesis/[id]/carta-aceptacion/firmar
 *
 * POST: Inicia el proceso de firma digital de la carta de aceptación.
 * Requiere que exista un ThesisDocument borrador subido previamente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTokenLote, saveLoteParams } from '@/lib/firma-peru/storage'
import type { LoteParams } from '@/lib/firma-peru/types'
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
    const { motivo = 1, apariencia = 1, documentoId } = body as {
      motivo?: number
      apariencia?: number
      documentoId?: string
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
        { error: 'Debes aceptar la asesoría antes de firmar tu carta' },
        { status: 400 }
      )
    }

    const tipoAsesor = asesorRegistro.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR'
    const tipoDocumento =
      asesorRegistro.tipo === 'PRINCIPAL'
        ? 'CARTA_ACEPTACION_ASESOR'
        : 'CARTA_ACEPTACION_COASESOR'

    // Buscar el borrador — por documentoId si se pasó, o el más reciente del usuario.
    const borrador = documentoId
      ? await prisma.thesisDocument.findFirst({
          where: {
            id: documentoId,
            thesisId: tesisId,
            uploadedById: user.id,
            tipo: tipoDocumento,
            esBorrador: true,
          },
        })
      : await prisma.thesisDocument.findFirst({
          where: {
            thesisId: tesisId,
            uploadedById: user.id,
            tipo: tipoDocumento,
            esBorrador: true,
          },
          orderBy: { createdAt: 'desc' },
        })

    if (!borrador) {
      return NextResponse.json(
        { error: 'No hay carta pendiente para firmar. Sube el archivo primero.' },
        { status: 404 }
      )
    }

    // Verificar que el archivo existe físicamente.
    const absPath = path.join(process.cwd(), 'public', borrador.rutaArchivo.replace(/^\//, ''))
    if (!fs.existsSync(absPath)) {
      return NextResponse.json(
        { error: 'El archivo del borrador no fue encontrado. Vuelve a subirlo.' },
        { status: 404 }
      )
    }

    // Path relativo a public/documentos (que es el que usa /lote/[codigo]/descargar).
    // rutaArchivo es algo como "/documentos/cartas-aceptacion/borradores/<file>.pdf";
    // le quitamos el prefijo "/documentos/" para obtener la ruta relativa esperada.
    const rutaRelativaDocumentos = borrador.rutaArchivo.replace(/^\/documentos\//, '')

    const tokenLote = generateTokenLote()
    const archivoId = Date.now()

    const loteParams: LoteParams = {
      archivo_ids: [archivoId],
      archivo_nombres: [rutaRelativaDocumentos],
      motivo,
      apariencia,
      nombre_lote: `Carta de Aceptación - ${tesis.titulo.substring(0, 50)}`,
      fecha: new Date().toISOString(),
      tesisId,
      userId: user.id,
      tipoAsesor,
      tipoDocumento,
      borradorDocumentId: borrador.id,
    }

    saveLoteParams(tokenLote, loteParams)

    console.log(`[Carta Aceptación] Lote de firma creado: ${tokenLote}`)
    console.log(`[Carta Aceptación] Tesis: ${tesisId}, Asesor: ${tipoAsesor}, Borrador: ${borrador.id}`)

    return NextResponse.json({
      success: true,
      message: 'Proceso de firma iniciado',
      data: {
        token_lote: tokenLote,
        tesisId,
        tipoAsesor,
        tipoDocumento,
      },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/carta-aceptacion/firmar] Error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar el proceso de firma' },
      { status: 500 }
    )
  }
}
