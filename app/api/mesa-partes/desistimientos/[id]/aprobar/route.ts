import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { estadoDestinoConCoautor, requiereModificatoria } from '@/lib/desistimiento/transiciones'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'tesis')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'edit')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const form = await request.formData()
    const archivoJurado = form.get('resolucionJuradoModificatoria') as File | null
    const archivoAprobacion = form.get('resolucionAprobacionModificatoria') as File | null

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        thesis: {
          include: {
            autores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true } } },
            },
            asesores: { select: { userId: true } },
            documentos: { where: { esVersionActual: true } },
          },
        },
        thesisAuthor: { include: { user: { select: { nombres: true, apellidoPaterno: true } } } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }

    const resolJurado = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_JURADO')
    const resolAprob = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_APROBACION')

    if (requiereModificatoria(w.estadoTesisAlSolicitar) && resolJurado && !archivoJurado) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de conformación de jurado'
      }, { status: 400 })
    }
    if (resolAprob && w.estadoTesisAlSolicitar === 'PROYECTO_APROBADO' && !archivoAprobacion) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de aprobación de proyecto'
      }, { status: 400 })
    }

    async function persistirArchivo(f: File, prefijo: string): Promise<{ ruta: string; mime: string; size: number; nombre: string }> {
      const dir = path.join(UPLOAD_ROOT, w!.thesisId)
      await mkdir(dir, { recursive: true })
      const buffer = Buffer.from(await f.arrayBuffer())
      const nombreArchivo = `${prefijo}-${randomUUID()}${path.extname(f.name) || '.pdf'}`
      const rutaFisica = path.join(dir, nombreArchivo)
      await writeFile(rutaFisica, buffer)
      return {
        ruta: `/uploads/tesis/${w!.thesisId}/${nombreArchivo}`,
        mime: f.type || 'application/pdf',
        size: buffer.length,
        nombre: f.name,
      }
    }

    const nuevoJurado = archivoJurado ? await persistirArchivo(archivoJurado, 'res-jurado-modif') : null
    const nuevoAprob = archivoAprobacion ? await persistirArchivo(archivoAprobacion, 'res-aprob-modif') : null

    const coautoresActivos = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO'
    )
    const hayCoautor = coautoresActivos.length > 0
    const nuevoPrincipal = hayCoautor ? coautoresActivos[0] : null
    const estadoDestino = hayCoautor ? estadoDestinoConCoautor(w.estadoTesisAlSolicitar) : 'DESISTIDA'

    const nombreDesistente = `${w.thesisAuthor.user.nombres} ${w.thesisAuthor.user.apellidoPaterno}`

    const resolucionPrincipalId = await prisma.$transaction(async (tx) => {
      let resolucionRegistradaId: string | null = null

      if (nuevoJurado && resolJurado) {
        const creado = await tx.thesisDocument.create({
          data: {
            thesisId: w.thesisId,
            uploadedById: user.id,
            tipo: 'RESOLUCION_JURADO',
            nombre: `Modificatoria — ${nuevoJurado.nombre}`,
            rutaArchivo: nuevoJurado.ruta,
            mimeType: nuevoJurado.mime,
            tamano: nuevoJurado.size,
            version: resolJurado.version + 1,
            esVersionActual: true,
            esModificatoria: true,
            reemplazaDocumentoId: resolJurado.id,
          },
        })
        await tx.thesisDocument.update({ where: { id: resolJurado.id }, data: { esVersionActual: false } })
        resolucionRegistradaId = creado.id
      }

      if (nuevoAprob && resolAprob) {
        const creado = await tx.thesisDocument.create({
          data: {
            thesisId: w.thesisId,
            uploadedById: user.id,
            tipo: 'RESOLUCION_APROBACION',
            nombre: `Modificatoria — ${nuevoAprob.nombre}`,
            rutaArchivo: nuevoAprob.ruta,
            mimeType: nuevoAprob.mime,
            tamano: nuevoAprob.size,
            version: resolAprob.version + 1,
            esVersionActual: true,
            esModificatoria: true,
            reemplazaDocumentoId: resolAprob.id,
          },
        })
        await tx.thesisDocument.update({ where: { id: resolAprob.id }, data: { esVersionActual: false } })
        resolucionRegistradaId = resolucionRegistradaId ?? creado.id
      }

      await tx.$executeRawUnsafe(
        `UPDATE thesis_authors SET estado = 'DESISTIDO', orden = 99, fecha_respuesta = NOW(), motivo_rechazo = $1 WHERE id = $2`,
        w.motivoDescripcion,
        w.thesisAuthorId
      )

      if (nuevoPrincipal) {
        await tx.thesisAuthor.update({ where: { id: nuevoPrincipal.id }, data: { orden: 1 } })
      }

      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", fecha_limite_evaluacion = NULL, fecha_limite_correccion = NULL, updated_at = NOW() WHERE id = $2`,
        estadoDestino,
        w.thesisId
      )

      await tx.thesisWithdrawal.update({
        where: { id: w.id },
        data: {
          estadoSolicitud: 'APROBADO',
          aprobadoAt: new Date(),
          aprobadoPorId: user.id,
          resolucionDocumentoId: resolucionRegistradaId,
        },
      })

      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: 'SOLICITUD_DESISTIMIENTO' as any,
          estadoNuevo: estadoDestino as any,
          comentario: hayCoautor
            ? `Desistimiento aprobado de ${nombreDesistente}. ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} asume como autor principal.`
            : `Desistimiento aprobado de ${nombreDesistente}. Tesis dada de baja.`,
          changedById: user.id,
        },
      })

      return resolucionRegistradaId
    })

    await crearNotificacion({
      userId: w.userId,
      tipo: 'DESISTIMIENTO_APROBADO',
      titulo: 'Desistimiento aprobado',
      mensaje: `Mesa de partes aprobó tu solicitud de desistimiento de "${w.thesis.titulo}".`,
      enlace: `/mis-tesis`,
    })

    if (nuevoPrincipal) {
      await crearNotificacion({
        userId: nuevoPrincipal.user.id,
        tipo: 'DESISTIMIENTO_COAUTOR',
        titulo: 'Ahora eres el autor principal',
        mensaje: `${nombreDesistente} desistió. Ahora eres el autor principal de "${w.thesis.titulo}".`,
        enlace: `/mis-tesis/${w.thesisId}`,
      })
    }
    const asesorIds = w.thesis.asesores.map(a => a.userId)
    if (asesorIds.length > 0) {
      await crearNotificacion({
        userId: asesorIds,
        tipo: 'DESISTIMIENTO_APROBADO',
        titulo: 'Cambio en tesis asesorada',
        mensaje: `Desistimiento aprobado en "${w.thesis.titulo}" (tesista: ${nombreDesistente}).`,
        enlace: `/mis-asesorias`,
      })
    }

    return NextResponse.json({
      message: 'Desistimiento aprobado.',
      estadoDestino,
      resolucionDocumentoId: resolucionPrincipalId,
    })
  } catch (error) {
    console.error('[Aprobar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
