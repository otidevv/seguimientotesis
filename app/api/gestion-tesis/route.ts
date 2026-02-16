import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/gestion-tesis - Lista de tesis con filtros (ADMIN/SUPER_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Solo ADMIN y SUPER_ADMIN
    const tieneAcceso = user.roles?.some(
      (r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role.codigo) && r.isActive
    )

    if (!tieneAcceso) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a Gestion de Tesis' },
        { status: 403 }
      )
    }

    // Obtener parametros de busqueda
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const busqueda = searchParams.get('busqueda')
    const facultadId = searchParams.get('facultadId')
    const verEliminadas = searchParams.get('eliminadas') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))

    // Construir where clause
    const whereClause: any = {
      deletedAt: verEliminadas ? { not: null } : null,
    }

    // Filtro por estado
    if (estado && estado !== 'TODOS') {
      whereClause.estado = estado
    }

    // Filtro por facultad
    if (facultadId) {
      whereClause.autores = {
        some: {
          studentCareer: {
            facultadId: facultadId,
          },
        },
      }
    }

    // Filtro por busqueda (titulo o nombre de tesista)
    if (busqueda) {
      whereClause.OR = [
        { titulo: { contains: busqueda, mode: 'insensitive' } },
        {
          autores: {
            some: {
              user: {
                OR: [
                  { nombres: { contains: busqueda, mode: 'insensitive' } },
                  { apellidoPaterno: { contains: busqueda, mode: 'insensitive' } },
                  { apellidoMaterno: { contains: busqueda, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ]
    }

    // Query 1: Contadores por estado (sin filtros, solo deletedAt)
    const contadoresRaw = await prisma.thesis.groupBy({
      by: ['estado'],
      where: { deletedAt: null },
      _count: true,
    })

    const contadores: Record<string, number> = {
      BORRADOR: 0,
      EN_REVISION: 0,
      OBSERVADA: 0,
      ASIGNANDO_JURADOS: 0,
      EN_EVALUACION_JURADO: 0,
      OBSERVADA_JURADO: 0,
      PROYECTO_APROBADO: 0,
      INFORME_FINAL: 0,
      EN_EVALUACION_INFORME: 0,
      OBSERVADA_INFORME: 0,
      APROBADA: 0,
      EN_SUSTENTACION: 0,
      SUSTENTADA: 0,
      ARCHIVADA: 0,
      RECHAZADA: 0,
    }

    contadoresRaw.forEach((c) => {
      if (c.estado in contadores) {
        contadores[c.estado] = c._count
      }
    })

    // Calcular resumen
    const total = Object.values(contadores).reduce((sum, v) => sum + v, 0)
    const activas = total - contadores.ARCHIVADA - contadores.RECHAZADA
    const eliminadasCount = await prisma.thesis.count({ where: { deletedAt: { not: null } } })

    // Query 2: Lista paginada
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
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Formatear respuesta
    const data = tesis.map((t) => {
      const primerAutor = t.autores[0]
      const asesorPrincipal = t.asesores.find((a) => a.tipo === 'PRINCIPAL')

      // Determinar fase
      let fase = 'Proyecto'
      const estadosInforme = ['INFORME_FINAL', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'APROBADA', 'EN_SUSTENTACION', 'SUSTENTADA']
      if (estadosInforme.includes(t.estado)) {
        fase = 'Informe Final'
      } else if (t.estado === 'ARCHIVADA' || t.estado === 'RECHAZADA') {
        fase = 'Finalizada'
      }

      return {
        id: t.id,
        codigo: t.id.slice(-8).toUpperCase(),
        titulo: t.titulo,
        estado: t.estado,
        fase,
        fechaCreacion: t.createdAt,
        fechaActualizacion: t.updatedAt,
        eliminada: !!t.deletedAt,
        autorPrincipal: primerAutor ? {
          nombre: `${primerAutor.user.apellidoPaterno} ${primerAutor.user.apellidoMaterno}, ${primerAutor.user.nombres}`,
          codigo: primerAutor.studentCareer?.codigoEstudiante,
          email: primerAutor.user.email,
        } : null,
        cantidadAutores: t.autores.length,
        asesor: asesorPrincipal ? {
          nombre: `${asesorPrincipal.user.apellidoPaterno} ${asesorPrincipal.user.apellidoMaterno}, ${asesorPrincipal.user.nombres}`,
        } : null,
        carrera: primerAutor?.studentCareer?.carreraNombre || 'Sin carrera',
        facultad: primerAutor?.studentCareer?.facultad || null,
      }
    })

    // Query 3: Lista de facultades para filtro
    const facultades = await prisma.faculty.findMany({
      select: {
        id: true,
        nombre: true,
        codigo: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data,
      contadores,
      resumen: {
        total,
        activas,
        eliminadas: eliminadasCount,
      },
      facultades,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    })
  } catch (error) {
    console.error('[GET /api/gestion-tesis] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener tesis' },
      { status: 500 }
    )
  }
}
