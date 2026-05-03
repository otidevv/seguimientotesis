'use client'

/**
 * Widget que muestra el estado de un conjunto de ventanas academicas.
 * Cada ventana se renderiza como una tarjeta con su rango de fechas, estado,
 * tiempo restante/relativo y barra de progreso del periodo.
 *
 * Por facultad: si el rol de mesa-partes tiene scope, pasa `facultadId`; sino usa global.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarClock,
  CalendarX2,
  CalendarOff,
  FileText,
  Inbox,
  Users,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  Ban,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type WindowType =
  | 'PRESENTACION_PROYECTO'
  | 'REVISION_MESA_PARTES'
  | 'ASIGNACION_JURADOS'
  | 'EVALUACION_JURADO'
  | 'INFORME_FINAL'
  | 'SUSTENTACION'
  | 'DESISTIMIENTO'

interface ProximaApertura {
  fecha: string
  periodoNombre: string
  facultadEspecifica: boolean
}

interface VentanaVigente {
  windowId: string
  tipo: WindowType
  fechaInicio: string
  fechaFin: string
  periodoNombre: string
  dentroDeVentana: boolean
  overrideVigenteHasta: string | null
  proximaApertura: ProximaApertura | null
  motivo: string
}

const TIPO_META: Record<WindowType, { label: string; descripcion: string; icon: LucideIcon }> = {
  PRESENTACION_PROYECTO: { label: 'Presentación de proyecto', descripcion: 'Registro inicial del plan', icon: FileText },
  REVISION_MESA_PARTES:  { label: 'Revisión Mesa de Partes',  descripcion: 'Revisión administrativa',  icon: Inbox },
  ASIGNACION_JURADOS:    { label: 'Asignación de jurados',    descripcion: 'Designación del comité',    icon: Users },
  EVALUACION_JURADO:     { label: 'Evaluación del jurado',    descripcion: 'Lectura y observaciones',   icon: ClipboardCheck },
  INFORME_FINAL:         { label: 'Informe final',            descripcion: 'Entrega del documento',     icon: FileCheck2 },
  SUSTENTACION:          { label: 'Sustentación',             descripcion: 'Defensa pública',           icon: GraduationCap },
  DESISTIMIENTO:         { label: 'Desistimiento',            descripcion: 'Solicitud de baja',         icon: Ban },
}

export interface CalendarStatusWidgetProps {
  tipos?: WindowType[]
  thesisId?: string
  className?: string
  titulo?: string
}

type EstadoVentana = 'abierta' | 'override' | 'proxima' | 'cerrada' | 'sin-config'

// Extrae año/mes/día en zona America/Lima, NO en TZ del navegador.
// Necesario para que un asesor consultando desde otra TZ vea los mismos
// "Quedan X días" / "Cierra hoy" que un alumno en Lima.
function ymdLima(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { y: get('year'), m: get('month'), day: get('day') }
}

function diasEntre(a: Date, b: Date) {
  const MS = 1000 * 60 * 60 * 24
  // normalizamos a medianoche en zona Lima para no ensuciar el conteo con horas/minutos
  const ya = ymdLima(a)
  const yb = ymdLima(b)
  const da = Date.UTC(ya.y, ya.m - 1, ya.day)
  const db = Date.UTC(yb.y, yb.m - 1, yb.day)
  return Math.round((da - db) / MS)
}

function fmtFecha(d: Date) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'America/Lima' }).replace('.', '')
}
function fmtFechaCompleta(d: Date) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' }).replace('.', '')
}

function describirRelativo(estado: EstadoVentana, dias: number): string {
  if (estado === 'abierta' || estado === 'override') {
    if (dias < 0) return 'Cerrando hoy'
    if (dias === 0) return 'Cierra hoy'
    if (dias === 1) return 'Cierra mañana'
    return `Quedan ${dias} días`
  }
  if (estado === 'proxima') {
    if (dias === 0) return 'Abre hoy'
    if (dias === 1) return 'Abre mañana'
    return `Abre en ${dias} días`
  }
  if (estado === 'cerrada') {
    const abs = Math.abs(dias)
    if (abs === 0) return 'Cerró hoy'
    if (abs === 1) return 'Cerró ayer'
    return `Cerró hace ${abs} días`
  }
  return 'Sin configurar'
}

const ESTADO_META: Record<EstadoVentana, { label: string; dot: string; ring: string; soft: string; ink: string; sub: string }> = {
  abierta: {
    label: 'Abierto',
    dot:  'bg-emerald-500',
    ring: 'ring-emerald-500/20 border-emerald-200/70 dark:border-emerald-900/60',
    soft: 'bg-emerald-50 dark:bg-emerald-950/20',
    ink:  'text-emerald-700 dark:text-emerald-300',
    sub:  'text-emerald-600/80 dark:text-emerald-400/80',
  },
  override: {
    label: 'Acceso especial',
    dot:  'bg-amber-500',
    ring: 'ring-amber-500/20 border-amber-200/70 dark:border-amber-900/60',
    soft: 'bg-amber-50 dark:bg-amber-950/20',
    ink:  'text-amber-700 dark:text-amber-300',
    sub:  'text-amber-600/80 dark:text-amber-400/80',
  },
  proxima: {
    label: 'Próximo',
    dot:  'bg-sky-500',
    ring: 'ring-sky-500/20 border-sky-200/70 dark:border-sky-900/60',
    soft: 'bg-sky-50/60 dark:bg-sky-950/20',
    ink:  'text-sky-700 dark:text-sky-300',
    sub:  'text-sky-600/80 dark:text-sky-400/80',
  },
  cerrada: {
    label: 'Cerrado',
    dot:  'bg-slate-400',
    ring: 'ring-slate-300/30 border-slate-200/70 dark:border-slate-800/60',
    soft: 'bg-slate-50 dark:bg-slate-900/30',
    ink:  'text-slate-700 dark:text-slate-300',
    sub:  'text-slate-500 dark:text-slate-400',
  },
  'sin-config': {
    label: 'Sin configurar',
    dot:  'bg-zinc-300 dark:bg-zinc-700',
    ring: 'ring-zinc-200/30 border-dashed border-zinc-300/80 dark:border-zinc-700/70',
    soft: 'bg-transparent',
    ink:  'text-zinc-500 dark:text-zinc-400',
    sub:  'text-zinc-400 dark:text-zinc-500',
  },
}

function StatePill({ estado }: { estado: EstadoVentana }) {
  const m = ESTADO_META[estado]
  const StateIcon =
    estado === 'abierta'   ? CheckCircle2 :
    estado === 'override'  ? AlertTriangle :
    estado === 'proxima'   ? CalendarClock :
    estado === 'cerrada'   ? CalendarX2 :
                             CalendarOff
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
      m.soft, m.ink,
    )}>
      <span className="relative flex h-1.5 w-1.5">
        {estado === 'abierta' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', m.dot)} />
      </span>
      <StateIcon className="w-3 h-3 -ml-0.5" />
      {m.label}
    </span>
  )
}

interface VentanaCardProps {
  tipo: WindowType
  ventana: VentanaVigente | null
}

function VentanaCard({ tipo, ventana }: VentanaCardProps) {
  const meta = TIPO_META[tipo]
  const Icon = meta.icon

  if (!ventana) {
    const m = ESTADO_META['sin-config']
    return (
      <div className={cn(
        'group relative rounded-xl border p-4 ring-1 ring-inset transition-colors',
        m.ring, m.soft,
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
              <Icon className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate">{meta.label}</p>
              <p className="text-[10.5px] text-muted-foreground truncate">{meta.descripcion}</p>
            </div>
          </div>
          <StatePill estado="sin-config" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground italic">No hay ventana configurada para este trámite.</p>
      </div>
    )
  }

  const ahora = new Date()
  const inicio = new Date(ventana.fechaInicio)
  const fin = new Date(ventana.fechaFin)
  const overrideHasta = ventana.overrideVigenteHasta ? new Date(ventana.overrideVigenteHasta) : null

  let estado: EstadoVentana
  if (ventana.dentroDeVentana) {
    estado = overrideHasta ? 'override' : 'abierta'
  } else if (ahora < inicio) {
    estado = 'proxima'
  } else {
    estado = 'cerrada'
  }

  const m = ESTADO_META[estado]
  // dias relativos: si está abierta o cerrando, contar al fin; si próxima, al inicio; si cerrada, desde fin
  const diasRel =
    estado === 'abierta' || estado === 'override'
      ? diasEntre(fin, ahora)
      : estado === 'proxima'
        ? diasEntre(inicio, ahora)
        : diasEntre(fin, ahora) // negativo

  const total = Math.max(1, diasEntre(fin, inicio))
  const transcurrido = Math.min(total, Math.max(0, diasEntre(ahora, inicio)))
  const progreso = Math.round((transcurrido / total) * 100)

  const sameYear = ymdLima(inicio).y === ymdLima(fin).y
  const rangoFechas = sameYear
    ? `${fmtFecha(inicio)} — ${fmtFechaCompleta(fin)}`
    : `${fmtFechaCompleta(inicio)} — ${fmtFechaCompleta(fin)}`

  const titleAttr = `${meta.label}: ${ventana.motivo}`
  const relativo = describirRelativo(estado, diasRel)

  return (
    <div
      title={titleAttr}
      className={cn(
        'group relative rounded-xl border bg-card p-4 ring-1 ring-inset transition-all',
        'hover:shadow-sm hover:-translate-y-0.5 hover:ring-2',
        m.ring,
      )}
    >
      {/* línea acento superior - señal visual del estado */}
      <span
        aria-hidden
        className={cn('absolute inset-x-3 top-0 h-px', m.dot, 'opacity-60')}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', m.soft)}>
            <Icon className={cn('w-4 h-4', m.ink)} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight truncate">{meta.label}</p>
            <p className="text-[10.5px] text-muted-foreground truncate">{meta.descripcion}</p>
          </div>
        </div>
        <StatePill estado={estado} />
      </div>

      {/* fechas */}
      <div className="mt-3 flex items-baseline gap-2">
        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70 self-center" />
        <p className="font-medium tabular-nums tracking-tight text-[13px] text-foreground">
          {rangoFechas}
        </p>
      </div>

      {/* tiempo relativo + barra (cuando aplique) */}
      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className={cn('font-semibold tabular-nums', m.ink)}>{relativo}</span>
          {(estado === 'abierta' || estado === 'override') && (
            <span className="text-[10.5px] text-muted-foreground tabular-nums">
              {Math.min(100, progreso)}% transcurrido
            </span>
          )}
          {estado === 'proxima' && (
            <span className="text-[10.5px] text-muted-foreground tabular-nums">
              {ventana.periodoNombre}
            </span>
          )}
        </div>

        {(estado === 'abierta' || estado === 'override') && (
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/70">
            <div
              className={cn('h-full rounded-full transition-all', m.dot)}
              style={{ width: `${Math.min(100, progreso)}%` }}
            />
          </div>
        )}

        {estado === 'cerrada' && (
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/40">
            <div className="h-full rounded-full bg-muted" style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {/* override pill */}
      {overrideHasta && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2 py-1 text-[10.5px] text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>Acceso especial vigente hasta {fmtFechaCompleta(overrideHasta)}</span>
        </div>
      )}

      {/* próxima apertura — solo cuando la ventana está cerrada */}
      {estado === 'cerrada' && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-sky-50 dark:bg-sky-950/30 px-2 py-1 text-[10.5px] text-sky-800 dark:text-sky-200">
          <CalendarClock className="w-3 h-3 shrink-0" />
          {ventana.proximaApertura ? (
            <span>
              Próxima apertura: <b>{fmtFechaCompleta(new Date(ventana.proximaApertura.fecha))}</b>
              {' · '}periodo {ventana.proximaApertura.periodoNombre}
              {ventana.proximaApertura.facultadEspecifica && ' (tu facultad)'}
            </span>
          ) : (
            <span>Sin periodo futuro configurado todavía.</span>
          )}
        </div>
      )}
    </div>
  )
}

function VentanaSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-inset ring-transparent animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-2 w-20 rounded bg-muted/70" />
          </div>
        </div>
        <div className="h-4 w-16 rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-3 w-40 rounded bg-muted" />
      <div className="mt-3 h-1 w-full rounded-full bg-muted/60" />
    </div>
  )
}

export function CalendarStatusWidget({
  tipos = [
    'PRESENTACION_PROYECTO',
    'REVISION_MESA_PARTES',
    'ASIGNACION_JURADOS',
    'EVALUACION_JURADO',
    'INFORME_FINAL',
    'SUSTENTACION',
    'DESISTIMIENTO',
  ],
  thesisId,
  className,
  titulo = 'Calendario académico',
}: CalendarStatusWidgetProps) {
  const [ventanas, setVentanas] = useState<Record<WindowType, VentanaVigente | null>>({} as Record<WindowType, VentanaVigente | null>)
  const [loading, setLoading] = useState(true)

  // Usamos la firma estringuificada como dep estable: cualquier default o
  // literal inline crea un array nuevo en cada render, lo que dispararia un
  // loop de refetch si usaramos `tipos` directamente.
  const tiposKey = tipos.join(',')

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    const tiposList = tiposKey.split(',') as WindowType[]

    Promise.all(
      tiposList.map((tipo) =>
        fetch(
          `/api/academic-calendar/ventana?tipo=${tipo}${thesisId ? `&thesisId=${thesisId}` : ''}`,
          { signal: ac.signal },
        )
          .then((r) => (r.ok ? r.json() : { ventana: null }))
          .then((d: { ventana: VentanaVigente | null }) => [tipo, d.ventana] as const)
          .catch(() => [tipo, null] as const),
      ),
    )
      .then((pairs) => {
        if (ac.signal.aborted) return
        const next = {} as Record<WindowType, VentanaVigente | null>
        for (const [t, v] of pairs) next[t] = v
        setVentanas(next)
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false) })

    return () => ac.abort()
  }, [tiposKey, thesisId])

  // resumen para el header: cuántas abiertas / próximas / cerradas
  const resumen = useMemo(() => {
    const ahora = new Date()
    let abiertas = 0, proximas = 0, cerradas = 0, sinConfig = 0
    for (const tipo of tipos) {
      const v = ventanas[tipo]
      if (!v) { sinConfig++; continue }
      if (v.dentroDeVentana) abiertas++
      else if (new Date(v.fechaInicio) > ahora) proximas++
      else cerradas++
    }
    return { abiertas, proximas, cerradas, sinConfig }
  }, [tipos, ventanas])

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card',
        // sutil textura de fondo: gradiente diagonal muy suave
        'bg-gradient-to-br from-card via-card to-muted/30',
        className,
      )}
      aria-label={titulo}
    >
      {/* header */}
      <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight leading-tight">{titulo}</h2>
            <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">
              Ventanas vigentes del calendario académico
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-1.5 text-[11px]">
            {resumen.abiertas > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="tabular-nums">{resumen.abiertas} abierto{resumen.abiertas !== 1 ? 's' : ''}</span>
              </span>
            )}
            {resumen.proximas > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-950/30 px-2.5 py-1 font-medium text-sky-700 dark:text-sky-300">
                <Clock className="w-3 h-3" />
                <span className="tabular-nums">{resumen.proximas} próximo{resumen.proximas !== 1 ? 's' : ''}</span>
              </span>
            )}
            {resumen.cerradas > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/40 px-2.5 py-1 font-medium text-slate-600 dark:text-slate-400">
                <CalendarX2 className="w-3 h-3" />
                <span className="tabular-nums">{resumen.cerradas} cerrado{resumen.cerradas !== 1 ? 's' : ''}</span>
              </span>
            )}
            {resumen.abiertas === 0 && resumen.proximas === 0 && resumen.cerradas === 0 && resumen.sinConfig > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800/40 px-2.5 py-1 text-zinc-500">
                <CalendarOff className="w-3 h-3" />
                Sin configuración
              </span>
            )}
          </div>
        )}
      </header>

      {/* grid */}
      <div className="p-4 sm:p-5">
        <div className={cn(
          'grid gap-3',
          'grid-cols-1 sm:grid-cols-2',
          tipos.length >= 3 && 'lg:grid-cols-3',
          tipos.length >= 6 && 'xl:grid-cols-3 2xl:grid-cols-4',
        )}>
          {loading
            ? tipos.map((t) => <VentanaSkeleton key={t} />)
            : tipos.map((tipo) => (
                <VentanaCard key={tipo} tipo={tipo} ventana={ventanas[tipo]} />
              ))}
        </div>
      </div>
    </section>
  )
}
