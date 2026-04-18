import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, EstadoSolicitudDesistimiento } from '@prisma/client'
import { getCurrentUser, checkPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const puede = await checkPermission(user.id, 'mesa-partes', 'view')
    if (!puede) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') ?? 'PENDIENTE'
    const facultadId = searchParams.get('facultadId') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20', 10), 100)

    const where: Prisma.ThesisWithdrawalWhereInput = {}
    if (estado !== 'TODOS') where.estadoSolicitud = estado as EstadoSolicitudDesistimiento
    if (facultadId) where.facultadIdSnapshot = facultadId

    const [total, items] = await Promise.all([
      prisma.thesisWithdrawal.count({ where }),
      prisma.thesisWithdrawal.findMany({
        where,
        orderBy: { solicitadoAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
          thesis: { select: { id: true, titulo: true, estado: true } },
          facultadSnapshot: { select: { nombre: true, codigo: true } },
        },
      }),
    ])

    return NextResponse.json({
      total, page, pageSize,
      items: items.map(w => ({
        id: w.id,
        thesisId: w.thesisId,
        tituloTesis: w.thesis.titulo,
        estudiante: `${w.user.apellidoPaterno} ${w.user.apellidoMaterno}, ${w.user.nombres}`,
        documento: w.user.numeroDocumento,
        carrera: w.carreraNombreSnapshot,
        facultad: w.facultadSnapshot.nombre,
        motivoCategoria: w.motivoCategoria,
        estadoSolicitud: w.estadoSolicitud,
        estadoTesisAlSolicitar: w.estadoTesisAlSolicitar,
        teniaCoautor: w.teniaCoautor,
        solicitadoAt: w.solicitadoAt,
        aprobadoAt: w.aprobadoAt,
      })),
    })
  } catch (error) {
    console.error('[Mesa-partes desistimientos list]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
