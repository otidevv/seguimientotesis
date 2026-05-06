import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, checkPermission } from '@/lib/auth'
import { getMesaPartesScope } from '@/lib/auth/scope'

// GET /api/mesa-partes - Listar proyectos de tesis para mesa de partes
export async function GET(request: NextRequest) {
  try {
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

    // Resolver scope con fail-closed: rol mesa-partes mal configurado → 403.
    // Antes (bug #6) un MESA_PARTES sin contextId quedaba como "global" y
    // veía listados de todas las facultades — escalada horizontal.
    const scope = getMesaPartesScope(user)
    if (!scope) {
      return NextResponse.json(
        { error: 'Tu rol de mesa-partes no tiene una facultad asignada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    // Si el rol tiene scope de facultad, se enforza (ignora el query param).
    // Solo admin puede usar ?facultadId= libremente.
    const facultadId = scope.esAdmin
      ? searchParams.get('facultadId')
      : scope.facultadId
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

    // DEBUG logs
    console.log('[MESA-PARTES] Usuario:', user.email)
    console.log('[MESA-PARTES] Scope:', scope)
    console.log('[MESA-PARTES] FacultadId filtro:', facultadId)
    console.log('[MESA-PARTES] Estado filtro:', estado || 'EN_REVISION')

    // Si el usuario tiene contexto de facultad, solo puede ver de esa facultad
    // Si no tiene contexto, puede ver de todas (admin de mesa)
    const whereClause: any = {
      deletedAt: null,
      estado: estado || 'EN_REVISION', // Por defecto mostrar los que están en revisión
    }

    // Filtrar por facultad si se especifica
    if (facultadId) {
      whereClause.autores = {
        some: {
          studentCareer: {
            facultadId: facultadId,
          },
        },
      }
    }

    // Contar total para paginación
    const totalItems = await prisma.thesis.count({ where: whereClause })
    const totalPages = Math.ceil(totalItems / limit)

    const tesis = await prisma.thesis.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
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
            firmadoDigitalmente: true,
            requiereActualizacion: true,
          },
        },
        historialEstados: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            createdAt: true,
            estadoNuevo: true,
            comentario: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Formatear respuesta
    const resultado = tesis.map((t) => {
      const primerAutor = t.autores[0]
      const asesorPrincipal = t.asesores.find((a) => a.tipo === 'PRINCIPAL')

      return {
        id: t.id,
        codigo: t.id.slice(-8).toUpperCase(),
        titulo: t.titulo,
        estado: t.estado,
        fechaEnvio: t.historialEstados[0]?.createdAt || t.updatedAt,
        // Datos del autor principal
        autorPrincipal: primerAutor ? {
          nombre: `${primerAutor.user.apellidoPaterno} ${primerAutor.user.apellidoMaterno}, ${primerAutor.user.nombres}`,
          codigo: primerAutor.studentCareer?.codigoEstudiante,
          email: primerAutor.user.email,
        } : null,
        // Cantidad de autores
        cantidadAutores: t.autores.length,
        // Datos del asesor
        asesor: asesorPrincipal ? {
          nombre: `${asesorPrincipal.user.apellidoPaterno} ${asesorPrincipal.user.apellidoMaterno}, ${asesorPrincipal.user.nombres}`,
          estado: asesorPrincipal.estado,
        } : null,
        // Carrera y facultad
        carrera: primerAutor?.studentCareer?.carreraNombre || 'Sin carrera',
        facultad: primerAutor?.studentCareer?.facultad || null,
        // Documentos
        tieneProyecto: t.documentos.some((d) => d.tipo === 'PROYECTO'),
        // Carta firmada y vigente (no marcada para actualización tras cambio de autores)
        tieneCartaAsesor: t.documentos.some(
          (d) => d.tipo === 'CARTA_ACEPTACION_ASESOR' && d.firmadoDigitalmente && !d.requiereActualizacion,
        ),
        documentosCount: t.documentos.length,
      }
    })

    // Obtener contadores por estado
    const contadores = await prisma.thesis.groupBy({
      by: ['estado'],
      where: {
        deletedAt: null,
        ...(facultadId && {
          autores: {
            some: {
              studentCareer: {
                facultadId: facultadId,
              },
            },
          },
        }),
      },
      _count: true,
    })

    const contadoresFormateados: Record<string, number> = {
      EN_REVISION: 0,
      OBSERVADA: 0,
      ASIGNANDO_JURADOS: 0,
      EN_EVALUACION_JURADO: 0,
      OBSERVADA_JURADO: 0,
      PROYECTO_APROBADO: 0,
      INFORME_FINAL: 0,
      EN_REVISION_INFORME: 0,
      EN_EVALUACION_INFORME: 0,
      OBSERVADA_INFORME: 0,
      APROBADA: 0,
      EN_SUSTENTACION: 0,
      RECHAZADA: 0,
      SOLICITUD_DESISTIMIENTO: 0,
    }

    contadores.forEach((c) => {
      if (c.estado in contadoresFormateados) {
        contadoresFormateados[c.estado] = c._count
      }
    })

    // Contador de solicitudes de desistimiento pendientes (para quick-access card)
    const desistimientosPendientes = await prisma.thesisWithdrawal.count({
      where: {
        estadoSolicitud: 'PENDIENTE',
        ...(facultadId && { facultadIdSnapshot: facultadId }),
      },
    })

    console.log('[MESA-PARTES] Tesis encontradas:', tesis.length)
    console.log('[MESA-PARTES] Contadores:', contadoresFormateados)

    // Obtener nombre de la facultad asignada (si aplica)
    let facultadNombre: string | null = null
    if (facultadId) {
      const facultad = await prisma.faculty.findUnique({
        where: { id: facultadId },
        select: { nombre: true },
      })
      facultadNombre = facultad?.nombre || null
    }

    return NextResponse.json({
      success: true,
      data: resultado,
      contadores: contadoresFormateados,
      desistimientosPendientes,
      facultadAsignada: facultadNombre,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    })
  } catch (error) {
    console.error('[GET /api/mesa-partes] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    )
  }
}
