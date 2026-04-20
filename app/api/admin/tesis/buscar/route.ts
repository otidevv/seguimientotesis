/**
 * GET /api/admin/tesis/buscar?q=<query>&limit=10
 *
 * Busqueda de tesis por titulo, codigo de autor, DNI de autor o nombre.
 * Usado por el admin (por ejemplo para crear prorrogas de calendario apuntando
 * a una tesis especifica).
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

  if (q.length < 2) return NextResponse.json({ tesis: [] })

  const tesis = await prisma.thesis.findMany({
    where: {
      deletedAt: null,
      OR: [
        { titulo: { contains: q, mode: 'insensitive' } },
        {
          autores: {
            some: {
              estado: 'ACEPTADO',
              OR: [
                { user: { nombres: { contains: q, mode: 'insensitive' } } },
                { user: { apellidoPaterno: { contains: q, mode: 'insensitive' } } },
                { user: { apellidoMaterno: { contains: q, mode: 'insensitive' } } },
                { user: { numeroDocumento: { contains: q } } },
                { studentCareer: { codigoEstudiante: { contains: q } } },
              ],
            },
          },
        },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, titulo: true, estado: true,
      autores: {
        where: { estado: 'ACEPTADO' },
        orderBy: { orden: 'asc' },
        select: {
          user: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
          studentCareer: { select: { codigoEstudiante: true, facultad: { select: { codigo: true, nombre: true } } } },
        },
      },
    },
  })

  return NextResponse.json({
    tesis: tesis.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      estado: t.estado,
      autores: t.autores.map((a) => ({
        nombreCompleto: `${a.user.apellidoPaterno} ${a.user.apellidoMaterno}, ${a.user.nombres}`,
        documento: a.user.numeroDocumento,
        codigo: a.studentCareer.codigoEstudiante,
        facultadCodigo: a.studentCareer.facultad.codigo,
      })),
    })),
  })
}
