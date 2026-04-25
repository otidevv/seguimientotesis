/**
 * API Route: /api/tesis/[id]/carta-aceptacion/registrar
 *
 * POST: Promueve un ThesisDocument borrador a carta de aceptación definitiva (sin firma digital).
 * Se usa cuando el asesor ya tiene la carta firmada físicamente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearNotificacion } from '@/lib/notificaciones'
import { sendEmailByFaculty, emailTemplates } from '@/lib/email'
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

    const tesis = await prisma.thesis.findUnique({
      where: { id: tesisId, deletedAt: null },
      include: {
        asesores: {
          where: { userId: user.id },
        },
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
                  select: { nombre: true, codigo: true },
                },
              },
            },
          },
          orderBy: { orden: 'asc' },
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

    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'La tesis tiene una solicitud de desistimiento pendiente. No puedes registrar la carta mientras esté en trámite.' },
        { status: 409 }
      )
    }

    const estadosCartaPermitidos = ['BORRADOR', 'EN_REVISION', 'OBSERVADA']
    if (!estadosCartaPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: `No se puede registrar la carta en el estado actual de la tesis (${tesis.estado}).` },
        { status: 400 }
      )
    }

    const tipoDoc = asesorRegistro.tipo === 'PRINCIPAL'
      ? 'CARTA_ACEPTACION_ASESOR' as const
      : 'CARTA_ACEPTACION_COASESOR' as const
    const tipoAsesor = asesorRegistro.tipo === 'PRINCIPAL' ? 'asesor' : 'coasesor'

    // Buscar borrador — preferir documentoId explícito, si no el más reciente.
    const body = await request.json().catch(() => ({})) as { documentoId?: string }
    const borrador = body.documentoId
      ? await prisma.thesisDocument.findFirst({
          where: {
            id: body.documentoId,
            thesisId: tesisId,
            uploadedById: user.id,
            tipo: tipoDoc,
            esBorrador: true,
          },
        })
      : await prisma.thesisDocument.findFirst({
          where: {
            thesisId: tesisId,
            uploadedById: user.id,
            tipo: tipoDoc,
            esBorrador: true,
          },
          orderBy: { createdAt: 'desc' },
        })

    if (!borrador) {
      return NextResponse.json(
        { error: 'No hay carta pendiente para registrar. Sube el archivo primero.' },
        { status: 404 }
      )
    }

    const borradorAbsPath = path.join(process.cwd(), 'public', borrador.rutaArchivo.replace(/^\//, ''))

    if (!fs.existsSync(borradorAbsPath)) {
      return NextResponse.json(
        { error: 'El archivo del borrador no fue encontrado. Vuelve a subirlo.' },
        { status: 404 }
      )
    }

    // Mover borrador a carpeta final.
    const finalDir = path.join(process.cwd(), 'public', 'documentos', 'cartas-aceptacion')
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true })
    }

    const destFileName = `carta_${tipoAsesor}_${tesisId}_${Date.now()}.pdf`
    const destAbsPath = path.join(finalDir, destFileName)
    fs.copyFileSync(borradorAbsPath, destAbsPath)
    const stats = fs.statSync(destAbsPath)

    // Desactivar versiones anteriores del mismo tipo (distintas del propio borrador).
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId: tesisId,
        tipo: tipoDoc,
        esVersionActual: true,
        id: { not: borrador.id },
      },
      data: {
        esVersionActual: false,
      },
    })

    // Promover el borrador a documento definitivo.
    await prisma.thesisDocument.update({
      where: { id: borrador.id },
      data: {
        esBorrador: false,
        esVersionActual: true,
        firmadoDigitalmente: false,
        rutaArchivo: `/documentos/cartas-aceptacion/${destFileName}`,
        tamano: stats.size,
        descripcion: 'Carta de aceptación registrada (firmada físicamente)',
      },
    })

    // Eliminar archivo del borrador.
    try {
      fs.unlinkSync(borradorAbsPath)
    } catch {
      // no crítico
    }

    console.log(`[Carta Aceptación] Borrador ${borrador.id} promovido a registrado: ${destFileName}`)

    // === NOTIFICACIONES ===
    const asesorNombre = `${user.nombres} ${user.apellidoPaterno} ${(user as any).apellidoMaterno || ''}`.trim()
    const tipoAsesorTexto = asesorRegistro.tipo === 'PRINCIPAL' ? 'asesor' : 'co-asesor'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const primerAutor = tesis.autores[0]
    const facultad = primerAutor?.studentCareer?.facultad
    const facultadCodigo = facultad?.codigo || 'FI'
    const facultadNombre = facultad?.nombre || 'Facultad'

    const autorIds = tesis.autores.filter(a => a.estado === 'ACEPTADO').map(a => a.user.id)
    if (autorIds.length > 0) {
      try {
        await crearNotificacion({
          userId: autorIds,
          tipo: 'CARTA_ACEPTACION_REGISTRADA',
          titulo: 'Carta de aceptacion registrada',
          mensaje: `El ${tipoAsesorTexto} ${asesorNombre} ha registrado su carta de aceptacion para: "${tesis.titulo}"`,
          enlace: `/mis-tesis/${tesisId}`,
        })
      } catch (notifError) {
        console.error('[Notificacion] Error al notificar autores:', notifError)
      }
    }

    for (const autor of tesis.autores.filter(a => a.estado === 'ACEPTADO')) {
      if (autor.user?.email) {
        try {
          const nombreAutor = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
          const tesisUrl = `${appUrl}/mis-tesis/${tesisId}`
          const template = emailTemplates.advisorLetterRegistered(
            nombreAutor,
            asesorNombre,
            tipoAsesorTexto,
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
          console.log(`[Email] Notificacion carta registrada enviada a: ${autor.user.email}`)
        } catch (emailError) {
          console.error(`[Email] Error al notificar ${autor.user.email}:`, emailError)
        }
      }
    }

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
