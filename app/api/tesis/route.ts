import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { EstadoTesis } from '@prisma/client'

// GET /api/tesis - Listar tesis del usuario actual
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') as EstadoTesis | null
    const rol = searchParams.get('rol') // 'autor' o 'asesor'

    // Construir filtros base
    const whereClause: any = {
      deletedAt: null,
    }

    // Filtrar por estado si se especifica
    if (estado) {
      whereClause.estado = estado
    }

    // Filtrar por rol del usuario
    if (rol === 'autor') {
      whereClause.autores = { some: { userId: user.id } }
    } else if (rol === 'asesor') {
      whereClause.asesores = { some: { userId: user.id } }
    } else {
      // Por defecto, mostrar tesis donde es autor o asesor
      whereClause.OR = [
        { autores: { some: { userId: user.id } } },
        { asesores: { some: { userId: user.id } } },
      ]
    }

    const tesis = await prisma.thesis.findMany({
      where: whereClause,
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
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Formatear respuesta
    const resultado = tesis.map((t) => {
      const primerAutor = t.autores[0]
      return {
        id: t.id,
        codigo: t.id.slice(-8).toUpperCase(), // Generar código desde el ID
        titulo: t.titulo,
        resumen: t.resumen,
        palabrasClave: t.palabrasClave,
        estado: t.estado,
        lineaInvestigacion: t.lineaInvestigacion,
        areaConocimiento: t.areaConocimiento,
        fechaInicio: t.fechaInicio,
        fechaAprobacion: t.fechaAprobacion,
        fechaSustentacion: t.fechaSustentacion,
        fechaRegistro: t.createdAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // Datos de la carrera/facultad desde el primer autor
        carreraNombre: primerAutor?.studentCareer?.carreraNombre || 'Sin carrera',
        carrera: primerAutor?.studentCareer?.carreraNombre || null,
        facultad: primerAutor?.studentCareer?.facultad || { id: '', nombre: 'Sin facultad' },
        // Autores formateados
        autores: t.autores.map((a, index) => ({
          id: a.id,
          orden: a.orden,
          userId: a.userId,
          tipoParticipante: index === 0 ? 'AUTOR_PRINCIPAL' : 'COAUTOR',
          estado: a.estado,
          nombreCompleto: a.user ? `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}` : 'Sin datos',
          email: a.user?.email || null,
          codigoEstudiante: a.studentCareer?.codigoEstudiante || null,
          carrera: a.studentCareer?.carreraNombre || null,
          user: a.user ? {
            id: a.user.id,
            nombres: a.user.nombres,
            apellidoPaterno: a.user.apellidoPaterno,
            apellidoMaterno: a.user.apellidoMaterno,
            email: a.user.email,
          } : null,
          studentCareer: {
            codigoEstudiante: a.studentCareer?.codigoEstudiante || 'Sin código',
          },
        })),
        // Asesores formateados
        asesores: t.asesores.map((a) => ({
          id: a.id,
          tipoAsesor: a.tipo === 'PRINCIPAL' ? 'ASESOR' : 'COASESOR',
          tipo: a.tipo,
          estado: a.estado,
          fechaRespuesta: a.fechaRespuesta,
          userId: a.userId,
          nombreCompleto: a.user ? `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}` : 'Sin datos',
          email: a.user?.email || null,
          user: a.user ? {
            id: a.user.id,
            nombres: a.user.nombres,
            apellidoPaterno: a.user.apellidoPaterno,
            apellidoMaterno: a.user.apellidoMaterno,
            email: a.user.email,
          } : null,
        })),
        // Resumen de documentos
        documentos: {
          total: t.documentos.length,
          tieneProyecto: t.documentos.some((d) => d.tipo === 'PROYECTO'),
          tieneCartaAsesor: t.documentos.some((d) => d.tipo === 'CARTA_ACEPTACION_ASESOR'),
          tieneCartaCoasesor: t.documentos.some((d) => d.tipo === 'CARTA_ACEPTACION_COASESOR'),
        },
        // Rol del usuario actual en esta tesis
        miRol: t.autores.some((a) => a.userId === user.id)
          ? 'autor'
          : t.asesores.some((a) => a.userId === user.id)
            ? 'asesor'
            : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: resultado,
      total: resultado.length,
    })
  } catch (error) {
    console.error('[GET /api/tesis] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener tesis' },
      { status: 500 }
    )
  }
}

// POST /api/tesis - Crear nueva tesis
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario es estudiante
    const isEstudiante = user.roles?.some(
      (r) => r.role.codigo === 'ESTUDIANTE' && r.isActive
    )
    if (!isEstudiante) {
      return NextResponse.json(
        { error: 'Solo los estudiantes pueden crear proyectos de tesis' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      titulo,
      resumen,
      palabrasClave,
      lineaInvestigacion,
      areaConocimiento,
      studentCareerId,
      coautorId,
      asesorId,
      coasesorId,
    } = body

    // Verificar que se especificó una carrera
    if (!studentCareerId) {
      return NextResponse.json(
        { error: 'Debe seleccionar una carrera para el proyecto de tesis' },
        { status: 400 }
      )
    }

    // Verificar que la carrera pertenece al usuario y está activa
    const studentCareer = await prisma.studentCareer.findFirst({
      where: {
        id: studentCareerId,
        userId: user.id,
        isActive: true,
      },
    })

    if (!studentCareer) {
      return NextResponse.json(
        { error: 'La carrera seleccionada no es válida o no pertenece a tu cuenta' },
        { status: 400 }
      )
    }

    // Verificar que el estudiante NO tenga ya una tesis activa para esta carrera
    // Estados activos: cualquier estado excepto RECHAZADA y ARCHIVADA
    const tesisExistente = await prisma.thesis.findFirst({
      where: {
        deletedAt: null,
        estado: {
          notIn: ['RECHAZADA', 'ARCHIVADA'],
        },
        autores: {
          some: {
            userId: user.id,
            studentCareerId: studentCareerId,
          },
        },
      },
      select: {
        id: true,
        titulo: true,
        estado: true,
      },
    })

    if (tesisExistente) {
      return NextResponse.json(
        {
          error: `Ya tienes un proyecto de tesis activo para esta carrera`,
          detalles: {
            tesisId: tesisExistente.id,
            titulo: tesisExistente.titulo,
            estado: tesisExistente.estado,
          },
        },
        { status: 400 }
      )
    }

    // Validaciones básicas
    if (!titulo || titulo.trim().length < 10) {
      return NextResponse.json(
        { error: 'El título debe tener al menos 10 caracteres' },
        { status: 400 }
      )
    }

    if (!asesorId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un asesor' },
        { status: 400 }
      )
    }

    // Crear la tesis
    const tesis = await prisma.thesis.create({
      data: {
        titulo: titulo.trim(),
        resumen: resumen?.trim() || null,
        palabrasClave: palabrasClave || [],
        lineaInvestigacion: lineaInvestigacion?.trim() || null,
        areaConocimiento: areaConocimiento?.trim() || null,
        estado: 'BORRADOR',
        // Agregar autor principal
        autores: {
          create: {
            userId: user.id,
            studentCareerId: studentCareer.id,
            orden: 1,
          },
        },
        // Agregar asesor
        asesores: {
          create: {
            userId: asesorId,
            tipo: 'PRINCIPAL',
            estado: 'PENDIENTE',
          },
        },
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
              },
            },
            studentCareer: {
              select: {
                codigoEstudiante: true,
                carreraNombre: true,
              },
            },
          },
        },
        asesores: {
          include: {
            user: {
              select: {
                id: true,
                nombres: true,
                apellidoPaterno: true,
                apellidoMaterno: true,
              },
            },
          },
        },
      },
    })

    // Agregar coautor si se especifica (con estado PENDIENTE para que acepte la invitación)
    if (coautorId) {
      const coautorCareer = await prisma.studentCareer.findFirst({
        where: { userId: coautorId, isActive: true },
      })

      if (coautorCareer) {
        await prisma.thesisAuthor.create({
          data: {
            thesisId: tesis.id,
            userId: coautorId,
            studentCareerId: coautorCareer.id,
            orden: 2,
            estado: 'PENDIENTE', // El coautor debe aceptar la invitación
          },
        })
      }
    }

    // Agregar coasesor si se especifica
    if (coasesorId) {
      await prisma.thesisAdvisor.create({
        data: {
          thesisId: tesis.id,
          userId: coasesorId,
          tipo: 'CO_ASESOR',
          estado: 'PENDIENTE',
        },
      })
    }

    // Registrar en historial
    await prisma.thesisStatusHistory.create({
      data: {
        thesisId: tesis.id,
        estadoNuevo: 'BORRADOR',
        comentario: 'Proyecto de tesis creado',
        changedById: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: tesis,
      message: 'Proyecto de tesis creado exitosamente',
    })
  } catch (error) {
    console.error('[POST /api/tesis] Error:', error)
    return NextResponse.json(
      { error: 'Error al crear tesis' },
      { status: 500 }
    )
  }
}
