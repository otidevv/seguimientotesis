import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { EstadoTesis } from '@prisma/client'
import { agregarDiasHabiles, DIAS_HABILES_EVALUACION } from '@/lib/business-days'
import { crearNotificacion } from '@/lib/notificaciones'
import { sendEmailByFaculty, emailTemplates } from '@/lib/email'

// GET /api/mesa-partes/[id] - Obtener detalle de un proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const tieneAcceso = await checkPermission(user.id, 'mesa-partes', 'view')

    if (!tieneAcceso) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a Mesa de Partes' },
        { status: 403 }
      )
    }

    const tesis = await prisma.thesis.findUnique({
      where: { id, deletedAt: null },
      include: {
        autores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
                email: true,
                numeroDocumento: true,
              },
            },
            studentCareer: {
              select: {
                codigoEstudiante: true,
                carreraNombre: true,
                facultad: {
                  select: {
                    id: true,
                    nombre: true,
                    codigo: true,
                  },
                },
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
        asesores: {
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
          },
        },
        documentos: {
          where: {
            OR: [
              { esVersionActual: true },
              { tipo: 'DICTAMEN_JURADO' },
              { tipo: 'RESOLUCION_JURADO' },
              { tipo: 'RESOLUCION_JURADO_INFORME' },
            ],
          },
          select: {
            id: true,
            tipo: true,
            nombre: true,
            rutaArchivo: true,
            mimeType: true,
            tamano: true,
            firmadoDigitalmente: true,
            fechaFirma: true,
            createdAt: true,
            uploadedBy: {
              select: {
                nombres: true,
                apellidoPaterno: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        jurados: {
          where: { isActive: true },
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
            evaluaciones: {
              orderBy: { ronda: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        historialEstados: {
          include: {
            changedBy: {
              select: {
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Deduplicar dictamenes: el query OR puede traer versiones viejas,
    // mantener solo el mas reciente por fase (Proyecto / Informe Final)
    const dictamenes = tesis.documentos.filter((d) => d.tipo === 'DICTAMEN_JURADO')
    const otrosDocs = tesis.documentos.filter((d) => d.tipo !== 'DICTAMEN_JURADO')

    const dictamenPorFase = new Map<string, typeof dictamenes[0]>()
    for (const doc of dictamenes) {
      const nombre = doc.nombre?.toLowerCase() || ''
      const fase = nombre.includes('informe') ? 'informe' : nombre.includes('proyecto') ? 'proyecto' : 'otro'
      const existente = dictamenPorFase.get(fase)
      if (!existente || doc.createdAt > existente.createdAt) {
        dictamenPorFase.set(fase, doc)
      }
    }

    const documentosDeduplicados = [...otrosDocs, ...dictamenPorFase.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Formatear respuesta
    const primerAutor = tesis.autores[0]

    const resultado = {
      id: tesis.id,
      codigo: tesis.id.slice(-8).toUpperCase(),
      titulo: tesis.titulo,
      resumen: tesis.resumen,
      palabrasClave: tesis.palabrasClave,
      estado: tesis.estado,
      lineaInvestigacion: tesis.lineaInvestigacion,
      voucherFisicoEntregado: tesis.voucherFisicoEntregado,
      voucherFisicoFecha: tesis.voucherFisicoFecha,
      voucherInformeFisicoEntregado: tesis.voucherInformeFisicoEntregado,
      voucherInformeFisicoFecha: tesis.voucherInformeFisicoFecha,
      voucherSustentacionFisicoEntregado: tesis.voucherSustentacionFisicoEntregado,
      voucherSustentacionFisicoFecha: tesis.voucherSustentacionFisicoFecha,
      ejemplaresEntregados: tesis.ejemplaresEntregados,
      ejemplaresEntregadosFecha: tesis.ejemplaresEntregadosFecha,
      fechaSustentacion: tesis.fechaSustentacion,
      lugarSustentacion: tesis.lugarSustentacion,
      modalidadSustentacion: tesis.modalidadSustentacion,
      createdAt: tesis.createdAt,
      updatedAt: tesis.updatedAt,
      // Carrera y facultad
      carrera: primerAutor?.studentCareer?.carreraNombre || 'Sin carrera',
      facultad: primerAutor?.studentCareer?.facultad || null,
      // Autores
      autores: tesis.autores.map((a, index) => ({
        id: a.id,
        tipoParticipante: index === 0 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
        estado: a.estado,
        nombre: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
        email: a.user.email,
        dni: a.user.numeroDocumento,
        codigo: a.studentCareer?.codigoEstudiante,
        carrera: a.studentCareer?.carreraNombre,
      })),
      // Asesores
      asesores: tesis.asesores.map((a) => ({
        id: a.id,
        tipo: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
        estado: a.estado,
        nombre: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
        email: a.user.email,
      })),
      // Documentos (deduplicados - un dictamen por fase)
      documentos: documentosDeduplicados.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        nombre: d.nombre,
        url: d.rutaArchivo,
        mimeType: d.mimeType,
        tamano: d.tamano,
        firmado: d.firmadoDigitalmente,
        fechaFirma: d.fechaFirma,
        fechaSubida: d.createdAt,
        subidoPor: d.uploadedBy
          ? `${d.uploadedBy.nombres} ${d.uploadedBy.apellidoPaterno}`
          : null,
      })),
      // Jurados
      jurados: tesis.jurados.map((j) => ({
        id: j.id,
        tipo: j.tipo,
        fase: j.fase,
        nombre: `${j.user.nombres} ${j.user.apellidoPaterno} ${j.user.apellidoMaterno}`,
        email: j.user.email,
        userId: j.user.id,
        evaluaciones: j.evaluaciones.map((e) => ({
          id: e.id,
          ronda: e.ronda,
          resultado: e.resultado,
          observaciones: e.observaciones,
          archivoUrl: e.archivoUrl,
          fecha: e.createdAt,
        })),
      })),
      // Evaluación
      rondaActual: tesis.rondaActual,
      faseActual: tesis.faseActual,
      fechaLimiteEvaluacion: tesis.fechaLimiteEvaluacion,
      fechaLimiteCorreccion: tesis.fechaLimiteCorreccion,
      // Historial
      historial: tesis.historialEstados.map((h) => ({
        id: h.id,
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        comentario: h.comentario,
        fecha: h.createdAt,
        realizadoPor: h.changedBy
          ? `${h.changedBy.nombres} ${h.changedBy.apellidoPaterno} ${h.changedBy.apellidoMaterno}`
          : 'Sistema',
      })),
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/mesa-partes/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyecto' },
      { status: 500 }
    )
  }
}

// PUT /api/mesa-partes/[id] - Aprobar/Observar/Rechazar proyecto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const isMesaPartes = await checkPermission(user.id, 'mesa-partes', 'edit')

    if (!isMesaPartes) {
      return NextResponse.json(
        { error: 'No tienes permisos para gestionar proyectos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { accion, comentario } = body

    // Validar acción
    const accionesValidas = ['APROBAR', 'OBSERVAR', 'RECHAZAR', 'CONFIRMAR_JURADOS', 'SUBIR_RESOLUCION', 'CONFIRMAR_VOUCHER_SUSTENTACION', 'CONFIRMAR_EJEMPLARES', 'SUBIR_RESOLUCION_SUSTENTACION']
    if (!accion || !accionesValidas.includes(accion)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      )
    }

    // Observar y Rechazar requieren comentario
    if ((accion === 'OBSERVAR' || accion === 'RECHAZAR') && !comentario?.trim()) {
      return NextResponse.json(
        { error: `Debe proporcionar un comentario para ${accion.toLowerCase()} el proyecto` },
        { status: 400 }
      )
    }

    // Obtener la tesis actual
    const tesis = await prisma.thesis.findUnique({
      where: { id, deletedAt: null },
      include: {
        autores: {
          include: {
            studentCareer: {
              select: {
                facultadId: true,
              },
            },
          },
        },
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Acción: CONFIRMAR_JURADOS (solo en ASIGNANDO_JURADOS)
    if (accion === 'CONFIRMAR_JURADOS') {
      if (tesis.estado !== 'ASIGNANDO_JURADOS') {
        return NextResponse.json(
          { error: 'Solo se pueden confirmar jurados en estado ASIGNANDO_JURADOS' },
          { status: 400 }
        )
      }

      // Verificar que hay presidente, vocal, secretario y accesitario
      const jurados = await prisma.thesisJury.findMany({
        where: { thesisId: id, isActive: true, fase: 'PROYECTO' },
        include: {
          user: {
            select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true },
          },
        },
      })

      const tiposAsignados = jurados.map((j) => j.tipo)
      const faltantes: string[] = []
      if (!tiposAsignados.includes('PRESIDENTE')) faltantes.push('Presidente')
      if (!tiposAsignados.includes('VOCAL')) faltantes.push('Vocal')
      if (!tiposAsignados.includes('SECRETARIO')) faltantes.push('Secretario')
      if (!tiposAsignados.includes('ACCESITARIO')) faltantes.push('Accesitario')

      if (faltantes.length > 0) {
        return NextResponse.json(
          { error: `Faltan jurados por asignar: ${faltantes.join(', ')}` },
          { status: 400 }
        )
      }

      const fechaLimite = agregarDiasHabiles(new Date(), DIAS_HABILES_EVALUACION)

      await prisma.$transaction([
        prisma.thesis.update({
          where: { id },
          data: {
            estado: 'EN_EVALUACION_JURADO',
            rondaActual: 1,
            faseActual: 'PROYECTO',
            fechaLimiteEvaluacion: fechaLimite,
            fechaLimiteCorreccion: null,
          },
        }),
        prisma.thesisStatusHistory.create({
          data: {
            thesisId: id,
            estadoAnterior: 'ASIGNANDO_JURADOS',
            estadoNuevo: 'EN_EVALUACION_JURADO',
            comentario: `Jurados confirmados. Evaluación iniciada (${jurados.length} jurados). Fecha límite (${DIAS_HABILES_EVALUACION} días hábiles): ${fechaLimite.toLocaleDateString('es-PE')}`,
            changedById: user.id,
          },
        }),
      ])

      // Notificaciones a jurados y tesistas
      try {
        const tesisCompleta = await prisma.thesis.findUnique({
          where: { id },
          include: {
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
          },
        })

        if (tesisCompleta) {
          const primerAutor = tesisCompleta.autores[0]
          const facultadCodigo = primerAutor?.studentCareer?.facultad?.codigo || 'FI'
          const facultadNombre = primerAutor?.studentCareer?.facultad?.nombre || 'Facultad'
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const fechaLimiteStr = fechaLimite.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
          const nombresAutores = tesisCompleta.autores.map(a =>
            `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno || ''}`.trim()
          ).join(', ')

          const TIPO_JURADO_NOMBRE: Record<string, string> = {
            PRESIDENTE: 'Presidente',
            VOCAL: 'Vocal',
            SECRETARIO: 'Secretario',
            ACCESITARIO: 'Accesitario',
          }

          // Notificación en sistema a jurados
          await crearNotificacion({
            userId: jurados.map(j => j.user.id),
            tipo: 'JURADO_ASIGNADO',
            titulo: 'Asignado como jurado evaluador',
            mensaje: `Ha sido designado como jurado evaluador del proyecto "${tesisCompleta.titulo}"`,
            enlace: `/mis-evaluaciones`,
          })

          // Notificación en sistema a tesistas
          await crearNotificacion({
            userId: tesisCompleta.autores.map(a => a.user.id),
            tipo: 'JURADOS_CONFIRMADOS',
            titulo: 'Jurados asignados - Evaluacion iniciada',
            mensaje: `Los jurados de tu proyecto "${tesisCompleta.titulo}" han sido confirmados. Fecha limite de evaluacion: ${fechaLimiteStr}`,
            enlace: `/mis-tesis/${id}`,
          })

          // Email a cada jurado
          for (const jurado of jurados) {
            if (!jurado.user.email) continue
            try {
              const nombreJurado = `${jurado.user.nombres} ${jurado.user.apellidoPaterno} ${jurado.user.apellidoMaterno || ''}`.trim()
              const tipoNombre = TIPO_JURADO_NOMBRE[jurado.tipo] || jurado.tipo
              const template = emailTemplates.juryAssigned(
                nombreJurado,
                tipoNombre,
                tesisCompleta.titulo,
                nombresAutores,
                facultadNombre,
                fechaLimiteStr,
                `${appUrl}/mis-evaluaciones`
              )
              await sendEmailByFaculty(facultadCodigo, {
                to: jurado.user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
              })
              console.log(`[Email] Notificacion jurado asignado enviada a: ${jurado.user.email}`)
            } catch (emailError) {
              console.error(`[Email] Error al notificar jurado ${jurado.user.email}:`, emailError)
            }
          }

          // Email a cada tesista
          for (const autor of tesisCompleta.autores) {
            if (!autor.user.email) continue
            try {
              const nombreTesista = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
              const template = emailTemplates.juryConfirmedStudent(
                nombreTesista,
                tesisCompleta.titulo,
                facultadNombre,
                fechaLimiteStr,
                `${appUrl}/mis-tesis/${id}`
              )
              await sendEmailByFaculty(facultadCodigo, {
                to: autor.user.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
              })
              console.log(`[Email] Notificacion jurados confirmados enviada a tesista: ${autor.user.email}`)
            } catch (emailError) {
              console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
            }
          }
        }
      } catch (notifError) {
        console.error('[Notificacion] Error al notificar sobre jurados confirmados:', notifError)
      }

      return NextResponse.json({
        success: true,
        message: 'Jurados confirmados. Evaluación iniciada.',
        data: { id: tesis.id, estadoNuevo: 'EN_EVALUACION_JURADO' },
      })
    }

    // Acción: SUBIR_RESOLUCION (solo en PROYECTO_APROBADO)
    if (accion === 'SUBIR_RESOLUCION') {
      if (tesis.estado !== 'PROYECTO_APROBADO') {
        return NextResponse.json(
          { error: 'Solo se puede subir resolución cuando el proyecto está aprobado por jurados' },
          { status: 400 }
        )
      }

      // Copiar jurados del PROYECTO a INFORME_FINAL
      const juradosProyecto = await prisma.thesisJury.findMany({
        where: { thesisId: id, isActive: true, fase: 'PROYECTO' },
      })

      await prisma.$transaction([
        prisma.thesis.update({
          where: { id },
          data: {
            estado: 'INFORME_FINAL',
            faseActual: 'INFORME_FINAL',
            rondaActual: 0,
            fechaLimiteEvaluacion: null,
            fechaLimiteCorreccion: null,
          },
        }),
        prisma.thesisStatusHistory.create({
          data: {
            thesisId: id,
            estadoAnterior: 'PROYECTO_APROBADO',
            estadoNuevo: 'INFORME_FINAL',
            comentario: comentario?.trim() || 'Resolución de aprobación subida. Esperando informe final del estudiante.',
            changedById: user.id,
          },
        }),
        // Crear jurados para la fase INFORME_FINAL copiando los del PROYECTO
        ...juradosProyecto.map((j) =>
          prisma.thesisJury.upsert({
            where: {
              thesisId_userId_fase: {
                thesisId: id,
                userId: j.userId,
                fase: 'INFORME_FINAL',
              },
            },
            update: { tipo: j.tipo, isActive: true },
            create: {
              thesisId: id,
              userId: j.userId,
              tipo: j.tipo,
              fase: 'INFORME_FINAL',
            },
          })
        ),
      ])

      return NextResponse.json({
        success: true,
        message: 'Resolución subida. Tesis pasa a fase de Informe Final. Jurados copiados del proyecto.',
        data: { id: tesis.id, estadoNuevo: 'INFORME_FINAL' },
      })
    }

    // Acción: CONFIRMAR_VOUCHER_SUSTENTACION (solo en EN_SUSTENTACION)
    if (accion === 'CONFIRMAR_VOUCHER_SUSTENTACION') {
      if (tesis.estado !== 'EN_SUSTENTACION') {
        return NextResponse.json(
          { error: 'No se puede confirmar el voucher de sustentación en el estado actual' },
          { status: 400 }
        )
      }

      await prisma.thesis.update({
        where: { id },
        data: {
          voucherSustentacionFisicoEntregado: true,
          voucherSustentacionFisicoFecha: new Date(),
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: 'Vouchers físicos de sustentación (Cod. 384 + 466) recibidos — confirmado por Mesa de Partes',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Vouchers físicos de sustentación confirmados exitosamente',
        data: {
          id: tesis.id,
          voucherSustentacionFisicoEntregado: true,
          voucherSustentacionFisicoFecha: new Date(),
        },
      })
    }

    // Acción: CONFIRMAR_EJEMPLARES (solo en EN_SUSTENTACION)
    if (accion === 'CONFIRMAR_EJEMPLARES') {
      if (tesis.estado !== 'EN_SUSTENTACION') {
        return NextResponse.json(
          { error: 'No se puede confirmar los ejemplares en el estado actual' },
          { status: 400 }
        )
      }

      await prisma.thesis.update({
        where: { id },
        data: {
          ejemplaresEntregados: true,
          ejemplaresEntregadosFecha: new Date(),
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: '4 ejemplares del informe final en folder manila recibidos — confirmado por Mesa de Partes',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Ejemplares confirmados exitosamente',
        data: {
          id: tesis.id,
          ejemplaresEntregados: true,
          ejemplaresEntregadosFecha: new Date(),
        },
      })
    }

    // Acción: SUBIR_RESOLUCION_SUSTENTACION (solo en EN_SUSTENTACION, requiere 3 confirmaciones)
    if (accion === 'SUBIR_RESOLUCION_SUSTENTACION') {
      if (tesis.estado !== 'EN_SUSTENTACION') {
        return NextResponse.json(
          { error: 'Solo se puede subir resolución de sustentación en estado EN_SUSTENTACION' },
          { status: 400 }
        )
      }

      // Verificar que las confirmaciones físicas estén completas
      if (!tesis.voucherSustentacionFisicoEntregado) {
        return NextResponse.json(
          { error: 'Debe confirmar la entrega de los vouchers físicos de sustentación primero' },
          { status: 400 }
        )
      }
      if (!tesis.ejemplaresEntregados) {
        return NextResponse.json(
          { error: 'Debe confirmar la entrega de los 4 ejemplares del informe final primero' },
          { status: 400 }
        )
      }

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: comentario?.trim() || 'Resolución de sustentación subida por Mesa de Partes. Todos los requisitos cumplidos.',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Resolución de sustentación registrada exitosamente',
        data: { id: tesis.id, estado: tesis.estado },
      })
    }

    // === ACCIONES PARA EN_REVISION_INFORME (revisión de informe final por mesa de partes) ===
    if (tesis.estado === 'EN_REVISION_INFORME') {
      if (accion !== 'APROBAR' && accion !== 'OBSERVAR') {
        return NextResponse.json(
          { error: `Solo se puede aprobar u observar un informe en revisión` },
          { status: 400 }
        )
      }

      if (accion === 'APROBAR') {
        // APROBAR informe → EN_EVALUACION_INFORME (notificar jurados y tesistas)
        const fechaLimite = agregarDiasHabiles(new Date(), DIAS_HABILES_EVALUACION)

        await prisma.$transaction([
          prisma.thesis.update({
            where: { id },
            data: {
              estado: 'EN_EVALUACION_INFORME',
              rondaActual: 1,
              fechaLimiteEvaluacion: fechaLimite,
              fechaLimiteCorreccion: null,
            },
          }),
          prisma.thesisStatusHistory.create({
            data: {
              thesisId: id,
              estadoAnterior: 'EN_REVISION_INFORME',
              estadoNuevo: 'EN_EVALUACION_INFORME',
              comentario: comentario?.trim() || `Informe final aprobado por Mesa de Partes. Evaluación por jurados iniciada. Fecha límite (${DIAS_HABILES_EVALUACION} días hábiles): ${fechaLimite.toLocaleDateString('es-PE')}`,
              changedById: user.id,
            },
          }),
        ])

        // Notificaciones a jurados y tesistas
        try {
          const tesisCompleta = await prisma.thesis.findUnique({
            where: { id },
            include: {
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
              jurados: {
                where: { isActive: true, fase: 'INFORME_FINAL' },
                include: {
                  user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, email: true } },
                },
              },
            },
          })

          if (tesisCompleta) {
            const primerAutor = tesisCompleta.autores[0]
            const facultadCodigo = primerAutor?.studentCareer?.facultad?.codigo || 'FI'
            const facultadNombre = primerAutor?.studentCareer?.facultad?.nombre || 'Facultad'
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const fechaLimiteStr = fechaLimite.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
            const nombresAutores = tesisCompleta.autores.map(a =>
              `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno || ''}`.trim()
            ).join(', ')

            const TIPO_JURADO_NOMBRE: Record<string, string> = {
              PRESIDENTE: 'Presidente',
              VOCAL: 'Vocal',
              SECRETARIO: 'Secretario',
              ACCESITARIO: 'Accesitario',
            }

            // Notificación en sistema a jurados
            const juradoIds = tesisCompleta.jurados.map(j => j.user.id)
            if (juradoIds.length > 0) {
              await crearNotificacion({
                userId: juradoIds,
                tipo: 'INFORME_EN_EVALUACION',
                titulo: 'Informe final enviado para evaluación',
                mensaje: `El informe final "${tesisCompleta.titulo}" ha sido aprobado por mesa de partes y está listo para su evaluación. Fecha límite: ${fechaLimiteStr}`,
                enlace: `/mis-evaluaciones`,
              })
            }

            // Notificación en sistema a tesistas
            const idsAutores = tesisCompleta.autores.map(a => a.user.id)
            if (idsAutores.length > 0) {
              await crearNotificacion({
                userId: idsAutores,
                tipo: 'INFORME_APROBADO_MESA',
                titulo: 'Informe final aprobado por mesa de partes',
                mensaje: `Tu informe final "${tesisCompleta.titulo}" fue aprobado por mesa de partes. Los jurados iniciarán la evaluación. Fecha límite: ${fechaLimiteStr}`,
                enlace: `/mis-tesis/${id}`,
              })
            }

            // Email a cada jurado
            for (const jurado of tesisCompleta.jurados) {
              if (!jurado.user.email) continue
              try {
                const nombreJurado = `${jurado.user.nombres} ${jurado.user.apellidoPaterno} ${jurado.user.apellidoMaterno || ''}`.trim()
                const tipoNombre = TIPO_JURADO_NOMBRE[jurado.tipo] || jurado.tipo
                const template = emailTemplates.juryAssigned(
                  nombreJurado,
                  tipoNombre,
                  tesisCompleta.titulo,
                  nombresAutores,
                  facultadNombre,
                  fechaLimiteStr,
                  `${appUrl}/mis-evaluaciones`
                )
                await sendEmailByFaculty(facultadCodigo, {
                  to: jurado.user.email,
                  subject: `Informe Final Enviado para Evaluación - ${tipoNombre} - SeguiTesis UNAMAD`,
                  html: template.html,
                  text: template.text,
                })
                console.log(`[Email] Notificacion informe final enviada al jurado: ${jurado.user.email}`)
              } catch (emailError) {
                console.error(`[Email] Error al notificar jurado ${jurado.user.email}:`, emailError)
              }
            }

            // Email a cada tesista
            for (const autor of tesisCompleta.autores) {
              if (!autor.user.email) continue
              try {
                const nombreTesista = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
                const template = emailTemplates.thesisApproved(
                  nombreTesista,
                  tesisCompleta.titulo,
                  facultadNombre,
                  `${appUrl}/mis-tesis/${id}`
                )
                await sendEmailByFaculty(facultadCodigo, {
                  to: autor.user.email,
                  subject: `Informe Final Aprobado - Evaluación Iniciada - SeguiTesis UNAMAD`,
                  html: template.html,
                  text: template.text,
                })
                console.log(`[Email] Notificacion informe aprobado enviada a tesista: ${autor.user.email}`)
              } catch (emailError) {
                console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
              }
            }
          }
        } catch (notifError) {
          console.error('[Notificacion] Error al notificar sobre informe aprobado:', notifError)
        }

        return NextResponse.json({
          success: true,
          message: 'Informe final aprobado. Evaluación por jurados iniciada.',
          data: { id: tesis.id, estadoAnterior: 'EN_REVISION_INFORME', estadoNuevo: 'EN_EVALUACION_INFORME' },
        })
      } else {
        // OBSERVAR informe → INFORME_FINAL (tesista corrige)
        await prisma.$transaction([
          prisma.thesis.update({
            where: { id },
            data: {
              estado: 'INFORME_FINAL',
            },
          }),
          prisma.thesisStatusHistory.create({
            data: {
              thesisId: id,
              estadoAnterior: 'EN_REVISION_INFORME',
              estadoNuevo: 'INFORME_FINAL',
              comentario: comentario?.trim() || 'Informe final observado por Mesa de Partes.',
              changedById: user.id,
            },
          }),
        ])

        // Notificar tesistas
        try {
          const tesisCompleta = await prisma.thesis.findUnique({
            where: { id },
            include: {
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
            },
          })

          if (tesisCompleta) {
            const idsAutores = tesisCompleta.autores.map(a => a.user.id)
            if (idsAutores.length > 0) {
              await crearNotificacion({
                userId: idsAutores,
                tipo: 'INFORME_OBSERVADO_MESA',
                titulo: 'Informe final observado por mesa de partes',
                mensaje: `Tu informe final "${tesisCompleta.titulo}" fue observado por mesa de partes: ${comentario?.trim() || 'Revisar observaciones'}`,
                enlace: `/mis-tesis/${id}`,
              })
            }

            // Emails a tesistas
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            const primerAutor = tesisCompleta.autores[0]
            const facultadCodigo = primerAutor?.studentCareer?.facultad?.codigo || 'FI'
            const facultadNombre = primerAutor?.studentCareer?.facultad?.nombre || 'Facultad'

            for (const autor of tesisCompleta.autores) {
              if (!autor.user.email) continue
              try {
                const nombreCompleto = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
                const template = emailTemplates.thesisObserved(
                  nombreCompleto,
                  tesisCompleta.titulo,
                  comentario?.trim() || '',
                  facultadNombre,
                  `${appUrl}/mis-tesis/${id}`
                )
                await sendEmailByFaculty(facultadCodigo, {
                  to: autor.user.email,
                  subject: `Informe Final Observado - SeguiTesis UNAMAD`,
                  html: template.html,
                  text: template.text,
                })
                console.log(`[Email] Notificacion informe observado enviada a tesista: ${autor.user.email}`)
              } catch (emailError) {
                console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
              }
            }
          }
        } catch (notifError) {
          console.error('[Notificacion] Error al notificar sobre informe observado:', notifError)
        }

        return NextResponse.json({
          success: true,
          message: 'Informe final observado. El estudiante recibirá las observaciones.',
          data: { id: tesis.id, estadoAnterior: 'EN_REVISION_INFORME', estadoNuevo: 'INFORME_FINAL' },
        })
      }
    }

    // Acciones estándar: APROBAR, OBSERVAR, RECHAZAR (solo en EN_REVISION u OBSERVADA)
    const estadosPermitidos: EstadoTesis[] = ['EN_REVISION', 'OBSERVADA']
    if (!estadosPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: `No se puede ${accion.toLowerCase()} un proyecto en estado ${tesis.estado}` },
        { status: 400 }
      )
    }

    // Determinar nuevo estado
    let nuevoEstado: EstadoTesis
    let mensajeExito: string

    switch (accion) {
      case 'APROBAR':
        nuevoEstado = 'ASIGNANDO_JURADOS'
        mensajeExito = 'Documentos aprobados. Ahora asigne los jurados evaluadores.'
        break
      case 'OBSERVAR':
        nuevoEstado = 'OBSERVADA'
        mensajeExito = 'Proyecto observado. El estudiante recibirá las observaciones.'
        break
      case 'RECHAZAR':
        nuevoEstado = 'RECHAZADA'
        mensajeExito = 'Proyecto rechazado'
        break
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    // Actualizar estado
    const tesisActualizada = await prisma.thesis.update({
      where: { id },
      data: {
        estado: nuevoEstado,
      },
    })

    // Registrar en historial
    await prisma.thesisStatusHistory.create({
      data: {
        thesisId: id,
        estadoAnterior: tesis.estado,
        estadoNuevo: nuevoEstado,
        comentario: comentario?.trim() || (accion === 'APROBAR'
          ? 'Documentos verificados por Mesa de Partes. Pendiente asignación de jurados.'
          : `Proyecto ${accion.toLowerCase()}do por Mesa de Partes`),
        changedById: user.id,
      },
    })

    // Notificar a autores y asesores (sistema + email)
    try {
      const tesisCompleta = await prisma.thesis.findUnique({
        where: { id },
        include: {
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
      if (tesisCompleta) {
        const destinatarios = [
          ...tesisCompleta.autores.map(a => a.user.id),
          ...tesisCompleta.asesores.map(a => a.user.id),
        ]
        const tipoNotifMap: Record<string, string> = {
          APROBAR: 'TESIS_APROBADA',
          OBSERVAR: 'TESIS_OBSERVADA',
          RECHAZAR: 'TESIS_RECHAZADA',
        }
        const tituloNotifMap: Record<string, string> = {
          APROBAR: 'Proyecto aprobado por mesa de partes',
          OBSERVAR: 'Proyecto observado por mesa de partes',
          RECHAZAR: 'Proyecto rechazado por mesa de partes',
        }
        const mensajeNotifMap: Record<string, string> = {
          APROBAR: `Tu proyecto "${tesisCompleta.titulo}" fue aprobado por mesa de partes`,
          OBSERVAR: `Tu proyecto "${tesisCompleta.titulo}" fue observado por mesa de partes`,
          RECHAZAR: `Tu proyecto "${tesisCompleta.titulo}" fue rechazado por mesa de partes`,
        }

        // Notificación en sistema a autores (enlace a /mis-tesis/)
        const idsAutores = tesisCompleta.autores.map(a => a.user.id)
        if (idsAutores.length > 0) {
          await crearNotificacion({
            userId: idsAutores,
            tipo: tipoNotifMap[accion],
            titulo: tituloNotifMap[accion],
            mensaje: mensajeNotifMap[accion],
            enlace: `/mis-tesis/${id}`,
          })
        }

        // Notificación en sistema a asesores (enlace a /mis-asesorias/)
        const idsAsesores = tesisCompleta.asesores.map(a => a.user.id)
        if (idsAsesores.length > 0) {
          await crearNotificacion({
            userId: idsAsesores,
            tipo: tipoNotifMap[accion],
            titulo: tituloNotifMap[accion],
            mensaje: mensajeNotifMap[accion],
            enlace: `/mis-asesorias/${id}`,
          })
        }

        // Si es OBSERVAR, notificar específicamente al asesor/coasesor si su carta fue observada
        if (accion === 'OBSERVAR' && comentario) {
          const comentarioLower = comentario.toLowerCase()
          for (const asesor of tesisCompleta.asesores) {
            const esPrincipal = asesor.tipo === 'PRINCIPAL'
            const tipoLabel = esPrincipal ? 'Asesor' : 'Coasesor'
            const cartaLabel = esPrincipal ? 'carta de aceptación del asesor' : 'carta de aceptación del coasesor'
            if (comentarioLower.includes(cartaLabel)) {
              await crearNotificacion({
                userId: asesor.user.id,
                tipo: 'DOCUMENTO_OBSERVADO',
                titulo: `Su carta de aceptación fue observada`,
                mensaje: `Mesa de partes observó su carta de aceptación como ${tipoLabel.toLowerCase()} en la tesis "${tesisCompleta.titulo}". Por favor revise las observaciones y suba una nueva carta.`,
                enlace: `/mis-asesorias/${id}`,
              })
            }
          }
        }

        // Enviar correos electrónicos
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const primerAutor = tesisCompleta.autores[0]
        const facultadCodigo = primerAutor?.studentCareer?.facultad?.codigo || 'FI'
        const facultadNombre = primerAutor?.studentCareer?.facultad?.nombre || 'Facultad'

        // Emails a autores (con URL /mis-tesis/)
        for (const autor of tesisCompleta.autores) {
          if (!autor.user.email) continue
          try {
            const nombreCompleto = `${autor.user.nombres} ${autor.user.apellidoPaterno} ${autor.user.apellidoMaterno || ''}`.trim()
            const tesisUrl = `${appUrl}/mis-tesis/${id}`
            let template
            if (accion === 'OBSERVAR') {
              template = emailTemplates.thesisObserved(nombreCompleto, tesisCompleta.titulo, comentario?.trim() || '', facultadNombre, tesisUrl)
            } else if (accion === 'APROBAR') {
              template = emailTemplates.thesisApproved(nombreCompleto, tesisCompleta.titulo, facultadNombre, tesisUrl)
            } else {
              template = emailTemplates.thesisRejected(nombreCompleto, tesisCompleta.titulo, comentario?.trim() || '', facultadNombre, tesisUrl)
            }
            await sendEmailByFaculty(facultadCodigo, {
              to: autor.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            })
            console.log(`[Email] Notificacion ${accion} enviada a tesista: ${autor.user.email}`)
          } catch (emailError) {
            console.error(`[Email] Error al notificar tesista ${autor.user.email}:`, emailError)
          }
        }

        // Emails a asesores (con URL /mis-asesorias/)
        for (const asesor of tesisCompleta.asesores) {
          if (!asesor.user.email) continue
          try {
            const nombreCompleto = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno || ''}`.trim()
            const tesisUrl = `${appUrl}/mis-asesorias/${id}`
            let template
            if (accion === 'OBSERVAR') {
              template = emailTemplates.thesisObserved(nombreCompleto, tesisCompleta.titulo, comentario?.trim() || '', facultadNombre, tesisUrl)
            } else if (accion === 'APROBAR') {
              template = emailTemplates.thesisApproved(nombreCompleto, tesisCompleta.titulo, facultadNombre, tesisUrl)
            } else {
              template = emailTemplates.thesisRejected(nombreCompleto, tesisCompleta.titulo, comentario?.trim() || '', facultadNombre, tesisUrl)
            }
            await sendEmailByFaculty(facultadCodigo, {
              to: asesor.user.email,
              subject: template.subject,
              html: template.html,
              text: template.text,
            })
            console.log(`[Email] Notificacion ${accion} enviada a asesor: ${asesor.user.email}`)
          } catch (emailError) {
            console.error(`[Email] Error al notificar asesor ${asesor.user.email}:`, emailError)
          }
        }
      }
    } catch (notifError) {
      console.error('[Notificacion] Error al notificar autores/asesores:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: mensajeExito,
      data: {
        id: tesisActualizada.id,
        estadoAnterior: tesis.estado,
        estadoNuevo: nuevoEstado,
      },
    })
  } catch (error) {
    console.error('[PUT /api/mesa-partes/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proyecto' },
      { status: 500 }
    )
  }
}
