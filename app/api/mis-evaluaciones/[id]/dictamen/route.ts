import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import path from 'path'
import fs from 'fs'
import { EstadoTesis } from '@prisma/client'
import { agregarDiasHabiles, DIAS_HABILES_CORRECCION } from '@/lib/business-days'
import { crearNotificacion } from '@/lib/notificaciones'
import { sendEmailByFaculty, emailTemplates } from '@/lib/email'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/mis-evaluaciones/[id]/dictamen - Presidente sube dictamen
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: thesisId } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const tesis = await prisma.thesis.findUnique({
      where: { id: thesisId, deletedAt: null },
    })

    if (!tesis) {
      return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
    }

    if (tesis.estado === 'SOLICITUD_DESISTIMIENTO') {
      return NextResponse.json(
        { error: 'La tesis tiene una solicitud de desistimiento pendiente. No puedes emitir dictamen hasta que se resuelva.' },
        { status: 409 }
      )
    }
    const estadosEvaluacion = ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME']
    if (!estadosEvaluacion.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'La tesis no está en estado de evaluacion' },
        { status: 400 }
      )
    }

    // Determinar la fase de evaluación según el estado actual
    const faseEvaluacion = tesis.estado === 'EN_EVALUACION_INFORME' ? 'INFORME_FINAL' : 'PROYECTO'

    // Verificar que el usuario es PRESIDENTE del jurado en la fase correcta
    const miJurado = await prisma.thesisJury.findFirst({
      where: { thesisId, userId: user.id, isActive: true, tipo: 'PRESIDENTE', fase: faseEvaluacion },
    })

    if (!miJurado) {
      return NextResponse.json(
        { error: 'Solo el presidente del jurado puede subir el dictamen' },
        { status: 403 }
      )
    }

    // Verificar que TODOS los jurados requeridos ya evaluaron
    const juradosRequeridos = await prisma.thesisJury.findMany({
      where: {
        thesisId,
        isActive: true,
        fase: faseEvaluacion,
        tipo: { in: ['PRESIDENTE', 'VOCAL', 'SECRETARIO'] },
      },
      include: {
        evaluaciones: {
          where: { ronda: tesis.rondaActual },
        },
      },
    })

    const juradosSinEvaluar = juradosRequeridos.filter((j) => j.evaluaciones.length === 0)
    if (juradosSinEvaluar.length > 0) {
      return NextResponse.json(
        { error: `Faltan ${juradosSinEvaluar.length} jurado(s) por evaluar. Todos deben votar antes de subir el dictamen.` },
        { status: 400 }
      )
    }

    // Calcular resultado por unanimidad: todos deben aprobar para que sea APROBADO
    const aprobados = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.resultado === 'APROBADO')
    ).length
    const observados = juradosRequeridos.filter((j) =>
      j.evaluaciones.some((e) => e.resultado === 'OBSERVADO')
    ).length
    const resultadoMayoria = observados === 0 ? 'APROBADO' : 'OBSERVADO'

    const formData = await request.formData()
    const observaciones = formData.get('observaciones') as string | null
    const archivoDictamen = formData.get('dictamen') as File | null

    // Campos de sustentación (solo para aprobación de informe final)
    const fechaSustentacion = formData.get('fechaSustentacion') as string | null
    const horaSustentacion = formData.get('horaSustentacion') as string | null
    const lugarSustentacion = formData.get('lugarSustentacion') as string | null
    const modalidadSustentacion = formData.get('modalidadSustentacion') as string | null

    // Validar campos de sustentación cuando es aprobación de informe final
    const esAprobacionInformeFinal = resultadoMayoria === 'APROBADO' && faseEvaluacion === 'INFORME_FINAL'
    if (esAprobacionInformeFinal) {
      if (!fechaSustentacion || !horaSustentacion || !lugarSustentacion || !modalidadSustentacion) {
        return NextResponse.json(
          { error: 'Debe completar todos los datos de la sustentación (fecha, hora, lugar y modalidad)' },
          { status: 400 }
        )
      }
      if (!['PRESENCIAL', 'VIRTUAL', 'MIXTA'].includes(modalidadSustentacion)) {
        return NextResponse.json(
          { error: 'Modalidad de sustentación inválida' },
          { status: 400 }
        )
      }

      // Verificar conflictos de horario antes de programar
      const DURACION_SUSTENTACION_MS = 2 * 60 * 60 * 1000 // 2 horas
      const inicioNueva = new Date(`${fechaSustentacion}T${horaSustentacion}:00`)
      const finNueva = new Date(inicioNueva.getTime() + DURACION_SUSTENTACION_MS)

      const inicioDia = new Date(`${fechaSustentacion}T00:00:00`)
      const finDia = new Date(`${fechaSustentacion}T23:59:59`)

      const sustentacionesDelDia = await prisma.thesis.findMany({
        where: {
          deletedAt: null,
          id: { not: thesisId },
          estado: { in: ['EN_SUSTENTACION', 'SUSTENTADA'] },
          fechaSustentacion: { gte: inicioDia, lte: finDia },
        },
        select: {
          titulo: true,
          fechaSustentacion: true,
          lugarSustentacion: true,
          jurados: {
            where: { isActive: true },
            select: { userId: true, user: { select: { nombres: true, apellidoPaterno: true } } },
          },
        },
      })

      // Obtener jurados de la tesis actual
      const juradosActuales = await prisma.thesisJury.findMany({
        where: { thesisId, isActive: true },
        select: { userId: true },
      })
      const juradoIds = juradosActuales.map(j => j.userId)

      for (const sust of sustentacionesDelDia) {
        if (!sust.fechaSustentacion) continue
        const inicioExistente = new Date(sust.fechaSustentacion)
        const finExistente = new Date(inicioExistente.getTime() + DURACION_SUSTENTACION_MS)

        const haySolapamiento = inicioNueva < finExistente && finNueva > inicioExistente
        if (!haySolapamiento) continue

        // Conflicto por lugar
        if (sust.lugarSustentacion?.toLowerCase().trim() === lugarSustentacion.toLowerCase().trim()) {
          const horaIni = inicioExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
          const horaFn = finExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
          return NextResponse.json(
            { error: `Conflicto de horario: El lugar "${lugarSustentacion}" ya tiene una sustentación programada de ${horaIni} a ${horaFn} ("${sust.titulo.substring(0, 50)}...")` },
            { status: 409 }
          )
        }

        // Conflicto por jurado
        for (const jurado of sust.jurados) {
          if (juradoIds.includes(jurado.userId)) {
            const horaIni = inicioExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
            const horaFn = finExistente.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
            const nombre = `${jurado.user.nombres} ${jurado.user.apellidoPaterno}`
            return NextResponse.json(
              { error: `Conflicto de horario: El jurado ${nombre} ya tiene otra sustentación de ${horaIni} a ${horaFn}` },
              { status: 409 }
            )
          }
        }
      }
    }

    // El resultado del dictamen es determinado por unanimidad de votos del jurado
    const resultado = resultadoMayoria
    const detalleVotacion = `Votacion: ${aprobados} aprobado(s), ${observados} observado(s)`

    if (!archivoDictamen || archivoDictamen.size === 0) {
      return NextResponse.json(
        { error: 'Debe subir el dictamen firmado en PDF' },
        { status: 400 }
      )
    }

    if (archivoDictamen.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      )
    }

    const maxSize = 25 * 1024 * 1024
    if (archivoDictamen.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo no debe superar los 25MB' },
        { status: 400 }
      )
    }

    // Guardar el dictamen
    const docDir = path.join(process.cwd(), 'public', 'documentos', 'tesis', thesisId)
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true })
    }

    const timestamp = Date.now()
    const safeFileName = archivoDictamen.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `dictamen_${faseEvaluacion.toLowerCase()}_ronda${tesis.rondaActual}_${timestamp}_${safeFileName}`
    const filePath = path.join(docDir, fileName)

    const bytes = await archivoDictamen.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    const dictamenUrl = `/documentos/tesis/${thesisId}/${fileName}`

    // Desactivar versiones anteriores de dictamen (solo de la misma fase)
    const faseLabelBuscar = faseEvaluacion === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'
    await prisma.thesisDocument.updateMany({
      where: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        esVersionActual: true,
        nombre: { contains: faseLabelBuscar },
      },
      data: { esVersionActual: false },
    })

    // Guardar documento de dictamen
    const ultimaVersion = await prisma.thesisDocument.findFirst({
      where: { thesisId, tipo: 'DICTAMEN_JURADO' },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    await prisma.thesisDocument.create({
      data: {
        thesisId,
        tipo: 'DICTAMEN_JURADO',
        nombre: `Dictamen del Jurado - ${faseEvaluacion === 'INFORME_FINAL' ? 'Informe Final' : 'Proyecto'} - Ronda ${tesis.rondaActual}`,
        descripcion: `Dictamen ${resultado.toLowerCase()} - ${faseEvaluacion} - Ronda ${tesis.rondaActual}. ${detalleVotacion}`,
        rutaArchivo: dictamenUrl,
        mimeType: 'application/pdf',
        tamano: archivoDictamen.size,
        version: (ultimaVersion?.version || 0) + 1,
        esVersionActual: true,
        uploadedById: user.id,
      },
    })

    // Determinar nuevo estado
    let nuevoEstado: EstadoTesis
    let mensajeHistorial: string

    // fechaLimiteCorreccion se setea solo cuando el resultado es observado.
    let fechaLimiteCorreccion: Date | null = null
    if (resultado === 'APROBADO') {
      if (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') {
        nuevoEstado = 'EN_SUSTENTACION'
        mensajeHistorial = 'Informe final aprobado por el jurado. Sustentación programada.'
      } else {
        nuevoEstado = 'PROYECTO_APROBADO'
        mensajeHistorial = 'Proyecto de tesis aprobado por el jurado.'
      }
    } else {
      fechaLimiteCorreccion = agregarDiasHabiles(new Date(), DIAS_HABILES_CORRECCION)

      if (tesis.faseActual === 'INFORME_FINAL' || tesis.estado === 'EN_EVALUACION_INFORME') {
        nuevoEstado = 'OBSERVADA_INFORME'
        mensajeHistorial = `Informe final observado por el jurado. El estudiante tiene ${DIAS_HABILES_CORRECCION} días hábiles para corregir.`
      } else {
        nuevoEstado = 'OBSERVADA_JURADO'
        mensajeHistorial = `Proyecto observado por el jurado. El estudiante tiene ${DIAS_HABILES_CORRECCION} días hábiles para corregir.`
      }
    }

    // Atomicidad: actualizar estado + fechaLimite + history en la misma transacción.
    // Antes `fechaLimiteCorreccion` se escribía fuera de la transacción, y si la
    // transacción fallaba quedaba un registro inconsistente (fecha seteada, estado no).
    await prisma.$transaction([
      prisma.thesis.update({
        where: { id: thesisId },
        data: {
          estado: nuevoEstado,
          ...(fechaLimiteCorreccion && { fechaLimiteCorreccion }),
          ...(resultado === 'APROBADO' && nuevoEstado === 'EN_SUSTENTACION' && {
            fechaAprobacion: new Date(),
            fechaSustentacion: new Date(`${fechaSustentacion}T${horaSustentacion}:00`),
            lugarSustentacion: lugarSustentacion!,
            modalidadSustentacion: modalidadSustentacion as 'PRESENCIAL' | 'VIRTUAL' | 'MIXTA',
          }),
        },
      }),
      prisma.thesisStatusHistory.create({
        data: {
          thesisId,
          estadoAnterior: tesis.estado,
          estadoNuevo: nuevoEstado,
          comentario: mensajeHistorial + (observaciones?.trim() ? ` Observaciones: ${observaciones.trim()}` : ''),
          changedById: user.id,
        },
      }),
    ])

    // Notificar a tesistas y asesores sobre el resultado del dictamen
    try {
      const tesisNotifDictamen = await prisma.thesis.findUnique({
        where: { id: thesisId },
        select: {
          titulo: true,
          autores: {
            include: {
              user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true } },
              studentCareer: {
                select: {
                  facultad: { select: { nombre: true, codigo: true } },
                },
              },
            },
            orderBy: { orden: 'asc' },
          },
          asesores: {
            include: {
              user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true } },
            },
          },
        },
      })

      if (tesisNotifDictamen) {
        const primerAutor = tesisNotifDictamen.autores[0]
        const facultadCodigo = primerAutor?.studentCareer?.facultad?.codigo || 'FI'
        const facultadNombre = primerAutor?.studentCareer?.facultad?.nombre || 'Facultad'
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const faseLabel = faseEvaluacion === 'INFORME_FINAL' ? 'informe final' : 'proyecto'
        const resultadoLabel = resultado === 'APROBADO' ? 'aprobado' : 'observado'

        const tipoNotif = resultado === 'APROBADO' ? 'DICTAMEN_APROBADO' : 'DICTAMEN_OBSERVADO'
        const tituloNotif = resultado === 'APROBADO'
          ? `${faseEvaluacion === 'INFORME_FINAL' ? 'Informe final' : 'Proyecto'} aprobado por el jurado`
          : `${faseEvaluacion === 'INFORME_FINAL' ? 'Informe final' : 'Proyecto'} observado por el jurado`
        const mensajeNotif = `Tu ${faseLabel} "${tesisNotifDictamen.titulo}" fue ${resultadoLabel} por el jurado evaluador`

        // Notificación en sistema a tesistas
        await crearNotificacion({
          userId: tesisNotifDictamen.autores.filter(a => a.estado !== 'DESISTIDO').map(a => a.user.id),
          tipo: tipoNotif,
          titulo: tituloNotif,
          mensaje: mensajeNotif,
          enlace: `/mis-tesis/${thesisId}`,
        })

        // Notificación en sistema a asesores
        await crearNotificacion({
          userId: tesisNotifDictamen.asesores.filter(a => a.estado === 'ACEPTADO').map(a => a.user.id),
          tipo: tipoNotif,
          titulo: tituloNotif,
          mensaje: mensajeNotif,
          enlace: `/mis-asesorias/${thesisId}`,
        })

        // Email a tesistas
        for (const autor of tesisNotifDictamen.autores.filter(a => a.estado !== 'DESISTIDO')) {
          if (!autor.user.email) continue
          try {
            const nombre = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
            const template = emailTemplates.juryDictamen(
              nombre,
              tesisNotifDictamen.titulo,
              resultado,
              faseEvaluacion,
              observaciones?.trim() || '',
              facultadNombre,
              `${appUrl}/mis-tesis/${thesisId}`
            )
            await sendEmailByFaculty(facultadCodigo, {
              to: autor.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            })
            console.log(`[Email] Dictamen ${resultadoLabel} enviado a tesista: ${autor.user.email}`)
          } catch (emailError) {
            console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
          }
        }

        // Email a asesores
        for (const asesor of tesisNotifDictamen.asesores.filter(a => a.estado === 'ACEPTADO')) {
          if (!asesor.user.email) continue
          try {
            const nombre = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno || ''}`.trim()
            const template = emailTemplates.juryDictamen(
              nombre,
              tesisNotifDictamen.titulo,
              resultado,
              faseEvaluacion,
              observaciones?.trim() || '',
              facultadNombre,
              `${appUrl}/mis-asesorias/${thesisId}`
            )
            await sendEmailByFaculty(facultadCodigo, {
              to: asesor.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            })
            console.log(`[Email] Dictamen ${resultadoLabel} enviado a asesor: ${asesor.user.email}`)
          } catch (emailError) {
            console.error(`[Email] Error al notificar asesor ${asesor.user.email}:`, emailError)
          }
        }
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar dictamen:', notifError)
    }

    // Notificar si se programó sustentación
    if (nuevoEstado === 'EN_SUSTENTACION' && fechaSustentacion && horaSustentacion) {
      try {
        const tesisNotif = await prisma.thesis.findUnique({
          where: { id: thesisId },
          select: {
            titulo: true,
            autores: { select: { userId: true } },
            asesores: { select: { userId: true } },
            jurados: {
              where: { isActive: true },
              select: { id: true, userId: true },
            },
          },
        })
        if (tesisNotif) {
          const fechaFormateada = new Date(`${fechaSustentacion}T${horaSustentacion}:00`)
            .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

          // Notificación a autores → /mis-tesis/
          const idsAutores = tesisNotif.autores.map(a => a.userId)
          if (idsAutores.length > 0) {
            await crearNotificacion({
              userId: idsAutores,
              tipo: 'SUSTENTACION_PROGRAMADA',
              titulo: 'Sustentación programada',
              mensaje: `Sustentación programada para ${fechaFormateada}: "${tesisNotif.titulo}"`,
              enlace: `/mis-tesis/${thesisId}`,
            })
          }

          // Notificación a asesores → /mis-asesorias/
          const idsAsesores = tesisNotif.asesores.map(a => a.userId)
          if (idsAsesores.length > 0) {
            await crearNotificacion({
              userId: idsAsesores,
              tipo: 'SUSTENTACION_PROGRAMADA',
              titulo: 'Sustentación programada',
              mensaje: `Sustentación programada para ${fechaFormateada}: "${tesisNotif.titulo}"`,
              enlace: `/mis-asesorias/${thesisId}`,
            })
          }

          // Notificación a jurados → /mis-evaluaciones/ con juradoId
          for (const jurado of tesisNotif.jurados) {
            await crearNotificacion({
              userId: [jurado.userId],
              tipo: 'SUSTENTACION_PROGRAMADA',
              titulo: 'Sustentación programada',
              mensaje: `Sustentación programada para ${fechaFormateada}: "${tesisNotif.titulo}"`,
              enlace: `/mis-evaluaciones/${thesisId}?juradoId=${jurado.id}`,
            })
          }
        }
      } catch (notifError) {
        console.error('[Notificacion] Error al notificar sustentación:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      message: resultado === 'APROBADO'
        ? `Dictamen de aprobacion subido exitosamente. ${detalleVotacion}`
        : `Dictamen con observaciones subido exitosamente. ${detalleVotacion}`,
      data: { nuevoEstado },
    })
  } catch (error) {
    console.error('[POST /api/mis-evaluaciones/[id]/dictamen] Error:', error)
    return NextResponse.json({ error: 'Error al subir dictamen' }, { status: 500 })
  }
}
