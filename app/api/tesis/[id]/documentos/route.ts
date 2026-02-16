/**
 * API Route: /api/tesis/[id]/documentos
 *
 * POST: Sube un documento de tesis (proyecto, borrador, etc.)
 * GET: Lista los documentos de una tesis
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

// Mapeo de tipos de documento del frontend al enum de Prisma
const TIPO_DOCUMENTO_MAP: Record<string, string> = {
  'PROYECTO_TESIS': 'PROYECTO',
  'PROYECTO': 'PROYECTO',
  'BORRADOR': 'BORRADOR',
  'DOCUMENTO_FINAL': 'DOCUMENTO_FINAL',
  'ACTA_SUSTENTACION': 'ACTA_SUSTENTACION',
  'CERTIFICADO': 'CERTIFICADO',
  'ANEXO': 'ANEXO',
  'CARTA_ACEPTACION_ASESOR': 'CARTA_ACEPTACION_ASESOR',
  'CARTA_ACEPTACION_COASESOR': 'CARTA_ACEPTACION_COASESOR',
  'VOUCHER_PAGO': 'VOUCHER_PAGO',
  'DOCUMENTO_SUSTENTATORIO': 'DOCUMENTO_SUSTENTATORIO',
  'DICTAMEN_JURADO': 'DICTAMEN_JURADO',
  'RESOLUCION_APROBACION': 'RESOLUCION_APROBACION',
  'REPORTE_TURNITIN': 'REPORTE_TURNITIN',
  'INFORME_FINAL_DOC': 'INFORME_FINAL_DOC',
  'VOUCHER_PAGO_INFORME': 'VOUCHER_PAGO_INFORME',
  'ACTA_VERIFICACION_ASESOR': 'ACTA_VERIFICACION_ASESOR',
  'OTRO': 'OTRO',
}

// Nombres legibles para cada tipo de documento
const TIPO_DOCUMENTO_NOMBRES: Record<string, string> = {
  'PROYECTO': 'Proyecto de Tesis',
  'BORRADOR': 'Borrador',
  'DOCUMENTO_FINAL': 'Documento Final',
  'ACTA_SUSTENTACION': 'Acta de Sustentacion',
  'CERTIFICADO': 'Certificado',
  'ANEXO': 'Anexo',
  'CARTA_ACEPTACION_ASESOR': 'Carta de Aceptacion del Asesor',
  'CARTA_ACEPTACION_COASESOR': 'Carta de Aceptacion del Coasesor',
  'VOUCHER_PAGO': 'Voucher de Pago',
  'DOCUMENTO_SUSTENTATORIO': 'Documento Sustentatorio',
  'DICTAMEN_JURADO': 'Dictamen del Jurado',
  'RESOLUCION_APROBACION': 'Resolucion de Aprobacion',
  'REPORTE_TURNITIN': 'Reporte de Turnitin',
  'INFORME_FINAL_DOC': 'Informe Final',
  'VOUCHER_PAGO_INFORME': 'Voucher de Pago - Informe Final',
  'ACTA_VERIFICACION_ASESOR': 'Acta de Verificación de Similitud del Asesor',
  'OTRO': 'Otro Documento',
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la tesis existe
    const tesis = await prisma.thesis.findUnique({
      where: { id: tesisId, deletedAt: null },
      include: {
        autores: {
          where: { userId: user.id },
        },
        asesores: {
          where: { userId: user.id },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es autor, asesor, o tiene rol administrativo
    const esAutor = tesis.autores.length > 0
    const esAsesor = tesis.asesores.length > 0
    const esAdminOMesaPartes = user.roles?.some(
      (r) => ['MESA_PARTES', 'ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    if (!esAutor && !esAsesor && !esAdminOMesaPartes) {
      return NextResponse.json(
        { error: 'No tienes permiso para subir documentos a esta tesis' },
        { status: 403 }
      )
    }

    // Verificar que el participante ha aceptado su invitación antes de permitir subir documentos
    if (esAutor && !esAdminOMesaPartes) {
      const registroAutor = tesis.autores[0]
      if (registroAutor.estado !== 'ACEPTADO') {
        return NextResponse.json(
          { error: 'Debes aceptar la invitación antes de subir documentos' },
          { status: 400 }
        )
      }
    }
    if (esAsesor && !esAdminOMesaPartes) {
      const registroAsesor = tesis.asesores[0]
      if (registroAsesor.estado !== 'ACEPTADO') {
        return NextResponse.json(
          { error: 'Debes aceptar la asesoría antes de subir documentos' },
          { status: 400 }
        )
      }
    }

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tipoDocumentoRaw = formData.get('tipoDocumento') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo' },
        { status: 400 }
      )
    }

    if (!tipoDocumentoRaw) {
      return NextResponse.json(
        { error: 'Se requiere especificar el tipo de documento' },
        { status: 400 }
      )
    }

    // Mapear el tipo de documento
    const tipoDocumento = TIPO_DOCUMENTO_MAP[tipoDocumentoRaw]
    if (!tipoDocumento) {
      return NextResponse.json(
        { error: `Tipo de documento no válido: ${tipoDocumentoRaw}` },
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

    // Validar tamaño (máx 25MB para documentos de tesis)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 25MB' },
        { status: 400 }
      )
    }

    // Crear directorio para documentos si no existe
    const docDir = path.join(
      process.cwd(),
      'public',
      'documentos',
      'tesis',
      tesisId
    )

    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${tipoDocumento.toLowerCase()}_${timestamp}_${safeFileName}`
    const filePath = path.join(docDir, fileName)

    // Guardar el archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    // Para PROYECTO e INFORME_FINAL_DOC en estados OBSERVADA:
    // Si ya se subio un documento corregido en esta ronda (despues de la observacion),
    // reemplazarlo en vez de crear una nueva version
    const esDocCorreccion = ['PROYECTO', 'INFORME_FINAL_DOC'].includes(tipoDocumento)
      && ['OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(tesis.estado)

    let reemplazandoBorradorCorreccion = false
    let versionReemplazo: number | null = null

    if (esDocCorreccion) {
      // Buscar la fecha de la ultima observacion
      const ultimaObservacion = await prisma.thesisStatusHistory.findFirst({
        where: {
          thesisId: tesisId,
          estadoNuevo: tesis.estado as any,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (ultimaObservacion) {
        // Buscar si ya hay un documento corregido subido despues de la observacion
        const docCorreccionExistente = await prisma.thesisDocument.findFirst({
          where: {
            thesisId: tesisId,
            tipo: tipoDocumento as any,
            esVersionActual: true,
            createdAt: { gt: ultimaObservacion.createdAt },
          },
        })

        if (docCorreccionExistente) {
          reemplazandoBorradorCorreccion = true
          versionReemplazo = docCorreccionExistente.version

          // Eliminar el archivo fisico anterior
          const archivoAnterior = path.join(process.cwd(), 'public', docCorreccionExistente.rutaArchivo)
          if (fs.existsSync(archivoAnterior)) {
            fs.unlinkSync(archivoAnterior)
          }

          // Eliminar el registro anterior
          await prisma.thesisDocument.delete({
            where: { id: docCorreccionExistente.id },
          })
        }
      }
    }

    if (!reemplazandoBorradorCorreccion) {
      // Desactivar versiones anteriores del mismo tipo
      // Para DOCUMENTO_SUSTENTATORIO, solo desactivar las versiones del mismo usuario
      // ya que cada tesista sube su propio documento sustentatorio
      await prisma.thesisDocument.updateMany({
        where: {
          thesisId: tesisId,
          tipo: tipoDocumento as any,
          esVersionActual: true,
          ...(tipoDocumento === 'DOCUMENTO_SUSTENTATORIO' && { uploadedById: user.id }),
        },
        data: {
          esVersionActual: false,
        },
      })
    }

    // Obtener la versión más alta existente
    const ultimaVersion = await prisma.thesisDocument.findFirst({
      where: {
        thesisId: tesisId,
        tipo: tipoDocumento as any,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    })

    // Si estamos reemplazando, usar la misma version; si no, incrementar
    const nuevaVersion = reemplazandoBorradorCorreccion && versionReemplazo
      ? versionReemplazo
      : (ultimaVersion?.version || 0) + 1

    // Crear registro del documento en la base de datos
    const documento = await prisma.thesisDocument.create({
      data: {
        thesisId: tesisId,
        tipo: tipoDocumento as any,
        nombre: TIPO_DOCUMENTO_NOMBRES[tipoDocumento] || file.name,
        descripcion: `${TIPO_DOCUMENTO_NOMBRES[tipoDocumento]} - Versión ${nuevaVersion}`,
        rutaArchivo: `/documentos/tesis/${tesisId}/${fileName}`,
        mimeType: file.type,
        tamano: file.size,
        version: nuevaVersion,
        esVersionActual: true,
        uploadedById: user.id,
      },
    })

    console.log(`[Documentos Tesis] Documento subido: ${fileName} (${tipoDocumento})`)

    return NextResponse.json({
      success: true,
      message: 'Documento subido exitosamente',
      data: {
        id: documento.id,
        nombre: documento.nombre,
        tipo: documento.tipo,
        rutaArchivo: documento.rutaArchivo,
        tamano: documento.tamano,
        version: documento.version,
      },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/documentos] Error:', error)
    return NextResponse.json(
      { error: 'Error al subir el documento' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la tesis existe
    const tesis = await prisma.thesis.findUnique({
      where: { id: tesisId, deletedAt: null },
      include: {
        autores: {
          where: { userId: user.id },
        },
        asesores: {
          where: { userId: user.id },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es autor o asesor de la tesis
    const esAutor = tesis.autores.length > 0
    const esAsesor = tesis.asesores.length > 0

    if (!esAutor && !esAsesor) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver los documentos de esta tesis' },
        { status: 403 }
      )
    }

    // Obtener documentos
    const documentos = await prisma.thesisDocument.findMany({
      where: {
        thesisId: tesisId,
        esVersionActual: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        tipo: true,
        nombre: true,
        descripcion: true,
        rutaArchivo: true,
        mimeType: true,
        tamano: true,
        version: true,
        firmadoDigitalmente: true,
        fechaFirma: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: documentos,
    })
  } catch (error) {
    console.error('[GET /api/tesis/[id]/documentos] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener los documentos' },
      { status: 500 }
    )
  }
}
