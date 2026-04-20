/**
 * GET /api/admin/users/buscar?q=<query>&limit=10
 * Busqueda de usuarios por nombre, apellido, DNI o email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function requireAdmin(request: NextRequest): { userId: string } | NextResponse {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const roles: string[] = JSON.parse(request.headers.get('x-user-roles') ?? '[]')
  if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }
  return { userId }
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 25)

  if (q.length < 2) return NextResponse.json({ users: [] })

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidoPaterno: { contains: q, mode: 'insensitive' } },
        { apellidoMaterno: { contains: q, mode: 'insensitive' } },
        { numeroDocumento: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { apellidoPaterno: 'asc' },
    select: {
      id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
      numeroDocumento: true, email: true,
      roles: { where: { isActive: true }, select: { role: { select: { codigo: true } } } },
    },
  })

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      nombreCompleto: `${u.apellidoPaterno} ${u.apellidoMaterno}, ${u.nombres}`,
      documento: u.numeroDocumento,
      email: u.email,
      roles: u.roles.map((r) => r.role.codigo),
    })),
  })
}
