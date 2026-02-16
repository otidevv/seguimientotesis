import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/mis-evaluaciones - Listar tesis donde el usuario es jurado
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fase = searchParams.get('fase')
    const estado = searchParams.get('estado')
    const busqueda = searchParams.get('busqueda')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {
      userId: user.id,
      isActive: true,
      thesis: { deletedAt: null },
    }

    if (fase) {
      where.fase = fase
    }

    if (estado) {
      where.thesis.estado = estado
    }

    if (busqueda) {
      where.thesis.titulo = { contains: busqueda, mode: 'insensitive' }
    }

    // Contadores globales (sin filtros de estado/busqueda)
    const baseWhere: any = {
      userId: user.id,
      isActive: true,
      thesis: { deletedAt: null },
    }
    const [totalAsignadas, pendientesCount, evaluadasCount] = await Promise.all([
      prisma.thesisJury.count({ where: baseWhere }),
      prisma.thesisJury.count({
        where: {
          ...baseWhere,
          thesis: {
            deletedAt: null,
            estado: { in: ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'] },
          },
        },
      }),
      prisma.thesisJury.count({
        where: {
          ...baseWhere,
          evaluaciones: { some: {} },
        },
      }),
    ])

    const [total, jurados] = await Promise.all([
      prisma.thesisJury.count({ where }),
      prisma.thesisJury.findMany({
        where,
        include: {
          thesis: {
            select: {
              id: true,
              titulo: true,
              estado: true,
              rondaActual: true,
              faseActual: true,
              fechaLimiteEvaluacion: true,
              fechaLimiteCorreccion: true,
              autores: {
                include: {
                  user: {
                    select: {
                      nombres: true,
                      apellidoPaterno: true,
                      apellidoMaterno: true,
                    },
                  },
                },
                orderBy: { orden: 'asc' },
                take: 2,
              },
            },
          },
          evaluaciones: {
            orderBy: { ronda: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const resultado = jurados.map((j) => {
      const estadoTesis = j.thesis.estado
      const faseActualTesis = j.thesis.faseActual

      // Determinar si la fase del jurado ya terminó
      const faseTerminada = j.fase === 'PROYECTO' && (
        faseActualTesis === 'INFORME_FINAL' ||
        ['INFORME_FINAL', 'EN_EVALUACION_INFORME', 'OBSERVADA_INFORME', 'APROBADA'].includes(estadoTesis)
      )

      // Para fases terminadas, mostrar el resultado de esa fase, no el estado actual
      let estadoFase = estadoTesis
      let evalMostrar = j.evaluaciones.find((e) => e.ronda === j.thesis.rondaActual)
      let yaEvaluo = !!evalMostrar

      if (faseTerminada) {
        // El proyecto fue aprobado si la tesis pasó a informe final
        estadoFase = 'PROYECTO_APROBADO'
        // Mostrar la última evaluación del jurado en esta fase (la más reciente)
        evalMostrar = j.evaluaciones.length > 0 ? j.evaluaciones[0] : undefined
        yaEvaluo = !!evalMostrar
      }

      return {
        id: j.id,
        thesisId: j.thesis.id,
        tipo: j.tipo,
        fase: j.fase,
        titulo: j.thesis.titulo,
        estado: estadoFase,
        faseTerminada,
        rondaActual: j.thesis.rondaActual,
        faseActual: j.thesis.faseActual,
        fechaLimiteEvaluacion: faseTerminada ? null : j.thesis.fechaLimiteEvaluacion,
        autores: j.thesis.autores.map((a) =>
          `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`
        ).join(', '),
        yaEvaluo,
        miResultado: evalMostrar?.resultado || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: resultado,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
      contadores: {
        total: totalAsignadas,
        pendientes: pendientesCount,
        evaluadas: evaluadasCount,
      },
    })
  } catch (error) {
    console.error('[GET /api/mis-evaluaciones] Error:', error)
    return NextResponse.json({ error: 'Error al obtener evaluaciones' }, { status: 500 })
  }
}
