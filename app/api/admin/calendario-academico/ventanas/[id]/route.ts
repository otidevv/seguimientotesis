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

const PatchBody = z.object({
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  habilitada: z.boolean().optional(),
  observaciones: z.string().nullable().optional(),
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

  const prev = await prisma.academicWindow.findUnique({
    where: { id },
    include: { periodo: { select: { fechaInicio: true, fechaFin: true, nombre: true } } },
  })
  if (!prev) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const fechaInicio = parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : prev.fechaInicio
  const fechaFin = parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : prev.fechaFin
  if (fechaFin <= fechaInicio) {
    return NextResponse.json({ error: 'fechaFin debe ser posterior a fechaInicio' }, { status: 400 })
  }
  if (fechaInicio < prev.periodo.fechaInicio || fechaFin > prev.periodo.fechaFin) {
    return NextResponse.json({
      error: `La ventana debe caer dentro del periodo "${prev.periodo.nombre}" (${prev.periodo.fechaInicio.toISOString().slice(0, 10)} — ${prev.periodo.fechaFin.toISOString().slice(0, 10)}).`,
    }, { status: 400 })
  }

  const actualizada = await prisma.academicWindow.update({
    where: { id },
    data: {
      fechaInicio,
      fechaFin,
      ...(parsed.data.habilitada !== undefined ? { habilitada: parsed.data.habilitada } : {}),
      ...(parsed.data.observaciones !== undefined ? { observaciones: parsed.data.observaciones } : {}),
    },
  })
  return NextResponse.json({ ventana: actualizada })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const existe = await prisma.academicWindow.findUnique({ where: { id }, select: { id: true } })
  if (!existe) return NextResponse.json({ error: 'Ventana no encontrada' }, { status: 404 })

  await prisma.academicWindow.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
