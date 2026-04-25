import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { crearNotificacion } from '@/lib/notificaciones'
import { estadoDestinoConCoautor, requiereModificatoria } from '@/lib/desistimiento/transiciones'
import { invalidarCartasAsesores } from '@/lib/cartas-aceptacion/invalidar'
import { EstadoTesis } from '@prisma/client'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'

// Mismo directorio que /api/tesis/[id]/documentos: public/documentos/tesis/<thesisId>.
// Next.js sirve estáticamente public/ al root — la URL /documentos/tesis/... resuelve.
// Si se cambia a uploads/ externo, la URL pública no resuelve (404).
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
            asesores: { where: { estado: 'ACEPTADO' }, select: { userId: true } },
            documentos: { where: { esVersionActual: true } },
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
    // Si otro proceso la cambió (admin, otro operador), abortar.
    if (w.thesis.estado !== 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: `Conflicto: la tesis cambió de estado (${w.thesis.estado}). Refresca la página.` },
        { status: 409 }
      )
    }

    const resolJurado = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_JURADO')
    const resolAprob = w.thesis.documentos.find(d => d.tipo === 'RESOLUCION_APROBACION')

    // ¿Hay coautor que continúa con la tesis?
    // Si NO hay coautor, la tesis pasa a DESISTIDA (ningún autor la continúa)
    // → no tiene sentido pedir modificatoria de resolución: la tesis se cierra.
    const hayCoautorQueContinua = w.thesis.autores.some(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO'
    )

    if (hayCoautorQueContinua && requiereModificatoria(w.estadoTesisAlSolicitar) && resolJurado && !archivoJurado) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de conformación de jurado'
      }, { status: 400 })
    }
    if (hayCoautorQueContinua && resolAprob && w.estadoTesisAlSolicitar === 'PROYECTO_APROBADO' && !archivoAprobacion) {
      return NextResponse.json({
        error: 'Debe subir la resolución modificatoria de aprobación de proyecto'
      }, { status: 400 })
    }

    // Validación de cada archivo antes de persistir
    const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
    const validarArchivo = (f: File | null, etiqueta: string): string | null => {
      if (!f) return null
      if (f.type !== 'application/pdf') {
        return `${etiqueta}: solo se permiten archivos PDF (recibido: ${f.type || 'desconocido'}).`
      }
      if (f.size > MAX_SIZE_BYTES) {
        return `${etiqueta}: el archivo excede 25 MB.`
      }
      if (f.size === 0) {
        return `${etiqueta}: el archivo está vacío.`
      }
      return null
    }
    const errJurado = validarArchivo(archivoJurado, 'Resolución modificatoria de jurado')
    const errAprob = validarArchivo(archivoAprobacion, 'Resolución modificatoria de aprobación')
    if (errJurado) return NextResponse.json({ error: errJurado }, { status: 400 })
    if (errAprob) return NextResponse.json({ error: errAprob }, { status: 400 })

    async function persistirArchivo(f: File, prefijo: string): Promise<{ ruta: string; mime: string; size: number; nombre: string }> {
      const dir = path.join(UPLOAD_ROOT, w!.thesisId)
      await mkdir(dir, { recursive: true })
      const buffer = Buffer.from(await f.arrayBuffer())
      // Forzar extensión .pdf siempre — ya validamos MIME arriba.
      const nombreArchivo = `${prefijo}-${randomUUID()}.pdf`
      const rutaFisica = path.join(dir, nombreArchivo)
      await writeFile(rutaFisica, buffer)
      return {
        ruta: `/documentos/tesis/${w!.thesisId}/${nombreArchivo}`,
        mime: 'application/pdf',
        size: buffer.length,
        // Sanear nombre original para display: eliminar path separators/nulls
        nombre: f.name.replace(/[\x00\/\\]/g, '_').slice(0, 200),
      }
    }

    const nuevoJurado = archivoJurado ? await persistirArchivo(archivoJurado, 'res-jurado-modif') : null
    const nuevoAprob = archivoAprobacion ? await persistirArchivo(archivoAprobacion, 'res-aprob-modif') : null

    const coautoresActivos = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'ACEPTADO'
    )
    // Coautores PENDIENTES cuya invitación debe cancelarse (el inviter desiste)
    const coautoresPendientes = w.thesis.autores.filter(
      a => a.user.id !== w.userId && a.estado === 'PENDIENTE'
    )
    const hayCoautor = coautoresActivos.length > 0
    const nuevoPrincipal = hayCoautor ? coautoresActivos[0] : null
    const estadoDestino = hayCoautor ? estadoDestinoConCoautor(w.estadoTesisAlSolicitar) : 'DESISTIDA'
    // Si retrocede a ASIGNANDO_JURADOS, limpiar evaluaciones del proyecto y resetear ronda
    // para que CONFIRMAR_JURADOS (que setea rondaActual=1) no colisione con registros existentes
    const debeLimpiarEvaluaciones = estadoDestino === 'ASIGNANDO_JURADOS'

    const nombreDesistente = `${w.thesisAuthor.user.nombres} ${w.thesisAuthor.user.apellidoPaterno}`
    // Rol del desistente antes de la actualización (se usa para redactar
    // notificaciones e historial sin asumir que el receptor cambia de rol).
    const desistenteEraPrincipal = w.thesisAuthor.orden === 1

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

      // Si retrocede a ASIGNANDO_JURADOS: limpiar evaluaciones previas del proyecto
      // y resetear rondaActual para evitar colisión de unique [juryMemberId, ronda]
      if (debeLimpiarEvaluaciones) {
        const juradosProyecto = await tx.thesisJury.findMany({
          where: { thesisId: w.thesisId, fase: 'PROYECTO' },
          select: { id: true },
        })
        if (juradosProyecto.length > 0) {
          await tx.juryEvaluation.deleteMany({
            where: { juryMemberId: { in: juradosProyecto.map(j => j.id) } },
          })
        }
      }

      await tx.$executeRawUnsafe(
        `UPDATE thesis SET estado = $1::"estado_tesis", fecha_limite_evaluacion = NULL, fecha_limite_correccion = NULL, ronda_actual = 0, updated_at = NOW() WHERE id = $2`,
        estadoDestino,
        w.thesisId
      )

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
          estadoNuevo: estadoDestino as EstadoTesis,
          comentario: hayCoautor
            ? (desistenteEraPrincipal
                ? `Desistimiento aprobado de ${nombreDesistente} (autor principal). ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} asume como autor principal.`
                : `Desistimiento aprobado de ${nombreDesistente} (coautor). ${nuevoPrincipal!.user.nombres} ${nuevoPrincipal!.user.apellidoPaterno} continúa como autor principal.`)
            : `Desistimiento aprobado de ${nombreDesistente}. Tesis dada de baja.`,
          changedById: user.id,
        },
      })

      // Si la tesis continúa con el coautor y retrocede a BORRADOR, las cartas de
      // aceptación listadas con ambos tesistas quedan obsoletas. Se invalidan
      // para forzar que asesor/coasesor suban una nueva con los datos actuales.
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
