/**
 * API Route: /api/tesis/[id]/carta-aceptacion/firmar
 *
 * POST: Inicia el proceso de firma digital de la carta de aceptación
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTokenLote, saveLoteParams } from '@/lib/firma-peru/storage'
import type { LoteParams } from '@/lib/firma-peru/types'

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
    const { fileName, motivo = 1, apariencia = 1 } = body

    if (!fileName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del archivo a firmar' },
        { status: 400 }
      )
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
        { error: 'Debes aceptar la asesoría antes de firmar tu carta' },
        { status: 400 }
      )
    }

    // Generar token único para este lote de firma
    const tokenLote = generateTokenLote()

    // Determinar el tipo de documento según el tipo de asesor
    const tipoAsesor = asesorRegistro.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR'
    const tipoDocumento =
      asesorRegistro.tipo === 'PRINCIPAL'
        ? 'CARTA_ACEPTACION_ASESOR'
        : 'CARTA_ACEPTACION_COASESOR'

    // Crear un ID numérico único basado en timestamp para Firma Perú
    const archivoId = Date.now()

    // Guardar parámetros del lote con metadata extendida para el proceso de firma
    const loteParams: LoteParams = {
      archivo_ids: [archivoId],
      archivo_nombres: [`cartas-aceptacion/temp/${fileName}`],
      motivo,
      apariencia,
      nombre_lote: `Carta de Aceptación - ${tesis.titulo.substring(0, 50)}`,
      fecha: new Date().toISOString(),
      // Campos extendidos para identificar el documento de tesis
      tesisId,
      userId: user.id,
      tipoAsesor,
      tipoDocumento,
    }

    saveLoteParams(tokenLote, loteParams)

    console.log(`[Carta Aceptación] Lote de firma creado: ${tokenLote}`)
    console.log(`[Carta Aceptación] Tesis: ${tesisId}, Asesor: ${tipoAsesor}`)

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
