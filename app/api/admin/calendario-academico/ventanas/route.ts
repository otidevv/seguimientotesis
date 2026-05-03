import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isoDateLima } from '@/lib/academic-calendar'
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

const CreateBody = z.object({
  periodoId: z.string().min(1),
  tipo: z.enum([
    'PRESENTACION_PROYECTO',
    'REVISION_MESA_PARTES',
    'ASIGNACION_JURADOS',
    'EVALUACION_JURADO',
    'INFORME_FINAL',
    'SUSTENTACION',
    'DESISTIMIENTO',
  ]),
  facultadId: z.string().nullable().optional(),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  habilitada: z.boolean().default(true),
  observaciones: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const json = await request.json()
  const parsed = CreateBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }, { status: 400 })
  }
  const { fechaInicio, fechaFin, facultadId, ...rest } = parsed.data

  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  if (fin <= inicio) {
    return NextResponse.json({ error: 'fechaFin debe ser posterior a fechaInicio' }, { status: 400 })
  }

  // Validar que el periodo exista y que la ventana caiga dentro de sus fechas
  const periodo = await prisma.academicPeriod.findUnique({
    where: { id: rest.periodoId },
    select: { id: true, fechaInicio: true, fechaFin: true, nombre: true },
  })
  if (!periodo) {
    return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
  }
  if (inicio < periodo.fechaInicio || fin > periodo.fechaFin) {
    return NextResponse.json({
      error: `La ventana debe caer dentro del periodo "${periodo.nombre}" (${isoDateLima(periodo.fechaInicio)} — ${isoDateLima(periodo.fechaFin)}).`,
    }, { status: 400 })
  }

  if (facultadId) {
    const fac = await prisma.faculty.findUnique({ where: { id: facultadId }, select: { id: true } })
    if (!fac) return NextResponse.json({ error: 'Facultad no encontrada' }, { status: 404 })
  }

  const duplicada = await prisma.academicWindow.findFirst({
    where: { periodoId: rest.periodoId, tipo: rest.tipo, facultadId: facultadId ?? null },
  })
  if (duplicada) {
    return NextResponse.json({ error: 'Ya existe una ventana con ese tipo y facultad en este periodo' }, { status: 409 })
  }

  const creada = await prisma.academicWindow.create({
    data: {
      ...rest,
      facultadId: facultadId ?? null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
    },
  })
  return NextResponse.json({ ventana: creada }, { status: 201 })
}
