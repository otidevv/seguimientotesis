import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    // Verificar si es admin (puede ver todas las facultades)
    const esAdmin = user.roles?.some(
      (r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    // Obtener el contexto de facultad del rol MESA_PARTES (si existe y no es admin)
    const rolMesaPartes = !esAdmin ? user.roles?.find(
      (r) => r.role.codigo === 'MESA_PARTES' && r.isActive
    ) : null

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const facultadId = searchParams.get('facultadId') || rolMesaPartes?.contextId

    // DEBUG logs
    console.log('[MESA-PARTES] Usuario:', user.email)
    console.log('[MESA-PARTES] Es Admin:', esAdmin)
    console.log('[MESA-PARTES] Rol Mesa Partes:', rolMesaPartes ? { contextType: rolMesaPartes.contextType, contextId: rolMesaPartes.contextId } : null)
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
        tieneCartaAsesor: t.documentos.some((d) => d.tipo === 'CARTA_ACEPTACION_ASESOR' && d.firmadoDigitalmente),
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

    const contadoresFormateados = {
      EN_REVISION: 0,
      OBSERVADA: 0,
      APROBADA: 0,
      RECHAZADA: 0,
    }

    contadores.forEach((c) => {
      if (c.estado in contadoresFormateados) {
        contadoresFormateados[c.estado as keyof typeof contadoresFormateados] = c._count
      }
    })

    console.log('[MESA-PARTES] Tesis encontradas:', tesis.length)
    console.log('[MESA-PARTES] Contadores:', contadoresFormateados)

    return NextResponse.json({
      success: true,
      data: resultado,
      contadores: contadoresFormateados,
      total: resultado.length,
    })
  } catch (error) {
    console.error('[GET /api/mesa-partes] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    )
  }
}
