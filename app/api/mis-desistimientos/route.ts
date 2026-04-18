import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/mis-desistimientos - Lista solicitudes de desistimiento del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const estadoSolicitud = searchParams.get('estadoSolicitud') ?? undefined

    const desistimientos = await prisma.thesisWithdrawal.findMany({
      where: {
        userId: user.id,
        ...(estadoSolicitud ? { estadoSolicitud: estadoSolicitud as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        thesis: { select: { id: true, titulo: true, estado: true } },
        facultadSnapshot: { select: { nombre: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: desistimientos.map((d) => ({
        id: d.id,
        thesisId: d.thesisId,
        tituloTesis: d.thesis.titulo,
        estadoTesisActual: d.thesis.estado,
        estadoSolicitud: d.estadoSolicitud,
        motivoCategoria: d.motivoCategoria,
        motivoDescripcion: d.motivoDescripcion,
        solicitadoAt: d.solicitadoAt,
        aprobadoAt: d.aprobadoAt,
        teniaCoautor: d.teniaCoautor,
        estadoTesisAlSolicitar: d.estadoTesisAlSolicitar,
        carreraNombre: d.carreraNombreSnapshot,
        facultad: d.facultadSnapshot.nombre,
      })),
    })
  } catch (error) {
    console.error('[mis-desistimientos] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
