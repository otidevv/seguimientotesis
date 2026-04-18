import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/mis-desistimientos - Lista solicitudes de desistimiento del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const desistimientos = await prisma.thesisWithdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { thesis: { select: { titulo: true } } },
    })

    return NextResponse.json({ data: desistimientos })
  } catch (error) {
    console.error('[mis-desistimientos] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
