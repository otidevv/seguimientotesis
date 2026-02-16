import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { EstadoTesis } from '@prisma/client'
import { agregarDiasHabiles, DIAS_HABILES_EVALUACION } from '@/lib/business-days'

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

    // Verificar que el usuario tiene rol MESA_PARTES, ADMIN o SUPER_ADMIN
    const tieneAcceso = user.roles?.some(
      (r) => ['MESA_PARTES', 'ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

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

    // Verificar que el usuario tiene rol MESA_PARTES
    const isMesaPartes = user.roles?.some(
      (r) => r.role.codigo === 'MESA_PARTES' && r.isActive
    )

    if (!isMesaPartes) {
      return NextResponse.json(
        { error: 'No tienes permisos para gestionar proyectos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { accion, comentario } = body

    // Validar acción
    const accionesValidas = ['APROBAR', 'OBSERVAR', 'RECHAZAR', 'CONFIRMAR_VOUCHER', 'CONFIRMAR_VOUCHER_INFORME', 'CONFIRMAR_JURADOS', 'SUBIR_RESOLUCION']
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

    // Acción especial: confirmar voucher físico (permitido en EN_REVISION u OBSERVADA)
    if (accion === 'CONFIRMAR_VOUCHER') {
      if (!['EN_REVISION', 'OBSERVADA'].includes(tesis.estado)) {
        return NextResponse.json(
          { error: 'No se puede confirmar el voucher en el estado actual' },
          { status: 400 }
        )
      }

      await prisma.thesis.update({
        where: { id },
        data: {
          voucherFisicoEntregado: true,
          voucherFisicoFecha: new Date(),
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: 'Voucher físico recibido — confirmado por Mesa de Partes',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Voucher físico confirmado exitosamente',
        data: {
          id: tesis.id,
          voucherFisicoEntregado: true,
          voucherFisicoFecha: new Date(),
        },
      })
    }

    // Acción especial: confirmar voucher físico informe final
    if (accion === 'CONFIRMAR_VOUCHER_INFORME') {
      if (!['INFORME_FINAL', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME'].includes(tesis.estado)) {
        return NextResponse.json(
          { error: 'No se puede confirmar el voucher de informe final en el estado actual' },
          { status: 400 }
        )
      }

      await prisma.thesis.update({
        where: { id },
        data: {
          voucherInformeFisicoEntregado: true,
          voucherInformeFisicoFecha: new Date(),
        },
      })

      await prisma.thesisStatusHistory.create({
        data: {
          thesisId: id,
          estadoAnterior: tesis.estado,
          estadoNuevo: tesis.estado,
          comentario: 'Voucher físico del informe final recibido — confirmado por Mesa de Partes',
          changedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Voucher físico del informe final confirmado exitosamente',
        data: {
          id: tesis.id,
          voucherInformeFisicoEntregado: true,
          voucherInformeFisicoFecha: new Date(),
        },
      })
    }

    // Acción: CONFIRMAR_JURADOS (solo en ASIGNANDO_JURADOS)
    if (accion === 'CONFIRMAR_JURADOS') {
      if (tesis.estado !== 'ASIGNANDO_JURADOS') {
        return NextResponse.json(
          { error: 'Solo se pueden confirmar jurados en estado ASIGNANDO_JURADOS' },
          { status: 400 }
        )
      }

      // Verificar que hay al menos presidente, vocal y secretario
      const jurados = await prisma.thesisJury.findMany({
        where: { thesisId: id, isActive: true, fase: 'PROYECTO' },
      })

      const tiposAsignados = jurados.map((j) => j.tipo)
      const faltantes: string[] = []
      if (!tiposAsignados.includes('PRESIDENTE')) faltantes.push('Presidente')
      if (!tiposAsignados.includes('VOCAL')) faltantes.push('Vocal')
      if (!tiposAsignados.includes('SECRETARIO')) faltantes.push('Secretario')

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

    // Acciones estándar: APROBAR, OBSERVAR, RECHAZAR (solo en EN_REVISION u OBSERVADA)
    const estadosPermitidos: EstadoTesis[] = ['EN_REVISION', 'OBSERVADA']
    if (!estadosPermitidos.includes(tesis.estado)) {
      return NextResponse.json(
        { error: `No se puede ${accion.toLowerCase()} un proyecto en estado ${tesis.estado}` },
        { status: 400 }
      )
    }

    // Bloquear aprobación si no se ha confirmado el voucher físico
    if (accion === 'APROBAR' && !tesis.voucherFisicoEntregado) {
      return NextResponse.json(
        { error: 'Debe confirmar la entrega del voucher físico antes de aprobar' },
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
