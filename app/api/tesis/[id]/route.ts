import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/tesis/[id] - Obtener una tesis por ID
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

    // Obtener la tesis verificando que el usuario tiene acceso
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        OR: [
          { autores: { some: { userId: user.id } } },
          { asesores: { some: { userId: user.id } } },
        ],
        deletedAt: null,
      },
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
            descripcion: true,
            rutaArchivo: true,
            mimeType: true,
            tamano: true,
            version: true,
            firmadoDigitalmente: true,
            fechaFirma: true,
            createdAt: true,
            uploadedBy: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
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
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o sin acceso' },
        { status: 404 }
      )
    }

    // Determinar el rol del usuario actual
    const esAutor = tesis.autores.some((a) => a.userId === user.id)
    const esAsesor = tesis.asesores.some((a) => a.userId === user.id)
    const miRegistroAsesor = tesis.asesores.find((a) => a.userId === user.id)

    // Obtener facultad del primer autor
    const primerAutor = tesis.autores[0]
    const facultad = primerAutor?.studentCareer?.facultad

    const resultado = {
      id: tesis.id,
      codigo: tesis.id.slice(-8).toUpperCase(), // Generar código desde el ID
      titulo: tesis.titulo,
      resumen: tesis.resumen,
      palabrasClave: tesis.palabrasClave,
      estado: tesis.estado,
      lineaInvestigacion: tesis.lineaInvestigacion,
      areaConocimiento: tesis.areaConocimiento,
      voucherFisicoEntregado: tesis.voucherFisicoEntregado,
      fechaInicio: tesis.fechaInicio,
      fechaAprobacion: tesis.fechaAprobacion,
      fechaSustentacion: tesis.fechaSustentacion,
      fechaRegistro: tesis.createdAt,
      createdAt: tesis.createdAt,
      updatedAt: tesis.updatedAt,
      // Carrera y facultad
      carreraNombre: primerAutor?.studentCareer?.carreraNombre || 'Sin carrera',
      facultad: facultad || { id: '', nombre: 'Sin facultad' },
      // Autores - formato esperado por la página
      autores: tesis.autores.map((a, index) => ({
        id: a.id,
        orden: a.orden,
        tipoParticipante: index === 0 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
        estado: a.estado, // Estado real de la invitación
        user: a.user ? {
          id: a.user.id,
          nombres: a.user.nombres,
          apellidoPaterno: a.user.apellidoPaterno,
          apellidoMaterno: a.user.apellidoMaterno,
          nombreCompleto: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
          email: a.user.email,
          numeroDocumento: a.user.numeroDocumento,
        } : { id: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', email: '', nombreCompleto: 'Sin datos', numeroDocumento: '' },
        studentCareer: {
          codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
        },
        codigoEstudiante: a.studentCareer?.codigoEstudiante || null,
        carrera: a.studentCareer?.carreraNombre || null,
      })),
      // Asesores - formato esperado por la página
      asesores: tesis.asesores.map((a) => ({
        id: a.id,
        tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
        tipo: a.tipo,
        estado: a.estado,
        fechaRespuesta: a.fechaRespuesta,
        user: a.user ? {
          id: a.user.id,
          nombres: a.user.nombres,
          apellidoPaterno: a.user.apellidoPaterno,
          apellidoMaterno: a.user.apellidoMaterno,
          nombreCompleto: `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`,
          email: a.user.email,
        } : { id: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', email: '', nombreCompleto: 'Sin datos' },
        esMiRegistro: a.userId === user.id,
      })),
      // Documentos - formato esperado por la página
      documentos: tesis.documentos.map((d) => ({
        id: d.id,
        tipoDocumento: d.tipo,
        tipo: d.tipo,
        nombre: d.nombre,
        descripcion: d.descripcion,
        archivoUrl: d.rutaArchivo,
        rutaArchivo: d.rutaArchivo,
        archivoNombre: d.nombre,
        archivoTamano: d.tamano || 0,
        archivoMimeType: d.mimeType || 'application/octet-stream',
        mimeType: d.mimeType,
        tamano: d.tamano,
        version: d.version,
        firmadoDigitalmente: d.firmadoDigitalmente,
        fechaFirma: d.fechaFirma,
        createdAt: d.createdAt,
        subidoPor: d.uploadedBy,
      })),
      // Jurados
      jurados: tesis.jurados.map((j) => ({
        id: j.id,
        tipo: j.tipo,
        fase: j.fase,
        nombre: `${j.user.nombres} ${j.user.apellidoPaterno} ${j.user.apellidoMaterno}`,
        evaluaciones: j.evaluaciones.map((e) => ({
          id: e.id,
          ronda: e.ronda,
          resultado: e.resultado,
          observaciones: e.observaciones,
          archivoUrl: e.archivoUrl,
          fecha: e.createdAt,
        })),
      })),
      // Evaluacion
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
        realizadoPor: h.changedBy,
      })),
      // Mi rol en esta tesis
      miRol: {
        esAutor,
        esAsesor,
        tipoAsesor: miRegistroAsesor?.tipo || null,
        estadoAsesor: miRegistroAsesor?.estado || null,
      },
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    })
  } catch (error) {
    console.error('[GET /api/tesis/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener tesis' },
      { status: 500 }
    )
  }
}

// PUT /api/tesis/[id] - Actualizar tesis
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

    // Verificar que el usuario es autor de esta tesis
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        autores: { some: { userId: user.id } },
        deletedAt: null,
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o no tienes permiso para editarla' },
        { status: 404 }
      )
    }

    // Solo permitir edición en ciertos estados
    const estadosEditables = ['BORRADOR', 'OBSERVADA']
    if (!estadosEditables.includes(tesis.estado)) {
      return NextResponse.json(
        { error: 'No se puede editar la tesis en su estado actual' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      titulo,
      resumen,
      palabrasClave,
      lineaInvestigacion,
      areaConocimiento,
    } = body

    const tesisActualizada = await prisma.thesis.update({
      where: { id },
      data: {
        ...(titulo && { titulo: titulo.trim() }),
        ...(resumen !== undefined && { resumen: resumen?.trim() || null }),
        ...(palabrasClave && { palabrasClave }),
        ...(lineaInvestigacion !== undefined && { lineaInvestigacion: lineaInvestigacion?.trim() || null }),
        ...(areaConocimiento !== undefined && { areaConocimiento: areaConocimiento?.trim() || null }),
      },
    })

    return NextResponse.json({
      success: true,
      data: tesisActualizada,
      message: 'Tesis actualizada exitosamente',
    })
  } catch (error) {
    console.error('[PUT /api/tesis/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tesis' },
      { status: 500 }
    )
  }
}

// DELETE /api/tesis/[id] - Eliminar tesis (soft delete)
export async function DELETE(
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

    // Verificar que el usuario es autor de esta tesis
    const tesis = await prisma.thesis.findFirst({
      where: {
        id,
        autores: { some: { userId: user.id } },
        deletedAt: null,
      },
    })

    if (!tesis) {
      return NextResponse.json(
        { error: 'Tesis no encontrada o no tienes permiso para eliminarla' },
        { status: 404 }
      )
    }

    // Solo permitir eliminación en estado BORRADOR
    if (tesis.estado !== 'BORRADOR') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar tesis en estado borrador' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.thesis.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Tesis eliminada exitosamente',
    })
  } catch (error) {
    console.error('[DELETE /api/tesis/[id]] Error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar tesis' },
      { status: 500 }
    )
  }
}
