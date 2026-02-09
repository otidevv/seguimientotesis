import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { EstadoTesis } from '@prisma/client'

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
          where: { esVersionActual: true },
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
      // Documentos
      documentos: tesis.documentos.map((d) => ({
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
    const accionesValidas = ['APROBAR', 'OBSERVAR', 'RECHAZAR']
    if (!accion || !accionesValidas.includes(accion)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser APROBAR, OBSERVAR o RECHAZAR' },
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

    // Solo se pueden gestionar proyectos en ciertos estados
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
        nuevoEstado = 'APROBADA'
        mensajeExito = 'Proyecto aprobado exitosamente'
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
        ...(nuevoEstado === 'APROBADA' && { fechaAprobacion: new Date() }),
      },
    })

    // Registrar en historial
    await prisma.thesisStatusHistory.create({
      data: {
        thesisId: id,
        estadoAnterior: tesis.estado,
        estadoNuevo: nuevoEstado,
        comentario: comentario?.trim() || `Proyecto ${accion.toLowerCase()}do por Mesa de Partes`,
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
