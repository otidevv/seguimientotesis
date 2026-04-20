/**
 * Guard de calendario academico.
 *
 * `assertDentroDeVentana(tipo, facultadId?, opts?)` lanza `FueraDeVentanaError`
 * si no existe una ventana vigente (o un override vigente) para el tramite
 * solicitado. Los endpoints deben capturarlo y devolver 403 con `error: "FUERA_DE_VENTANA"`.
 *
 * Resolucion de scope:
 *  1) Ventana especifica de la facultad (si facultadId se provee) y habilitada.
 *  2) Ventana global (facultad_id null) del periodo ACTIVO.
 *  3) Override especifico (por thesis o user) con vigenciaHasta >= now.
 *  4) Override general de la ventana (thesis y user null).
 *
 * Si no hay periodo ACTIVO y tampoco override, el guard permite pasar para evitar
 * bloquear todo el sistema durante la puesta en marcha. Este comportamiento es
 * configurable via `bloquearSiNoHayPeriodoActivo` en opts.
 */

import { prisma } from '@/lib/prisma'
import type { AcademicWindowType } from '@prisma/client'

export type WindowType = AcademicWindowType

export interface GuardOptions {
  thesisId?: string
  userId?: string
  /** Por defecto false. Si true, sin periodo ACTIVO bloquea la accion. */
  bloquearSiNoHayPeriodoActivo?: boolean
  /** Reloj inyectable (para tests). */
  now?: Date
}

export interface VentanaVigente {
  windowId: string
  tipo: WindowType
  fechaInicio: Date
  fechaFin: Date
  periodoNombre: string
  facultadId: string | null
  dentroDeVentana: boolean
  /** Si aplica un override especifico, indica hasta cuando extiende la vigencia. */
  overrideVigenteHasta: Date | null
  /** Motivo informativo (por que la accion esta permitida / bloqueada). */
  motivo: string
}

export class FueraDeVentanaError extends Error {
  readonly code = 'FUERA_DE_VENTANA'
  readonly ventanaVigente: VentanaVigente | null
  readonly tipo: WindowType

  constructor(tipo: WindowType, ventanaVigente: VentanaVigente | null, mensaje: string) {
    super(mensaje)
    this.name = 'FueraDeVentanaError'
    this.tipo = tipo
    this.ventanaVigente = ventanaVigente
  }
}

/**
 * Devuelve la ventana vigente para un tramite, incluyendo info de overrides.
 * Nunca lanza: siempre devuelve un objeto descriptivo. Usa esto en UI para
 * mostrar el estado del calendario.
 */
export async function getVentanaVigente(
  tipo: WindowType,
  facultadId: string | null | undefined,
  opts: GuardOptions = {},
): Promise<VentanaVigente | null> {
  const now = opts.now ?? new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  // 0) ¿Hay algun periodo que cubra `now` en el scope (facultad o global)
  //    que NO este ACTIVO? Si si, bloquear todo el scope: cerrar o planificar
  //    un periodo apaga todas las ventanas que cubre.
  const periodoQueCubre = await prisma.academicPeriod.findFirst({
    where: {
      fechaInicio: { lte: now },
      fechaFin: { gte: now },
      OR: [
        ...(facultadId ? [{ facultadId }] : []),
        { facultadId: null },
      ],
    },
    orderBy: [{ facultadId: 'desc' }, { fechaInicio: 'desc' }],
  })

  if (periodoQueCubre && periodoQueCubre.estado !== 'ACTIVO') {
    const scopeInfo = periodoQueCubre.facultadId
      ? (facultadId && periodoQueCubre.facultadId === facultadId
          ? 'de tu facultad'
          : 'de facultad')
      : 'global'
    return {
      windowId: '',
      tipo,
      fechaInicio: periodoQueCubre.fechaInicio,
      fechaFin: periodoQueCubre.fechaFin,
      periodoNombre: periodoQueCubre.nombre,
      facultadId: periodoQueCubre.facultadId,
      dentroDeVentana: false,
      overrideVigenteHasta: null,
      motivo:
        periodoQueCubre.estado === 'CERRADO'
          ? `El periodo ${scopeInfo} "${periodoQueCubre.nombre}" esta CERRADO. No se permiten acciones.`
          : `El periodo ${scopeInfo} "${periodoQueCubre.nombre}" aun esta PLANIFICADO (no ha sido activado).`,
    }
  }

  // 1) Buscar ventana scope-facultad primero, luego global.
  const ventanas = await prisma.academicWindow.findMany({
    where: {
      tipo,
      habilitada: true,
      periodo: { estado: 'ACTIVO' },
      OR: [
        ...(facultadId ? [{ facultadId }] : []),
        { facultadId: null },
      ],
    },
    include: {
      periodo: { select: { nombre: true, estado: true, facultadId: true } },
    },
    orderBy: [
      // ventanas especificas de la facultad tienen prioridad sobre globales
      { facultadId: 'desc' },
      { fechaInicio: 'desc' },
    ],
  })

  if (ventanas.length === 0) return null

  // Preferimos una ventana que cubra `now`. Si ninguna lo hace, elegimos:
  //  1) la proxima ventana futura (fechaInicio > now) mas cercana — util para
  //     decirle al usuario "se abre el ...".
  //  2) si no hay futura, la ultima ventana pasada (fechaFin < now) mas reciente.
  const queCubre = ventanas.find((v) => v.fechaInicio <= now && v.fechaFin >= now)
  const futuras = ventanas
    .filter((v) => v.fechaInicio > now)
    .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())
  const pasadas = ventanas
    .filter((v) => v.fechaFin < now)
    .sort((a, b) => b.fechaFin.getTime() - a.fechaFin.getTime())
  const ventanaQueAplica = queCubre ?? futuras[0] ?? pasadas[0] ?? ventanas[0]

  const dentroDeVentana = Boolean(queCubre)
  const esFutura = !dentroDeVentana && ventanaQueAplica.fechaInicio > now

  // 2) Buscar overrides vigentes para esta ventana (solo si no estamos en ventana)
  const override = dentroDeVentana
    ? null
    : await prisma.academicWindowOverride.findFirst({
        where: {
          windowId: ventanaQueAplica.id,
          vigenciaHasta: { gte: now },
          OR: [
            ...(opts.thesisId ? [{ thesisId: opts.thesisId }] : []),
            ...(opts.userId ? [{ userId: opts.userId }] : []),
            { thesisId: null, userId: null },
          ],
        },
        orderBy: { vigenciaHasta: 'desc' },
      })

  const cubierto = dentroDeVentana || Boolean(override)

  return {
    windowId: ventanaQueAplica.id,
    tipo: ventanaQueAplica.tipo,
    fechaInicio: ventanaQueAplica.fechaInicio,
    fechaFin: ventanaQueAplica.fechaFin,
    periodoNombre: ventanaQueAplica.periodo.nombre,
    facultadId: ventanaQueAplica.facultadId,
    dentroDeVentana: cubierto,
    overrideVigenteHasta: override?.vigenciaHasta ?? null,
    motivo: cubierto
      ? override
        ? `Autorizado por prorroga excepcional hasta ${iso(override.vigenciaHasta)}.`
        : `Ventana abierta (${iso(ventanaQueAplica.fechaInicio)} — ${iso(ventanaQueAplica.fechaFin)}).`
      : esFutura
        ? `Ventana aun no abierta. Se abre el ${iso(ventanaQueAplica.fechaInicio)}.`
        : `Ventana cerrada. Cerro el ${iso(ventanaQueAplica.fechaFin)}.`,
  }
}

/**
 * Lanza FueraDeVentanaError si la accion no esta permitida por calendario.
 * No hace nada si esta dentro de ventana o hay override vigente.
 */
export async function assertDentroDeVentana(
  tipo: WindowType,
  facultadId: string | null | undefined,
  opts: GuardOptions = {},
): Promise<VentanaVigente | null> {
  const vigente = await getVentanaVigente(tipo, facultadId, opts)

  if (!vigente) {
    if (opts.bloquearSiNoHayPeriodoActivo) {
      throw new FueraDeVentanaError(
        tipo,
        null,
        'No hay periodo academico activo ni ventana configurada para este tramite.',
      )
    }
    return null
  }

  if (!vigente.dentroDeVentana) {
    throw new FueraDeVentanaError(
      tipo,
      vigente,
      `Fuera de plazo para el tramite "${tipo}". ${vigente.motivo}`,
    )
  }

  return vigente
}
