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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      userId: user.id,
      isActive: true,
      thesis: { deletedAt: null },
    }

    if (fase) {
      where.fase = fase
    }

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
      const evalActual = j.evaluaciones.find((e) => e.ronda === j.thesis.rondaActual)
      return {
        id: j.id,
        thesisId: j.thesis.id,
        tipo: j.tipo,
        fase: j.fase,
        titulo: j.thesis.titulo,
        estado: j.thesis.estado,
        rondaActual: j.thesis.rondaActual,
        faseActual: j.thesis.faseActual,
        fechaLimiteEvaluacion: j.thesis.fechaLimiteEvaluacion,
        autores: j.thesis.autores.map((a) =>
          `${a.user.nombres} ${a.user.apellidoPaterno} ${a.user.apellidoMaterno}`
        ).join(', '),
        yaEvaluo: !!evalActual,
        miResultado: evalActual?.resultado || null,
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
    })
  } catch (error) {
    console.error('[GET /api/mis-evaluaciones] Error:', error)
    return NextResponse.json({ error: 'Error al obtener evaluaciones' }, { status: 500 })
  }
}
