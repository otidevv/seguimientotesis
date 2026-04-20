import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function requireAdmin(request: NextRequest): { userId: string } | NextResponse {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const roles: string[] = JSON.parse(request.headers.get('x-user-roles') ?? '[]')
  if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Solo administradores pueden gestionar el calendario' }, { status: 403 })
  }
  return { userId }
}

const CATEGORIAS = ['CASO_FORTUITO', 'FUERZA_MAYOR', 'ERROR_ADMINISTRATIVO', 'REPRESENTANTE_OFICIAL', 'OTRO'] as const

const PatchBody = z.object({
  categoria: z.enum(CATEGORIAS).optional(),
  motivo: z.string().min(10, 'Minimo 10 caracteres').max(2000).optional(),
  vigenciaHasta: z.string().datetime().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const json = await request.json()
  const parsed = PatchBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }, { status: 400 })
  }

  const existe = await prisma.academicWindowOverride.findUnique({ where: { id }, select: { id: true } })
  if (!existe) return NextResponse.json({ error: 'Prorroga no encontrada' }, { status: 404 })

  if (parsed.data.vigenciaHasta) {
    const vig = new Date(parsed.data.vigenciaHasta)
    if (vig <= new Date()) {
      return NextResponse.json({ error: 'vigenciaHasta debe ser futura' }, { status: 400 })
    }
  }

  const updated = await prisma.academicWindowOverride.update({
    where: { id },
    data: {
      ...(parsed.data.categoria !== undefined ? { categoria: parsed.data.categoria } : {}),
      ...(parsed.data.motivo !== undefined ? { motivo: parsed.data.motivo } : {}),
      ...(parsed.data.vigenciaHasta !== undefined ? { vigenciaHasta: new Date(parsed.data.vigenciaHasta) } : {}),
    },
  })
  return NextResponse.json({ override: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const existe = await prisma.academicWindowOverride.findUnique({ where: { id }, select: { id: true } })
  if (!existe) return NextResponse.json({ error: 'Prorroga no encontrada' }, { status: 404 })

  await prisma.academicWindowOverride.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
