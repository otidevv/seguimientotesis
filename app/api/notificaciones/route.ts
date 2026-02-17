import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/notificaciones - Listar notificaciones del usuario actual
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true'

    const where = {
      userId: user.id,
      ...(soloNoLeidas && { leida: false }),
    }

    const [notificaciones, noLeidasCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: user.id, leida: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: notificaciones,
      noLeidasCount,
    })
  } catch (error) {
    console.error('[GET /api/notificaciones] Error:', error)
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

// PUT /api/notificaciones - Marcar notificaciones como leídas
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, todas } = body

    if (todas) {
      await prisma.notification.updateMany({
        where: { userId: user.id, leida: false },
        data: { leida: true },
      })
    } else if (Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { leida: true },
      })
    } else {
      return NextResponse.json({ error: 'Debe enviar ids o todas: true' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PUT /api/notificaciones] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 })
  }
}
