import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { estadoDestinoConCoautor, requiereResolucionDesistimiento } from '@/lib/desistimiento/transiciones'
import { invalidarCartasAsesores } from '@/lib/cartas-aceptacion/invalidar'
import { EstadoTesis } from '@prisma/client'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'

// Mismo directorio que /api/tesis/[id]/documentos: public/documentos/tesis/<thesisId>.
// Next.js sirve estáticamente public/ al root — la URL /documentos/tesis/... resuelve.
const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'documentos', 'tesis')

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

    // Scope de facultad
    const esAdmin = user.roles?.some(
      r => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )
    const rolMesaPartes = !esAdmin ? user.roles?.find(
      r => r.role.codigo === 'MESA_PARTES' && r.isActive && r.contextType === 'FACULTAD' && r.contextId
    ) : null

    const form = await request.formData()
    const archivoDesistimiento = form.get('resolucionDesistimiento') as File | null

    const w = await prisma.thesisWithdrawal.findUnique({
      where: { id },
      include: {
        thesis: {
          include: {
            autores: {
              include: { user: { select: { id: true, nombres: true, apellidoPaterno: true } } },
            },
            asesores: { where: { estado: 'ACEPTADO' }, select: { userId: true } },
            documentos: { where: { tipo: 'RESOLUCION_JURADO' }, select: { id: true } },
          },
        },
        thesisAuthor: { include: { user: { select: { nombres: true, apellidoPaterno: true } } } },
      },
    })
    if (!w) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (rolMesaPartes && w.facultadIdSnapshot !== rolMesaPartes.contextId) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    if (w.estadoSolicitud !== 'PENDIENTE') {
      return NextResponse.json({ error: `Estado actual: ${w.estadoSolicitud}` }, { status: 400 })
    }
    // Defensa contra concurrencia: la tesis debe seguir en SOLICITUD_DESISTIMIENTO.
    if (w.thesis.estado !== 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: `Conflicto: la tesis cambió de estado (${w.thesis.estado}). Refresca la página.` },
        { status: 409 }
      )
    }

    // ¿Existe ya una resolución de conformación de jurado para esta tesis?
    // Si existe (en cualquier versión), debe subirse RESOLUCION_DESISTIMIENTO obligatoriamente.
    const tieneResolucionJurado = w.thesis.documentos.length > 0

    if (requiereResolucionDesistimiento(tieneResolucionJurado) && !archivoDesistimiento) {
      return NextResponse.json({
        error: 'Debe subir la resolución de desistimiento (PDF). Es obligatoria porque ya existe la resolución de conformación de jurado.'
      }, { status: 400 })
    }

    // Validación del archivo (si vino)
    const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
    if (archivoDesistimiento) {
      if (archivoDesistimiento.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `Resolución de desistimiento: solo se permiten archivos PDF (recibido: ${archivoDesistimiento.type || 'desconocido'}).` },
          { status: 400 }
        )
      }
      if (archivoDesistimiento.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'Resolución de desistimiento: el archivo excede 25 MB.' },
          { status: 400 }
        )
      }
      if (archivoDesistimiento.size === 0) {
        return NextResponse.json(
          { error: 'Resolución de desistimiento: el archivo está vacío.' },
          { status: 400 }
        )
      }
    }

    let archivoPersistido: { ruta: string; mime: string; size: number; nombre: string } | null = null
    if (archivoDesistimiento) {
      const dir = path.join(UPLOAD_ROOT, w.thesisId)
      await mkdir(dir, { recursive: true })
      const buffer = Buffer.from(await archivoDesistimiento.arrayBuffer())
      const nombreArchivo = `res-desistimiento-${randomUUID()}.pdf`
      const rutaFisica = path.join(dir, nombreArchivo)
      await writeFile(rutaFisica, buffer)
      archivoPersistido = {
        ruta: `/documentos/tesis/${w.thesisId}/${nombreArchivo}`,
        mime: 'application/pdf',
        size: buffer.length,
        // Sanear nombre original para display: eliminar path separators/nulls
        nombre: archivoDesistimiento.name.replace(/[\x00\/\\]/g, '_').slice(0, 200),
      }
    }

    const coautoresActivos = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO'
    )
    // Coautores PENDIENTES cuya invitación debe cancelarse (el inviter desiste)
    const coautoresPendientes = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'PENDIENTE'
    )
    const hayCoautor = coautoresActivos.length > 0
    const nuevoPrincipal = hayCoautor ? coautoresActivos[0] : null
    const estadoDestino: EstadoTesis = hayCoautor
      ? estadoDestinoConCoautor(w.estadoTesisAlSolicitar, tieneResolucionJurado)
      : 'DESISTIDA'

    const nombreDesistente = `${w.thesisAuthor.user.nombres} ${w.thesisAuthor.user.apellidoPaterno}`
    // Rol del desistente antes de la actualización (se usa para redactar
    // notificaciones e historial sin asumir que el receptor cambia de rol).
    const desistenteEraPrincipal = w.thesisAuthor.orden === 1

    const resolucionPrincipalId = await prisma.$transaction(async (tx) => {
      let resolucionRegistradaId: string | null = null

      if (archivoPersistido) {
        const creado = await tx.thesisDocument.create({
          data: {
            thesisId: w.thesisId,
            uploadedById: user.id,
            tipo: 'RESOLUCION_DESISTIMIENTO',
            nombre: archivoPersistido.nombre,
            rutaArchivo: archivoPersistido.ruta,
            mimeType: archivoPersistido.mime,
            tamano: archivoPersistido.size,
            version: 1,
            esVersionActual: true,
            esModificatoria: false,
          },
        })
        resolucionRegistradaId = creado.id
      }

      await tx.$executeRawUnsafe(
        `UPDATE thesis_authors SET estado = 'DESISTIDO', orden = 99, fecha_respuesta = NOW(), motivo_rechazo = $1 WHERE id = $2`,
        w.motivoDescripcion,
        w.thesisAuthorId
      )

      if (nuevoPrincipal) {
        await tx.thesisAuthor.update({ where: { id: nuevoPrincipal.id }, data: { orden: 1 } })
      }

      // Cancelar invitaciones PENDIENTES: el inviter desistió, la invitación queda sin efecto
      for (const pendiente of coautoresPendientes) {
        await tx.thesisAuthor.update({
          where: { id: pendiente.id },
          data: {
            estado: 'RECHAZADO',
            fechaRespuesta: new Date(),
            motivoRechazo: 'Invitación cancelada: el autor principal desistió del proyecto.',
          },
        })
      }

      // Si el estado cambia (retrocede a BORRADOR sin RESOLUCION_JURADO,
      // o pasa a DESISTIDA), reseteamos plazos y ronda. Si el estado se
      // mantiene (con RESOLUCION_JURADO), no tocamos plazos — la evaluación
      // continúa donde estaba.
      if (estadoDestino !== w.estadoTesisAlSolicitar) {
        await tx.$executeRawUnsafe(
          `UPDATE thesis SET estado = $1::"estado_tesis", fecha_limite_evaluacion = NULL, fecha_limite_correccion = NULL, ronda_actual = 0, updated_at = NOW() WHERE id = $2`,
          estadoDestino,
          w.thesisId
        )
      } else {
        // Solo restauramos el estado (estaba en SOLICITUD_DESISTIMIENTO durante el flujo).
        await tx.$executeRawUnsafe(
          `UPDATE thesis SET estado = $1::"estado_tesis", updated_at = NOW() WHERE id = $2`,
          estadoDestino,
          w.thesisId
        )
      }

      // updateMany con where condicional: si otro proceso lo cambió,
      // count === 0 y abortamos la transacción (optimistic locking).
      const updated = await tx.thesisWithdrawal.updateMany({
        where: { id: w.id, estadoSolicitud: 'PENDIENTE' },
        data: {
          estadoSolicitud: 'APROBADO',
          aprobadoAt: new Date(),
          aprobadoPorId: user.id,
          resolucionDocumentoId: resolucionRegistradaId,
        },
      })
      if (updated.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION')
      }

      await tx.thesisStatusHistory.create({
        data: {
          thesisId: w.thesisId,
          estadoAnterior: EstadoTesis.SOLICITUD_DESISTIMIENTO,
          estadoNuevo: estadoDestino,
          comentario: hayCoautor
            ? (desistenteEraPrincipal
                ? `Desistimiento aprobado de ${nombreDesistente} (autor principal). ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} asume como autor principal.`
                : `Desistimiento aprobado de ${nombreDesistente} (coautor). ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} continúa como autor principal.`)
            : `Desistimiento aprobado de ${nombreDesistente}. Tesis dada de baja.`,
          changedById: user.id,
        },
      })

      // Si la tesis continúa con coautor y retrocede a BORRADOR (caso sin RESOLUCION_JURADO),
      // las cartas de aceptación con ambos tesistas quedan obsoletas. Se invalidan para
      // forzar que asesor/coasesor suban una nueva con los datos actuales.
      // Si hay RESOLUCION_JURADO el estado se mantiene y las cartas conservan validez histórica.
      if (hayCoautor && estadoDestino === 'BORRADOR') {
        await invalidarCartasAsesores(
          tx,
          w.thesisId,
          `El tesista ${nombreDesistente} desistió de la tesis "${w.thesis.titulo}". La composición de autores cambió.`,
        )
      }

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
        titulo: desistenteEraPrincipal
          ? 'Ahora eres el autor principal'
          : 'Tu coautor desistió del proyecto',
        mensaje: desistenteEraPrincipal
          ? `${nombreDesistente} (autor principal) desistió. Asumes como autor principal de "${w.thesis.titulo}".`
          : `${nombreDesistente} (coautor) desistió. Continúas solo como autor principal de "${w.thesis.titulo}".`,
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
    if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
      return NextResponse.json(
        { error: 'La solicitud fue modificada por otro proceso. Refresca la página.' },
        { status: 409 }
      )
    }
    console.error('[Aprobar desistimiento]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
