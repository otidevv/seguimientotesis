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

const PatchBody = z.object({
  nombre: z.string().min(1).max(50).optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  estado: z.enum(['PLANIFICADO', 'ACTIVO', 'CERRADO']).optional(),
  esActual: z.boolean().optional(),
  observaciones: z.string().nullable().optional(),
})

/** GET detalle con ventanas */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const periodo = await prisma.academicPeriod.findUnique({
    where: { id },
    include: {
      facultad: { select: { id: true, nombre: true, codigo: true } },
      ventanas: {
        orderBy: { tipo: 'asc' },
        include: {
          facultad: { select: { id: true, nombre: true, codigo: true } },
          _count: { select: { overrides: true } },
        },
      },
    },
  })
  if (!periodo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ periodo })
}

/** PATCH edita periodo */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const json = await request.json()
  const parsed = PatchBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }, { status: 400 })
  }

  // Todas las validaciones que dependen de estado de BD corren dentro de la
  // transaccion, para que dos admins concurrentes no puedan pasar los checks
  // a la vez y terminar con solapamientos. Usamos un error custom para propagar
  // respuestas HTTP fuera de la transaccion.
  class ValidationError extends Error {
    status: number
    constructor(message: string, status = 400) { super(message); this.status = status }
  }

  try {
    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('academic_periods_mutex'))`

      const periodoPrev = await tx.academicPeriod.findUnique({ where: { id } })
      if (!periodoPrev) throw new ValidationError('No encontrado', 404)

      const fechaInicio = parsed.data.fechaInicio ? new Date(parsed.data.fechaInicio) : periodoPrev.fechaInicio
      const fechaFin = parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : periodoPrev.fechaFin
      if (fechaFin <= fechaInicio) {
        throw new ValidationError('fechaFin debe ser posterior a fechaInicio', 400)
      }

      if (parsed.data.fechaInicio || parsed.data.fechaFin) {
        const solapado = await tx.academicPeriod.findFirst({
          where: {
            id: { not: id },
            facultadId: periodoPrev.facultadId,
            fechaInicio: { lte: fechaFin },
            fechaFin: { gte: fechaInicio },
          },
          select: { id: true, nombre: true, fechaInicio: true, fechaFin: true },
        })
        if (solapado) {
          throw new ValidationError(
            `El rango se solapa con el periodo "${solapado.nombre}" (${isoDateLima(solapado.fechaInicio)} — ${isoDateLima(solapado.fechaFin)}).`,
            409,
          )
        }
        const ventanasFuera = await tx.academicWindow.findFirst({
          where: {
            periodoId: id,
            OR: [
              { fechaInicio: { lt: fechaInicio } },
              { fechaFin: { gt: fechaFin } },
            ],
          },
          select: { id: true, tipo: true },
        })
        if (ventanasFuera) {
          throw new ValidationError(
            `Hay ventanas (ej. ${ventanasFuera.tipo}) que quedarian fuera del nuevo rango. Ajustalas primero.`,
            409,
          )
        }
      }

      if (parsed.data.esActual === true) {
        await tx.academicPeriod.updateMany({
          where: { facultadId: periodoPrev.facultadId, esActual: true, NOT: { id } },
          data: { esActual: false },
        })
      }
      return tx.academicPeriod.update({
        where: { id },
        data: {
          ...(parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre } : {}),
          ...(parsed.data.estado !== undefined ? { estado: parsed.data.estado } : {}),
          ...(parsed.data.esActual !== undefined ? { esActual: parsed.data.esActual } : {}),
          ...(parsed.data.observaciones !== undefined ? { observaciones: parsed.data.observaciones } : {}),
          fechaInicio,
          fechaFin,
        },
      })
    })
    return NextResponse.json({ periodo: actualizado })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

/** DELETE solo si no tiene ventanas ni se usa */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth
  const { id } = await params

  const existe = await prisma.academicPeriod.findUnique({ where: { id }, select: { id: true } })
  if (!existe) return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })

  const ventanas = await prisma.academicWindow.count({ where: { periodoId: id } })
  if (ventanas > 0) {
    return NextResponse.json({
      error: 'No se puede eliminar: el periodo tiene ventanas asociadas. Elimina las ventanas primero.',
    }, { status: 409 })
  }
  await prisma.academicPeriod.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
