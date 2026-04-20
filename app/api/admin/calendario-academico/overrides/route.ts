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

const CreateBody = z.object({
  windowId: z.string().min(1),
  thesisId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  categoria: z.enum(CATEGORIAS).default('OTRO'),
  motivo: z.string().min(10, 'Minimo 10 caracteres').max(2000),
  vigenciaHasta: z.string().datetime(),
}).refine(
  // No permitir setear ambos thesisId y userId a la vez: ambiguo
  (d) => !(d.thesisId && d.userId),
  { message: 'No puedes aplicar a una tesis y un usuario a la vez. Elige uno.' },
)

/** GET ?windowId= */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const windowId = searchParams.get('windowId')
  if (!windowId) return NextResponse.json({ error: 'windowId requerido' }, { status: 400 })

  const overrides = await prisma.academicWindowOverride.findMany({
    where: { windowId },
    orderBy: { createdAt: 'desc' },
    include: {
      thesis: { select: { id: true, titulo: true } },
      user: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true } },
      autorizadoPor: { select: { id: true, nombres: true, apellidoPaterno: true } },
    },
  })
  return NextResponse.json({ overrides })
}

/** POST */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const json = await request.json()
  const parsed = CreateBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }, { status: 400 })
  }

  const vigencia = new Date(parsed.data.vigenciaHasta)
  if (vigencia <= new Date()) {
    return NextResponse.json({ error: 'vigenciaHasta debe ser futura' }, { status: 400 })
  }

  // Validar FKs — evitar 500 por constraint violations
  const windowExists = await prisma.academicWindow.findUnique({
    where: { id: parsed.data.windowId }, select: { id: true },
  })
  if (!windowExists) {
    return NextResponse.json({ error: 'Ventana no encontrada' }, { status: 404 })
  }
  if (parsed.data.thesisId) {
    const t = await prisma.thesis.findUnique({ where: { id: parsed.data.thesisId }, select: { id: true } })
    if (!t) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })
  }
  if (parsed.data.userId) {
    const u = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } })
    if (!u) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const override = await prisma.academicWindowOverride.create({
    data: {
      windowId: parsed.data.windowId,
      thesisId: parsed.data.thesisId ?? null,
      userId: parsed.data.userId ?? null,
      categoria: parsed.data.categoria,
      motivo: parsed.data.motivo,
      vigenciaHasta: vigencia,
      autorizadoPorId: auth.userId,
    },
  })
  return NextResponse.json({ override }, { status: 201 })
}
