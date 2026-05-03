/**
 * POST /api/tesis/[id]/solicitar-ampliacion
 *
 * Solicita una ampliación de 30 días calendario al `fechaLimiteCorreccion`.
 *
 * Reglamento UNAMAD — Fase de gestión de proyecto: el tesista puede pedir
 * 30 días adicionales una sola vez por ronda, basta con adjuntar motivo.
 * La aprobación es automática (mesa de partes recibe el registro como
 * audit trail, no necesita aprobar nada).
 *
 * Validaciones:
 *  - Solo el autor activo (ACEPTADO) de la tesis puede solicitar.
 *  - Solo aplica en estado OBSERVADA u OBSERVADA_JURADO (fase de proyecto).
 *  - El plazo aún no debe haber vencido (no se amplía un plazo expirado).
 *  - Una sola ampliación por (thesisId, ronda) — el unique constraint lo enforza.
 *  - Motivo mínimo 30 caracteres.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import {
  agregarDiasCalendario,
  DIAS_CALENDARIO_CORRECCION_PROYECTO,
} from '@/lib/business-days'
import { crearNotificacion } from '@/lib/notificaciones'

const ESTADOS_AMPLIABLES = ['OBSERVADA', 'OBSERVADA_JURADO'] as const

const Body = z.object({
  motivo: z.string().trim().min(30, 'El motivo debe tener al menos 30 caracteres').max(2000),
})

/**
 * GET /api/tesis/[id]/solicitar-ampliacion
 *
 * Devuelve la ampliación de la ronda actual (si existe) y si la tesis
 * cumple los requisitos para solicitar una nueva. Lo usa el frontend
 * para decidir si muestra el botón "Solicitar ampliación".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tesisId } = await params
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tesis = await prisma.thesis.findFirst({
    where: { id: tesisId, deletedAt: null },
    select: {
      id: true, estado: true, rondaActual: true, fechaLimiteCorreccion: true,
      autores: { select: { userId: true, estado: true } },
    },
  })
  if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

  const esAutor = tesis.autores.some((a) => a.userId === user.id && a.estado === 'ACEPTADO')
  if (!esAutor) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const ampliacion = await prisma.thesisDeadlineExtension.findUnique({
    where: { thesisId_ronda: { thesisId: tesisId, ronda: tesis.rondaActual } },
  })

  const ahora = new Date()
  const enFaseProyecto = ESTADOS_AMPLIABLES.includes(tesis.estado as typeof ESTADOS_AMPLIABLES[number])
  const tienePlazo = !!tesis.fechaLimiteCorreccion
  const plazoVigente = tienePlazo && tesis.fechaLimiteCorreccion! > ahora
  const yaSolicitada = !!ampliacion

  return NextResponse.json({
    puedeSolicitar: enFaseProyecto && tienePlazo && plazoVigente && !yaSolicitada,
    motivoNoPuedeSolicitar: !enFaseProyecto
      ? 'Solo aplica en fase de gestión de proyecto'
      : !tienePlazo
        ? 'Sin plazo de corrección activo'
        : !plazoVigente
          ? 'El plazo ya venció'
          : yaSolicitada
            ? 'Ya solicitaste la ampliación de esta ronda'
            : null,
    ampliacionExistente: ampliacion
      ? {
          id: ampliacion.id,
          motivo: ampliacion.motivo,
          diasExtendidos: ampliacion.diasExtendidos,
          fechaLimiteAnterior: ampliacion.fechaLimiteAnterior.toISOString(),
          fechaLimiteNueva: ampliacion.fechaLimiteNueva.toISOString(),
          createdAt: ampliacion.createdAt.toISOString(),
        }
      : null,
    diasDisponibles: DIAS_CALENDARIO_CORRECCION_PROYECTO,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tesisId } = await params
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const json = await request.json().catch(() => ({}))
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }

    const tesis = await prisma.thesis.findFirst({
      where: { id: tesisId, deletedAt: null },
      include: { autores: { include: { user: { select: { id: true } } } } },
    })
    if (!tesis) return NextResponse.json({ error: 'Tesis no encontrada' }, { status: 404 })

    // Solo autor activo
    const esAutor = tesis.autores.some(
      (a) => a.userId === user.id && a.estado === 'ACEPTADO',
    )
    if (!esAutor) {
      return NextResponse.json(
        { error: 'Solo los autores activos pueden solicitar ampliación' },
        { status: 403 },
      )
    }

    // Solo aplica en fase de proyecto observada
    if (!ESTADOS_AMPLIABLES.includes(tesis.estado as typeof ESTADOS_AMPLIABLES[number])) {
      return NextResponse.json(
        {
          error:
            'La ampliación solo aplica cuando la tesis está observada en la fase de gestión de proyecto.',
          code: 'ESTADO_NO_AMPLIABLE',
        },
        { status: 409 },
      )
    }

    if (!tesis.fechaLimiteCorreccion) {
      return NextResponse.json(
        { error: 'Esta tesis no tiene un plazo de corrección activo.' },
        { status: 409 },
      )
    }

    const ahora = new Date()
    if (tesis.fechaLimiteCorreccion < ahora) {
      return NextResponse.json(
        {
          error:
            'El plazo ya venció. La ampliación se debe solicitar antes de que expire el plazo original.',
          code: 'PLAZO_YA_VENCIDO',
        },
        { status: 409 },
      )
    }

    // Verificar unicidad por ronda (defensa antes del unique de BD para
    // poder devolver un mensaje claro en lugar de P2002 genérico).
    const yaSolicitada = await prisma.thesisDeadlineExtension.findUnique({
      where: { thesisId_ronda: { thesisId: tesisId, ronda: tesis.rondaActual } },
    })
    if (yaSolicitada) {
      return NextResponse.json(
        {
          error:
            'Ya solicitaste la ampliación para esta ronda de observación. Solo se permite una por ronda.',
          code: 'AMPLIACION_DUPLICADA',
          ampliacion: {
            id: yaSolicitada.id,
            createdAt: yaSolicitada.createdAt.toISOString(),
            fechaLimiteNueva: yaSolicitada.fechaLimiteNueva.toISOString(),
          },
        },
        { status: 409 },
      )
    }

    const fechaAnterior = tesis.fechaLimiteCorreccion
    const fechaNueva = agregarDiasCalendario(fechaAnterior, DIAS_CALENDARIO_CORRECCION_PROYECTO)

    // Aplicación atómica: crear extensión + actualizar fechaLimite + history.
    // Capturamos P2002 explícitamente: si dos requests llegan en concurrencia,
    // el findUnique de arriba puede pasar para ambos pero solo uno gana en el
    // unique constraint (thesisId, ronda). Devolvemos 409 en lugar de 500.
    try {
      await prisma.$transaction([
        prisma.thesisDeadlineExtension.create({
          data: {
            thesisId: tesisId,
            ronda: tesis.rondaActual,
            solicitanteId: user.id,
            motivo: parsed.data.motivo,
            diasExtendidos: DIAS_CALENDARIO_CORRECCION_PROYECTO,
            fechaLimiteAnterior: fechaAnterior,
            fechaLimiteNueva: fechaNueva,
          },
        }),
        prisma.thesis.update({
          where: { id: tesisId },
          data: { fechaLimiteCorreccion: fechaNueva },
        }),
        prisma.thesisStatusHistory.create({
          data: {
            thesisId: tesisId,
            estadoAnterior: tesis.estado,
            estadoNuevo: tesis.estado,
            comentario: `Plazo de corrección ampliado en ${DIAS_CALENDARIO_CORRECCION_PROYECTO} días calendario a solicitud del tesista. Nueva fecha límite: ${fechaNueva.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}.`,
            changedById: user.id,
          },
        }),
      ])
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          {
            error: 'Otra solicitud llegó primero. Ya existe una ampliación para esta ronda.',
            code: 'AMPLIACION_DUPLICADA',
          },
          { status: 409 },
        )
      }
      throw err
    }

    // Notificar a mesa de partes (audit trail).
    try {
      const mesaPartesUsers = await prisma.userRole.findMany({
        where: { role: { codigo: 'MESA_PARTES' }, isActive: true },
        select: { userId: true },
      })
      if (mesaPartesUsers.length > 0) {
        await crearNotificacion({
          userId: mesaPartesUsers.map((u) => u.userId),
          tipo: 'TESIS_EN_REVISION',
          titulo: 'Ampliación de plazo solicitada',
          mensaje: `Tesis "${tesis.titulo}" amplió su plazo de corrección por ${DIAS_CALENDARIO_CORRECCION_PROYECTO} días.`,
          enlace: `/mesa-partes/${tesisId}`,
        })
      }
    } catch (e) {
      console.error('[Notificacion ampliacion]', e)
    }

    return NextResponse.json({
      success: true,
      message: `Plazo ampliado en ${DIAS_CALENDARIO_CORRECCION_PROYECTO} días calendario.`,
      data: {
        fechaLimiteAnterior: fechaAnterior.toISOString(),
        fechaLimiteNueva: fechaNueva.toISOString(),
        diasExtendidos: DIAS_CALENDARIO_CORRECCION_PROYECTO,
      },
    })
  } catch (error) {
    console.error('[POST /api/tesis/[id]/solicitar-ampliacion]', error)
    return NextResponse.json({ error: 'Error al solicitar la ampliación' }, { status: 500 })
  }
}
