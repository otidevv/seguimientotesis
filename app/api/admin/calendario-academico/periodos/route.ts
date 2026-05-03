import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isoDateLima } from '@/lib/academic-calendar'
import { z } from 'zod'

function requireAdmin(request: NextRequest): { userId: string } | NextResponse {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rolesHeader = request.headers.get('x-user-roles')
  const roles: string[] = rolesHeader ? JSON.parse(rolesHeader) : []
  if (!roles.includes('SUPER_ADMIN') && !roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Solo administradores pueden gestionar el calendario' }, { status: 403 })
  }
  return { userId }
}

const TIPOS_VENTANA = [
  'PRESENTACION_PROYECTO',
  'REVISION_MESA_PARTES',
  'ASIGNACION_JURADOS',
  'EVALUACION_JURADO',
  'INFORME_FINAL',
  'SUSTENTACION',
  'DESISTIMIENTO',
] as const

const CreateBody = z.object({
  anio: z.number().int().min(2000).max(2100),
  semestre: z.enum(['I', 'II', 'VERANO']),
  nombre: z.string().min(1).max(50),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  estado: z.enum(['PLANIFICADO', 'ACTIVO', 'CERRADO']).default('PLANIFICADO'),
  esActual: z.boolean().default(false),
  facultadId: z.string().nullable().optional(),
  observaciones: z.string().optional(),
  /**
   * Inicializacion de ventanas: 'ninguna' (default), 'defecto' (7 tipos cubriendo
   * el rango completo del periodo), o 'copiar' (copia ventanas de otro periodo
   * del mismo scope, ajustando fechas por el offset del rango).
   */
  ventanasInit: z.enum(['ninguna', 'defecto', 'copiar']).default('ninguna'),
  copiarDePeriodoId: z.string().optional(),
})

/** GET /api/admin/calendario-academico/periodos */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const periodos = await prisma.academicPeriod.findMany({
    orderBy: [{ anio: 'desc' }, { semestre: 'asc' }],
    include: {
      facultad: { select: { id: true, nombre: true, codigo: true } },
      _count: { select: { ventanas: true } },
    },
  })
  return NextResponse.json({ periodos })
}

/** POST /api/admin/calendario-academico/periodos */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  const json = await request.json()
  const parsed = CreateBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos invalidos' }, { status: 400 })
  }
  const { fechaInicio, fechaFin, facultadId, esActual, ventanasInit, copiarDePeriodoId, ...rest } = parsed.data

  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  if (fin <= inicio) {
    return NextResponse.json({ error: 'fechaFin debe ser posterior a fechaInicio' }, { status: 400 })
  }
  if (ventanasInit === 'copiar' && !copiarDePeriodoId) {
    return NextResponse.json({ error: 'Debes indicar copiarDePeriodoId cuando ventanasInit=copiar' }, { status: 400 })
  }

  class ValidationError extends Error {
    status: number
    constructor(message: string, status = 400) { super(message); this.status = status }
  }

  try {
    const { creado, ventanasCreadas } = await prisma.$transaction(async (tx) => {
      // Advisory lock evita que dos POST concurrentes pasen ambos los checks
      // de duplicado/solapamiento y luego inserten rangos solapados. El lock
      // es scope-transaccion: se libera en commit/rollback.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('academic_periods_mutex'))`

      const duplicado = await tx.academicPeriod.findFirst({
        where: { anio: rest.anio, semestre: rest.semestre, facultadId: facultadId ?? null },
      })
      if (duplicado) {
        throw new ValidationError('Ya existe un periodo con ese anio, semestre y facultad', 409)
      }

      const solapado = await tx.academicPeriod.findFirst({
        where: {
          facultadId: facultadId ?? null,
          fechaInicio: { lte: fin },
          fechaFin: { gte: inicio },
        },
        select: { id: true, nombre: true, fechaInicio: true, fechaFin: true },
      })
      if (solapado) {
        throw new ValidationError(
          `El rango se solapa con el periodo "${solapado.nombre}" (${isoDateLima(solapado.fechaInicio)} — ${isoDateLima(solapado.fechaFin)}).`,
          409,
        )
      }

      if (esActual) {
        await tx.academicPeriod.updateMany({
          where: { facultadId: facultadId ?? null, esActual: true },
          data: { esActual: false },
        })
      }
      const creado = await tx.academicPeriod.create({
        data: {
          ...rest,
          facultadId: facultadId ?? null,
          esActual,
          fechaInicio: inicio,
          fechaFin: fin,
        },
      })

      // Inicializacion de ventanas
      let ventanasCreadas = 0
      if (ventanasInit === 'defecto') {
        await tx.academicWindow.createMany({
          data: TIPOS_VENTANA.map((tipo) => ({
            periodoId: creado.id,
            tipo,
            facultadId: null,
            fechaInicio: inicio,
            fechaFin: fin,
            habilitada: true,
          })),
        })
        ventanasCreadas = TIPOS_VENTANA.length
      } else if (ventanasInit === 'copiar' && copiarDePeriodoId) {
        const src = await tx.academicPeriod.findUnique({
          where: { id: copiarDePeriodoId },
          include: { ventanas: true },
        })
        if (!src) throw new ValidationError('Periodo fuente no encontrado', 404)
        if (src.facultadId !== (facultadId ?? null)) {
          throw new ValidationError(
            'El periodo fuente debe ser del mismo scope (global o misma facultad).',
            400,
          )
        }
        if (src.ventanas.length === 0) {
          throw new ValidationError('El periodo fuente no tiene ventanas para copiar.', 400)
        }
        // Offset entre inicios: desplazar cada ventana la misma distancia
        const offset = inicio.getTime() - src.fechaInicio.getTime()
        const data = src.ventanas.map((v) => {
          const nuevoInicio = new Date(v.fechaInicio.getTime() + offset)
          const nuevoFin = new Date(v.fechaFin.getTime() + offset)
          // Clamp al rango del nuevo periodo (si la ventana fuente era mas larga)
          const clampInicio = nuevoInicio < inicio ? inicio : nuevoInicio > fin ? fin : nuevoInicio
          const clampFin = nuevoFin > fin ? fin : nuevoFin < inicio ? inicio : nuevoFin
          return {
            periodoId: creado.id,
            tipo: v.tipo,
            facultadId: v.facultadId,
            fechaInicio: clampInicio,
            fechaFin: clampFin > clampInicio ? clampFin : new Date(clampInicio.getTime() + 60000),
            habilitada: v.habilitada,
            observaciones: v.observaciones,
          }
        })
        await tx.academicWindow.createMany({ data })
        ventanasCreadas = data.length
      }

      return { creado, ventanasCreadas }
    })
    return NextResponse.json({ periodo: creado, ventanasCreadas }, { status: 201 })
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
