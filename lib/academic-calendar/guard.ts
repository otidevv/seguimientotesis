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

export interface ProximaApertura {
  fecha: Date
  periodoNombre: string
  facultadEspecifica: boolean
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
  /**
   * Cuando la ventana esta cerrada (o el periodo no esta ACTIVO), apunta al
   * proximo periodo PLANIFICADO/ACTIVO con una ventana del mismo tipo y scope.
   * Permite a la UI decirle al usuario "vuelve el ...", en vez de solo "cerrada".
   */
  proximaApertura: ProximaApertura | null
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
/**
 * Busca la próxima ventana del mismo tipo que se abrirá en el futuro, en
 * cualquier periodo PLANIFICADO o ACTIVO. Prioriza ventanas específicas de
 * la facultad sobre las globales (mismo criterio que el resto del guard).
 * Devuelve null si no hay periodo futuro configurado para ese trámite.
 */
async function findProximaApertura(
  tipo: WindowType,
  facultadId: string | null | undefined,
  now: Date,
): Promise<ProximaApertura | null> {
  if (facultadId) {
    const facWin = await prisma.academicWindow.findFirst({
      where: {
        tipo,
        habilitada: true,
        facultadId,
        periodo: { estado: { in: ['PLANIFICADO', 'ACTIVO'] } },
        fechaInicio: { gt: now },
      },
      include: { periodo: { select: { nombre: true } } },
      orderBy: { fechaInicio: 'asc' },
    })
    if (facWin) {
      return { fecha: facWin.fechaInicio, periodoNombre: facWin.periodo.nombre, facultadEspecifica: true }
    }
  }
  const globalWin = await prisma.academicWindow.findFirst({
    where: {
      tipo,
      habilitada: true,
      facultadId: null,
      periodo: { estado: { in: ['PLANIFICADO', 'ACTIVO'] } },
      fechaInicio: { gt: now },
    },
    include: { periodo: { select: { nombre: true } } },
    orderBy: { fechaInicio: 'asc' },
  })
  if (!globalWin) return null
  return { fecha: globalWin.fechaInicio, periodoNombre: globalWin.periodo.nombre, facultadEspecifica: false }
}

export async function getVentanaVigente(
  tipo: WindowType,
  facultadId: string | null | undefined,
  opts: GuardOptions = {},
): Promise<VentanaVigente | null> {
  const now = opts.now ?? new Date()
  // yyyy-mm-dd en zona America/Lima, no UTC: si una ventana cierra a las 23:59
  // hora Lima, el ISO UTC cae al día siguiente y los mensajes mostraban una
  // fecha desfasada en 1 día respecto a lo que el usuario configuró.
  const iso = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)

  const sufijoProxima = (p: ProximaApertura | null) =>
    p
      ? ` Próxima apertura: ${iso(p.fecha)} (periodo "${p.periodoNombre}"${p.facultadEspecifica ? ', tu facultad' : ''}).`
      : ' No hay periodo futuro configurado todavía.'

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
    const proximaApertura = await findProximaApertura(tipo, facultadId, now)
    const motivoBase =
      periodoQueCubre.estado === 'CERRADO'
        ? `El periodo ${scopeInfo} "${periodoQueCubre.nombre}" esta CERRADO. No se permiten acciones.`
        : `El periodo ${scopeInfo} "${periodoQueCubre.nombre}" aun esta PLANIFICADO (no ha sido activado).`
    return {
      windowId: '',
      tipo,
      fechaInicio: periodoQueCubre.fechaInicio,
      fechaFin: periodoQueCubre.fechaFin,
      periodoNombre: periodoQueCubre.nombre,
      facultadId: periodoQueCubre.facultadId,
      dentroDeVentana: false,
      overrideVigenteHasta: null,
      proximaApertura,
      motivo: motivoBase + sufijoProxima(proximaApertura),
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

  // Solo computamos próxima apertura cuando NO estamos cubiertos. En el caso
  // "esFutura" la ventanaQueAplica ya ES la próxima apertura, así que no hace
  // falta consultar de nuevo. En "cerrada" sin futura en este periodo, esto es
  // lo que le dice al usuario "vuelve el ...".
  let proximaApertura: ProximaApertura | null = null
  if (!cubierto && !esFutura) {
    proximaApertura = await findProximaApertura(tipo, facultadId, now)
  }

  return {
    windowId: ventanaQueAplica.id,
    tipo: ventanaQueAplica.tipo,
    fechaInicio: ventanaQueAplica.fechaInicio,
    fechaFin: ventanaQueAplica.fechaFin,
    periodoNombre: ventanaQueAplica.periodo.nombre,
    facultadId: ventanaQueAplica.facultadId,
    dentroDeVentana: cubierto,
    overrideVigenteHasta: override?.vigenciaHasta ?? null,
    proximaApertura,
    motivo: cubierto
      ? override
        ? `Autorizado por prorroga excepcional hasta ${iso(override.vigenciaHasta)}.`
        : `Ventana abierta (${iso(ventanaQueAplica.fechaInicio)} — ${iso(ventanaQueAplica.fechaFin)}).`
      : esFutura
        ? `Ventana aun no abierta. Se abre el ${iso(ventanaQueAplica.fechaInicio)}.`
        : `Ventana cerrada. Cerro el ${iso(ventanaQueAplica.fechaFin)}.${sufijoProxima(proximaApertura)}`,
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
