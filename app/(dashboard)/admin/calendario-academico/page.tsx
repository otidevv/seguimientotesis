'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Loader2, Plus, Pencil, Trash2, CalendarDays, ChevronRight, Power, ShieldAlert,
  AlertTriangle, CheckCircle2, Clock, Sparkles, Layers, Star, Lightbulb,
  CalendarOff, FileText, Inbox, Users, ClipboardCheck, FileCheck2, GraduationCap, Ban,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Semestre = 'I' | 'II' | 'VERANO'
type Estado = 'PLANIFICADO' | 'ACTIVO' | 'CERRADO'
type WindowType =
  | 'PRESENTACION_PROYECTO' | 'REVISION_MESA_PARTES' | 'ASIGNACION_JURADOS'
  | 'EVALUACION_JURADO' | 'INFORME_FINAL' | 'SUSTENTACION' | 'DESISTIMIENTO'

const TIPOS: WindowType[] = [
  'PRESENTACION_PROYECTO', 'REVISION_MESA_PARTES', 'ASIGNACION_JURADOS',
  'EVALUACION_JURADO', 'INFORME_FINAL', 'SUSTENTACION', 'DESISTIMIENTO',
]

const TIPO_LABEL: Record<WindowType, string> = {
  PRESENTACION_PROYECTO: 'Presentacion de proyecto',
  REVISION_MESA_PARTES: 'Revision mesa de partes',
  ASIGNACION_JURADOS: 'Asignacion de jurados',
  EVALUACION_JURADO: 'Evaluacion de jurados',
  INFORME_FINAL: 'Informe final',
  SUSTENTACION: 'Sustentacion',
  DESISTIMIENTO: 'Desistimiento',
}

interface Periodo {
  id: string
  anio: number
  semestre: Semestre
  nombre: string
  fechaInicio: string
  fechaFin: string
  estado: Estado
  esActual: boolean
  facultadId: string | null
  facultad: { id: string; nombre: string; codigo: string } | null
  observaciones: string | null
  _count: { ventanas: number }
}

interface Ventana {
  id: string
  tipo: WindowType
  fechaInicio: string
  fechaFin: string
  habilitada: boolean
  facultadId: string | null
  facultad: { id: string; nombre: string; codigo: string } | null
  observaciones: string | null
  _count: { overrides: number }
}

interface PeriodoDetalle extends Periodo {
  ventanas: Ventana[]
}

function isoDate(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
}

function fmtFechaCorta(s: string) {
  return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' }).replace('.', '')
}

const TIPO_ICON: Record<WindowType, LucideIcon> = {
  PRESENTACION_PROYECTO: FileText,
  REVISION_MESA_PARTES:  Inbox,
  ASIGNACION_JURADOS:    Users,
  EVALUACION_JURADO:     ClipboardCheck,
  INFORME_FINAL:         FileCheck2,
  SUSTENTACION:          GraduationCap,
  DESISTIMIENTO:         Ban,
}

function diasEntre(a: Date, b: Date) {
  const MS = 86400000
  const ymd = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'))
  }
  return Math.round((ymd(a) - ymd(b)) / MS)
}

function progresoPeriodo(inicio: string, fin: string, ahora: Date) {
  const i = new Date(inicio).getTime()
  const f = new Date(fin).getTime()
  const n = ahora.getTime()
  if (n < i) return 0
  if (n > f) return 100
  return Math.round(((n - i) / (f - i)) * 100)
}

const ESTADO_STYLE: Record<Estado, { dot: string; bg: string; ink: string; pulse: boolean; label: string }> = {
  ACTIVO:      { dot: 'bg-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950', ink: 'text-emerald-800 dark:text-emerald-200', pulse: true,  label: 'Activo' },
  PLANIFICADO: { dot: 'bg-sky-600',     bg: 'bg-sky-100 dark:bg-sky-950',         ink: 'text-sky-800 dark:text-sky-200',         pulse: false, label: 'Planificado' },
  CERRADO:     { dot: 'bg-zinc-500',    bg: 'bg-zinc-200 dark:bg-zinc-800',       ink: 'text-zinc-800 dark:text-zinc-200',       pulse: false, label: 'Cerrado' },
}

interface StatCellProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'emerald' | 'sky' | 'primary'
  isText?: boolean
}
function StatCell({ icon: Icon, label, value, sub, tone = 'default', isText }: StatCellProps) {
  // Surface uniformly white/dark; only the icon container carries solid color.
  const iconClass = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    emerald: 'bg-emerald-600 text-white',
    sky: 'bg-sky-600 text-white',
    primary: 'bg-primary text-primary-foreground',
  }[tone]
  return (
    <div className="flex items-center gap-3 bg-card px-5 py-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', iconClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className={cn('font-bold tracking-tight leading-tight truncate text-foreground', isText ? 'text-base capitalize' : 'text-2xl tabular-nums')}>{value}</p>
        {sub && <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function EstadoPill({ estado }: { estado: Estado }) {
  const s = ESTADO_STYLE[estado]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', s.bg, s.ink)}>
      <span className="relative flex h-1.5 w-1.5">
        {s.pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', s.dot)} />
      </span>
      {s.label}
    </span>
  )
}

function toInputValue(s: string) {
  // yyyy-mm-dd en zona America/Lima, independiente del TZ del navegador.
  // Usar getTimezoneOffset() del navegador era frágil: solo funcionaba si el
  // admin estaba físicamente en UTC-5; en otra zona el input mostraba el día corrido.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(s))
}

function fromInputValue(s: string, endOfDay = false) {
  // input yyyy-mm-dd interpretado en zona Lima (UTC-5).
  // Ej: '2026-05-03' con endOfDay=true → '2026-05-04T04:59:59Z' (= 03 may 23:59:59 Lima).
  const hora = endOfDay ? '23:59:59' : '00:00:00'
  return new Date(`${s}T${hora}-05:00`).toISOString()
}

export default function CalendarioAcademicoPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<PeriodoDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const [crearPeriodoOpen, setCrearPeriodoOpen] = useState(false)
  const [editPeriodo, setEditPeriodo] = useState<Periodo | null>(null)
  const [crearVentanaOpen, setCrearVentanaOpen] = useState(false)
  const [editVentana, setEditVentana] = useState<Ventana | null>(null)
  const [overridesVentana, setOverridesVentana] = useState<Ventana | null>(null)

  const loadPeriodos = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/calendario-academico/periodos')
      const d: { periodos?: Periodo[]; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setPeriodos(d.periodos ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error cargando periodos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetalle = useCallback(async (id: string) => {
    setDetalleLoading(true)
    try {
      const r = await fetch(`/api/admin/calendario-academico/periodos/${id}`)
      const d: { periodo?: PeriodoDetalle; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setDetalle(d.periodo ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setDetalleLoading(false)
    }
  }, [])

  useEffect(() => { loadPeriodos() }, [loadPeriodos])
  useEffect(() => {
    if (expandedId) loadDetalle(expandedId)
    else setDetalle(null)
  }, [expandedId, loadDetalle])

  // Stats overview para el header
  const ahora = new Date()
  const stats = useMemo(() => {
    const activos = periodos.filter(p => p.estado === 'ACTIVO').length
    const planificados = periodos.filter(p => p.estado === 'PLANIFICADO').length
    const cerrados = periodos.filter(p => p.estado === 'CERRADO').length
    const totalVentanas = periodos.reduce((acc, p) => acc + p._count.ventanas, 0)
    const activoActual = periodos.find(p => p.esActual && p.estado === 'ACTIVO') ?? periodos.find(p => p.estado === 'ACTIVO')
    return { total: periodos.length, activos, planificados, cerrados, totalVentanas, activoActual }
  }, [periodos])

  // Warning: periodo ACTIVO global termina pronto y no hay siguiente PLANIFICADO.
  const warning = useMemo(() => {
    const globales = periodos.filter(p => p.facultadId === null)
    const activoGlobal = globales.find(p => p.estado === 'ACTIVO')
    if (!activoGlobal) return null
    const fin = new Date(activoGlobal.fechaFin)
    const diasParaFin = Math.ceil((fin.getTime() - ahora.getTime()) / 86400000)
    if (diasParaFin > 30) return null
    const hayFuturo = globales.some(p =>
      p.id !== activoGlobal.id &&
      (p.estado === 'PLANIFICADO' || p.estado === 'ACTIVO') &&
      new Date(p.fechaInicio) > fin,
    )
    if (hayFuturo) return null
    return { activoGlobal, diasParaFin }
  }, [periodos, ahora])

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Hero header */}
      <section className="overflow-hidden rounded-lg border bg-card">
        {/* franja sólida primaria como anclaje visual */}
        <div className="h-1 bg-primary" aria-hidden />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">Calendario académico</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Gestiona periodos académicos y ventanas de trámite. Las ventanas cerradas
                bloquean envíos a revisión, asignación de jurados y demás acciones del flujo.
              </p>
            </div>
          </div>
          <Button onClick={() => setCrearPeriodoOpen(true)} size="default" className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nuevo periodo
          </Button>
        </div>

        {/* Stats strip — gap-px sobre fondo zinc para líneas 1px independientes del orden DOM.
            (Antes con divide-x/divide-y se generaban bordes fantasma en grid 2x2 al cambiar de
            row, porque divide-* opera sobre orden DOM y no sobre posición visual del grid.) */}
        <div className="grid grid-cols-2 gap-px border-t border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800 lg:grid-cols-4">
          <StatCell icon={Layers} label="Periodos" value={stats.total} sub={`${stats.activos} activos · ${stats.planificados} planif.`} />
          <StatCell icon={CheckCircle2} label="Ventanas configuradas" value={stats.totalVentanas} sub="Trámites con plazo definido" tone="emerald" />
          <StatCell icon={Sparkles} label="Periodo actual" value={stats.activoActual?.nombre ?? '—'} sub={stats.activoActual ? `${fmtFechaCorta(stats.activoActual.fechaInicio)} — ${fmtFechaCorta(stats.activoActual.fechaFin)}` : 'Sin periodo activo'} tone="sky" isText />
          <StatCell icon={CalendarDays} label="Hoy" value={ahora.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'America/Lima' }).replace('.', '')} sub={ahora.toLocaleDateString('es-PE', { weekday: 'long', timeZone: 'America/Lima' })} tone="primary" isText />
        </div>
      </section>

      {/* Warning banner */}
      {warning && (
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-l-amber-500 border-y border-r border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-tight">
              El periodo global <b>{warning.activoGlobal.nombre}</b> termina en {warning.diasParaFin} día{warning.diasParaFin === 1 ? '' : 's'} y no hay un periodo siguiente configurado.
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              Los plazos de jurados y correcciones que se calculen ahora podrían no saltar correctamente las vacaciones.
              Crea el siguiente periodo (estado PLANIFICADO) antes de que termine este.
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-500 bg-card hover:bg-amber-100 dark:hover:bg-amber-900" onClick={() => setCrearPeriodoOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Crear siguiente
          </Button>
        </div>
      )}

      {/* Periodos */}
      <section className="rounded-lg border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight leading-tight">Periodos académicos</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Haz clic para ver y configurar sus ventanas.</p>
          </div>
          {!loading && periodos.length > 0 && (
            <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">{periodos.length} {periodos.length === 1 ? 'periodo' : 'periodos'}</span>
          )}
        </header>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : periodos.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <CalendarOff className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">Aún no hay periodos registrados</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">Crea el primer periodo académico para empezar a definir las ventanas de trámite.</p>
            <Button className="mt-4" size="sm" onClick={() => setCrearPeriodoOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Crear periodo
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {periodos.map((p) => {
              const expandido = expandedId === p.id
              const progreso = progresoPeriodo(p.fechaInicio, p.fechaFin, ahora)
              const cubreAhora = new Date(p.fechaInicio) <= ahora && new Date(p.fechaFin) >= ahora
              return (
                <li key={p.id} className={cn(expandido && 'bg-zinc-50 dark:bg-zinc-900/40')}>
                  {/* Fila clickeable del periodo */}
                  <div
                    className={cn(
                      'flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 transition-colors',
                      expandido ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandido ? null : p.id)}
                      aria-label={expandido ? 'Ocultar ventanas' : 'Ver ventanas'}
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer',
                        expandido
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                      )}
                    >
                      <ChevronRight className={cn('w-4 h-4 transition-transform', expandido && 'rotate-90')} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(expandido ? null : p.id)}
                      className="flex flex-1 items-start gap-3 min-w-0 text-left cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold tracking-tight">{p.nombre}</h3>
                          <EstadoPill estado={p.estado} />
                          {p.esActual && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Actual
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {p.facultad?.codigo ? <>Facultad <b>{p.facultad.codigo}</b></> : 'Alcance global'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {fmtFechaCorta(p.fechaInicio)} <span className="text-zinc-400 dark:text-zinc-600">→</span> {fmtFechaCorta(p.fechaFin)}
                        </p>
                        {/* timeline */}
                        <div className="mt-2 relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div className={cn('h-full transition-all', cubreAhora ? 'bg-emerald-600' : p.estado === 'CERRADO' ? 'bg-zinc-400' : 'bg-sky-600')} style={{ width: `${progreso}%` }} />
                          {cubreAhora && (
                            <div className="absolute top-1/2 -translate-y-1/2 h-3 w-px bg-zinc-900 dark:bg-zinc-100" style={{ left: `calc(${progreso}% - 0.5px)` }} aria-label="hoy" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Acciones del periodo: claras, separadas y con texto */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandido ? null : p.id)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                          expandido
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                            : 'bg-card hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800',
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{p._count.ventanas}</span>
                        <span className="hidden sm:inline">{expandido ? 'ventanas abiertas' : 'ver ventanas'}</span>
                        <span className="inline sm:hidden">ventanas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPeriodo(p)}
                        title="Editar periodo"
                        className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Editar</span>
                      </button>
                    </div>
                  </div>

                  {/* Ventanas anidadas dentro del periodo expandido */}
                  {expandido && detalle && detalle.id === p.id && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                      {(() => {
                        const tiposGlobalesUsados = new Set(detalle.ventanas.filter(v => v.facultadId === null).map(v => v.tipo))
                        const todosConfigurados = tiposGlobalesUsados.size >= TIPOS.length
                        // Ordenar ventanas siguiendo el flujo natural del trámite
                        const ventanasOrdenadas = [...detalle.ventanas].sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo))

                        return (
                          <>
                            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-card px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                  Ventanas de trámite
                                </h3>
                                <span className="text-[10px] text-zinc-500">
                                  · ordenadas según el flujo del proyecto
                                </span>
                              </div>
                              <Button
                                onClick={() => setCrearVentanaOpen(true)}
                                size="sm"
                                variant="outline"
                                disabled={todosConfigurados}
                                title={todosConfigurados ? 'Todos los trámites ya tienen ventana en este periodo' : undefined}
                                className="h-7 text-[11px]"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Nueva ventana
                              </Button>
                            </div>

                            {detalleLoading ? (
                              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
                            ) : detalle.ventanas.length === 0 ? (
                              <div className="py-12 text-center px-4">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-800">
                                  <Inbox className="w-6 h-6 text-zinc-500" />
                                </div>
                                <p className="mt-3 text-sm font-medium">Este periodo aún no tiene ventanas</p>
                                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                                  Cada trámite (presentación, jurados, sustentación, etc.) necesita su propia ventana de plazo.
                                </p>
                                <Button className="mt-3" size="sm" onClick={() => setCrearVentanaOpen(true)}>
                                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Crear primera ventana
                                </Button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-px bg-zinc-200 dark:bg-zinc-800 md:grid-cols-2 xl:grid-cols-3">
                                {ventanasOrdenadas.map((v, idx) => {
                                  const Icon = TIPO_ICON[v.tipo] ?? FileText
                                  const ahora2 = new Date()
                                  const inicio = new Date(v.fechaInicio)
                                  const fin = new Date(v.fechaFin)
                                  const cubre = inicio <= ahora2 && fin >= ahora2 && v.habilitada
                                  const proxima = ahora2 < inicio
                                  const cerrada = fin < ahora2
                                  const stateLabel = !v.habilitada ? 'Deshabilitada' : cubre ? 'Abierta' : proxima ? 'Próxima' : 'Cerrada'
                                  // Iconos: fondo sólido a tono con el estado
                                  const iconBg = !v.habilitada
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                    : cubre
                                      ? 'bg-emerald-600 text-white'
                                      : proxima
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-zinc-500 text-white'
                                  // Pills de estado: tinte sólido pleno (no semi-transparente)
                                  const pillCls = !v.habilitada
                                    ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                                    : cubre
                                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                                      : proxima
                                        ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                                        : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                                  const stateDot = !v.habilitada ? 'bg-zinc-500' : cubre ? 'bg-emerald-600' : proxima ? 'bg-sky-600' : 'bg-zinc-500'
                                  const stateInkText = !v.habilitada
                                    ? 'text-zinc-700 dark:text-zinc-300'
                                    : cubre
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : proxima
                                        ? 'text-sky-700 dark:text-sky-400'
                                        : 'text-zinc-700 dark:text-zinc-400'
                                  // Borde izquierdo sólido por estado: el "anclaje visual"
                                  const accentBorder = !v.habilitada
                                    ? 'border-l-zinc-300 dark:border-l-zinc-700'
                                    : cubre
                                      ? 'border-l-emerald-600'
                                      : proxima
                                        ? 'border-l-sky-600'
                                        : 'border-l-zinc-400'
                                  const progreso = progresoPeriodo(v.fechaInicio, v.fechaFin, ahora2)
                                  const diasRel = cubre ? diasEntre(fin, ahora2) : proxima ? diasEntre(inicio, ahora2) : diasEntre(fin, ahora2)
                                  const relTxt = cubre
                                    ? (diasRel === 0 ? 'Cierra hoy' : diasRel === 1 ? 'Cierra mañana' : `Quedan ${diasRel} días`)
                                    : proxima
                                      ? (diasRel === 0 ? 'Abre hoy' : diasRel === 1 ? 'Abre mañana' : `Abre en ${diasRel} días`)
                                      : cerrada
                                        ? (Math.abs(diasRel) === 0 ? 'Cerró hoy' : Math.abs(diasRel) === 1 ? 'Cerró ayer' : `Cerró hace ${Math.abs(diasRel)} días`)
                                        : ''

                                  return (
                                    <article key={v.id} className={cn('bg-card p-4 border-l-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60 group', accentBorder)}>
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                          <div className="relative">
                                            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', iconBg)}>
                                              <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="absolute -top-1 -left-1 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[9px] font-bold tabular-nums px-1">
                                              {idx + 1}
                                            </span>
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className="text-sm font-semibold tracking-tight leading-tight truncate">{TIPO_LABEL[v.tipo]}</h4>
                                            <p className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                                              {v.facultad?.codigo ? <>Facultad <b>{v.facultad.codigo}</b></> : 'Alcance global'}
                                              {v._count.overrides > 0 && (
                                                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 px-1.5 py-0.5 text-[10px]">
                                                  <ShieldAlert className="w-2.5 h-2.5" /> {v._count.overrides} prórroga{v._count.overrides === 1 ? '' : 's'}
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                        <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', pillCls)}>
                                          <span className={cn('inline-block h-1.5 w-1.5 rounded-full', stateDot)} />
                                          {stateLabel}
                                        </span>
                                      </div>

                                      <div className="mt-3 flex items-baseline gap-2 text-xs tabular-nums">
                                        <CalendarDays className="w-3.5 h-3.5 text-zinc-400 self-center" />
                                        <span className="font-medium">{fmtFechaCorta(v.fechaInicio)} <span className="text-zinc-400">→</span> {fmtFechaCorta(v.fechaFin)}</span>
                                      </div>

                                      <div className="mt-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className={cn('font-semibold', stateInkText)}>{relTxt}</span>
                                          {(cubre || cerrada) && (
                                            <span className="text-[10px] text-zinc-500 tabular-nums">{progreso}% transcurrido</span>
                                          )}
                                        </div>
                                        <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                          <div className={cn('h-full', stateDot)} style={{ width: `${progreso}%` }} />
                                        </div>
                                      </div>

                                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-zinc-200 dark:border-zinc-800 pt-2 -mx-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          size="sm" variant="ghost" className="h-7 text-[11px] gap-1"
                                          title="Gestionar prórrogas / overrides"
                                          onClick={() => setOverridesVentana(v)}
                                        >
                                          <ShieldAlert className="w-3.5 h-3.5" /> Prórrogas
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={() => setEditVentana(v)}>
                                          <Pencil className="w-3.5 h-3.5" /> Editar
                                        </Button>
                                        <Button
                                          size="sm" variant="ghost"
                                          className="h-7 text-[11px] gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                          onClick={async () => {
                                            if (!confirm(`¿Eliminar la ventana de "${TIPO_LABEL[v.tipo]}"? Esta acción no se puede deshacer.`)) return
                                            const r = await fetch(`/api/admin/calendario-academico/ventanas/${v.id}`, { method: 'DELETE' })
                                            if (!r.ok) { toast.error('Error al eliminar'); return }
                                            toast.success('Ventana eliminada')
                                            loadDetalle(detalle.id)
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                        </Button>
                                      </div>
                                    </article>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <PeriodoDialog
        open={crearPeriodoOpen}
        onOpenChange={setCrearPeriodoOpen}
        onSaved={(nuevoId) => {
          setCrearPeriodoOpen(false)
          loadPeriodos()
          if (nuevoId) setExpandedId(nuevoId) // expandir el periodo recien creado
        }}
        periodosExistentes={periodos}
      />

      {editPeriodo && (
        <PeriodoDialog
          open
          periodo={editPeriodo}
          onOpenChange={(open) => { if (!open) setEditPeriodo(null) }}
          onSaved={() => { setEditPeriodo(null); loadPeriodos(); if (expandedId) loadDetalle(expandedId) }}
          periodosExistentes={periodos}
        />
      )}

      {crearVentanaOpen && detalle && (
        <VentanaDialog
          open
          periodoId={detalle.id}
          tiposUsados={detalle.ventanas.map((v) => v.tipo)}
          onOpenChange={(open) => { if (!open) setCrearVentanaOpen(false) }}
          onSaved={() => { setCrearVentanaOpen(false); loadDetalle(detalle.id); loadPeriodos() }}
        />
      )}

      {editVentana && (
        <VentanaDialog
          open
          periodoId={detalle?.id ?? ''}
          ventana={editVentana}
          onOpenChange={(open) => { if (!open) setEditVentana(null) }}
          onSaved={() => { setEditVentana(null); if (detalle) loadDetalle(detalle.id); loadPeriodos() }}
        />
      )}

      {overridesVentana && (
        <OverridesDialog
          open
          ventana={overridesVentana}
          onOpenChange={(open) => { if (!open) setOverridesVentana(null) }}
          onChanged={() => { if (detalle) loadDetalle(detalle.id) }}
        />
      )}
    </div>
  )
}

// ---------- Dialog: crear / editar periodo ----------

interface PeriodoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (nuevoId?: string) => void
  periodo?: Periodo
  periodosExistentes?: Periodo[]
}
type VentanasInit = 'defecto' | 'copiar' | 'ninguna'
function PeriodoDialog({ open, onOpenChange, onSaved, periodo, periodosExistentes = [] }: PeriodoDialogProps) {
  const editing = Boolean(periodo)
  const [anio, setAnio] = useState(periodo?.anio ?? new Date().getFullYear())
  const [semestre, setSemestre] = useState<Semestre>(periodo?.semestre ?? 'I')
  const [nombre, setNombre] = useState(periodo?.nombre ?? `${new Date().getFullYear()}-I`)
  const [fechaInicio, setFechaInicio] = useState(periodo ? toInputValue(periodo.fechaInicio) : '')
  const [fechaFin, setFechaFin] = useState(periodo ? toInputValue(periodo.fechaFin) : '')
  const [estado, setEstado] = useState<Estado>(periodo?.estado ?? 'PLANIFICADO')
  const [esActual, setEsActual] = useState(periodo?.esActual ?? false)
  const [observaciones, setObservaciones] = useState(periodo?.observaciones ?? '')
  const [ventanasInit, setVentanasInit] = useState<VentanasInit>('defecto')
  const [copiarDePeriodoId, setCopiarDePeriodoId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Candidatos para "copiar de": periodos globales (facultadId null) con ventanas.
  // TODO: si el admin configura periodos por facultad, agregar filtro por scope.
  const candidatosCopia = periodosExistentes.filter(
    (p) => p.facultadId === null && p._count.ventanas > 0 && p.id !== periodo?.id,
  )

  async function guardar() {
    if (!fechaInicio || !fechaFin) { toast.error('Fechas obligatorias'); return }
    if (!editing && ventanasInit === 'copiar' && !copiarDePeriodoId) {
      toast.error('Selecciona un periodo del cual copiar ventanas')
      return
    }
    setSaving(true)
    try {
      const body = editing
        ? {
            nombre, estado, esActual,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            observaciones: observaciones || null,
          }
        : {
            anio, semestre, nombre,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            estado, esActual,
            observaciones: observaciones || undefined,
            ventanasInit,
            copiarDePeriodoId: ventanasInit === 'copiar' ? copiarDePeriodoId : undefined,
          }
      const url = editing
        ? `/api/admin/calendario-academico/periodos/${periodo!.id}`
        : `/api/admin/calendario-academico/periodos`
      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d: { error?: string; periodo?: { id: string }; ventanasCreadas?: number } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      if (editing) {
        toast.success('Periodo actualizado')
      } else {
        const extra = d.ventanasCreadas ? ` y ${d.ventanasCreadas} ventanas` : ''
        toast.success(`Periodo creado${extra}`)
      }
      onSaved(d.periodo?.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {editing ? `Editar ${periodo?.nombre ?? 'periodo'}` : 'Nuevo periodo académico'}
              </DialogTitle>
              <DialogDescription className="text-[12px] mt-0.5">
                {editing
                  ? 'Modifica fechas, estado o vigencia. Los cambios afectan inmediatamente las ventanas de este periodo.'
                  : 'Las fechas se interpretan en zona América/Lima (UTC−5).'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
          {/* Sección 1: identidad */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Identidad</p>
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Año</Label>
                  <Input className="mt-1" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Semestre</Label>
                  <Select value={semestre} onValueChange={(v) => setSemestre(v as Semestre)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">I</SelectItem>
                      <SelectItem value="II">II</SelectItem>
                      <SelectItem value="VERANO">Verano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Nombre visible</Label>
              <Input className="mt-1" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="2026-I" />
            </div>
          </div>

          {/* Sección 2: rango de fechas */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rango de fechas</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Inicio</Label>
                <Input className="mt-1" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fin</Label>
                <Input className="mt-1" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Clock className="w-3 h-3 mt-0.5 shrink-0" />
              <span>El día de inicio cuenta desde 00:00 y el día de fin hasta 23:59:59, hora Lima.</span>
            </p>
          </div>

          {/* Sección 3: estado */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={estado} onValueChange={(v) => setEstado(v as Estado)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANIFICADO">Planificado</SelectItem>
                    <SelectItem value="ACTIVO">Activo</SelectItem>
                    <SelectItem value="CERRADO">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Switch checked={esActual} onCheckedChange={setEsActual} id="esActual" />
                  <span className="text-sm">Marcar como periodo actual</span>
                </label>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <b className="text-foreground">Planificado</b>: ventanas no aplican aún. <b className="text-foreground">Activo</b>: ventanas vigentes y comparadas con la fecha actual. <b className="text-foreground">Cerrado</b>: bloquea todas las acciones del scope.
              </span>
            </div>
          </div>

          {/* Sección 4: observaciones */}
          <div>
            <Label className="text-xs">Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea className="mt-1" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Notas internas para mesa de partes..." />
          </div>

          {!editing && (
            <div className="space-y-3 rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold leading-tight">Ventanas iniciales</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Ahorra tiempo creando las 7 ventanas de trámite junto con el periodo. Podrás ajustarlas individualmente después.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {([
                  { v: 'defecto' as const, title: 'Crear 7 ventanas por defecto', sub: 'Cada ventana cubre todo el rango del periodo. Ajustas fechas después.', enabled: true },
                  { v: 'copiar' as const, title: 'Copiar de un periodo anterior', sub: candidatosCopia.length === 0 ? 'No hay periodos con ventanas configuradas aún.' : 'Copia las ventanas del periodo elegido desplazando las fechas según el offset entre inicios.', enabled: candidatosCopia.length > 0 },
                  { v: 'ninguna' as const, title: 'No crear ventanas', sub: 'Las creo manualmente después.', enabled: true },
                ]).map(opt => (
                  <label
                    key={opt.v}
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                      opt.enabled ? 'cursor-pointer hover:bg-muted/40' : 'opacity-50 cursor-not-allowed',
                      ventanasInit === opt.v && opt.enabled && 'border-primary/40 bg-primary/[0.04]',
                    )}
                  >
                    <input
                      type="radio" name="ventanasInit" className="mt-0.5 cursor-pointer disabled:cursor-not-allowed"
                      disabled={!opt.enabled}
                      checked={ventanasInit === opt.v}
                      onChange={() => setVentanasInit(opt.v)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium">{opt.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">{opt.sub}</div>
                      {opt.v === 'copiar' && ventanasInit === 'copiar' && candidatosCopia.length > 0 && (
                        <Select value={copiarDePeriodoId} onValueChange={setCopiarDePeriodoId}>
                          <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Selecciona periodo..." /></SelectTrigger>
                          <SelectContent>
                            {candidatosCopia.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre} · {p._count.ventanas} ventana{p._count.ventanas === 1 ? '' : 's'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t bg-muted/20 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear periodo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog: crear / editar ventana ----------

interface VentanaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  periodoId: string
  ventana?: Ventana
  tiposUsados?: WindowType[]
}
function VentanaDialog({ open, onOpenChange, onSaved, periodoId, ventana, tiposUsados = [] }: VentanaDialogProps) {
  const editing = Boolean(ventana)
  const disponibles = TIPOS.filter((t) => !tiposUsados.includes(t) || t === ventana?.tipo)
  const [tipo, setTipo] = useState<WindowType>(ventana?.tipo ?? disponibles[0] ?? 'PRESENTACION_PROYECTO')
  const [fechaInicio, setFechaInicio] = useState(ventana ? toInputValue(ventana.fechaInicio) : '')
  const [fechaFin, setFechaFin] = useState(ventana ? toInputValue(ventana.fechaFin) : '')
  const [habilitada, setHabilitada] = useState(ventana?.habilitada ?? true)
  const [observaciones, setObservaciones] = useState(ventana?.observaciones ?? '')
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!fechaInicio || !fechaFin) { toast.error('Fechas obligatorias'); return }
    setSaving(true)
    try {
      const url = editing
        ? `/api/admin/calendario-academico/ventanas/${ventana!.id}`
        : `/api/admin/calendario-academico/ventanas`
      const body = editing
        ? {
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            habilitada,
            observaciones: observaciones || null,
          }
        : {
            periodoId, tipo, habilitada,
            fechaInicio: fromInputValue(fechaInicio),
            fechaFin: fromInputValue(fechaFin, true),
            observaciones: observaciones || undefined,
          }
      const r = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d: { error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      toast.success(editing ? 'Ventana actualizada' : 'Ventana creada')
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const TipoIcon = ventana ? TIPO_ICON[ventana.tipo] : (TIPO_ICON[tipo] ?? FileText)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15">
              <TipoIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {editing ? `Editar ventana — ${TIPO_LABEL[ventana!.tipo]}` : 'Nueva ventana de trámite'}
              </DialogTitle>
              <DialogDescription className="text-[12px] mt-0.5">
                Define cuándo este trámite acepta acciones del flujo. Fechas en zona América/Lima (UTC−5).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          {!editing && disponibles.length === 0 ? (
            <div className="flex flex-col items-center text-center py-6 px-4 rounded-xl border bg-muted/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/40">
                <CheckCircle2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-3 text-sm font-semibold">Todos los trámites ya tienen ventana</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Los {TIPOS.length} trámites de este periodo ya están configurados. Para cambiar fechas, usa el botón <b>Editar</b> en la tarjeta correspondiente.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          ) : !editing ? (
            <div>
              <Label className="text-xs">Trámite</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as WindowType)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona un trámite..." /></SelectTrigger>
                <SelectContent>
                  {disponibles.map((t) => {
                    const Ic = TIPO_ICON[t]
                    return (
                      <SelectItem key={t} value={t}>
                        <span className="inline-flex items-center gap-2"><Ic className="w-3.5 h-3.5" />{TIPO_LABEL[t]}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {disponibles.length < TIPOS.length && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Solo se muestran trámites sin ventana en este periodo. {TIPOS.length - disponibles.length} ya {TIPOS.length - disponibles.length === 1 ? 'configurado' : 'configurados'}.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <TipoIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trámite</p>
                <p className="text-sm font-medium">{TIPO_LABEL[ventana!.tipo]}</p>
              </div>
            </div>
          )}

          {/* Solo mostramos los demas campos cuando hay un trámite seleccionable */}
          {(editing || disponibles.length > 0) && (
            <>
              {/* fechas */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rango de plazo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Inicio</Label>
                    <Input className="mt-1" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fin</Label>
                    <Input className="mt-1" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Inicio cuenta desde 00:00 y fin hasta 23:59:59, hora Lima.</span>
                </p>
              </div>

              {/* habilitada */}
              <div className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                habilitada ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/50' : 'bg-muted/30',
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Power className={cn('w-4 h-4 shrink-0', habilitada ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Ventana habilitada</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {habilitada ? 'Las fechas se respetan según el rango configurado.' : 'Bloqueada — equivale a fuera de plazo aunque las fechas cubran hoy.'}
                    </p>
                  </div>
                </div>
                <Switch checked={habilitada} onCheckedChange={setHabilitada} id="habilitada" />
              </div>

              {/* observaciones */}
              <div>
                <Label className="text-xs">Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea className="mt-1" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Notas internas, ej: 'Plazo extendido por paro académico'" />
              </div>
            </>
          )}
        </div>
        {(editing || disponibles.length > 0) && (
          <DialogFooter className="border-t bg-muted/20 px-6 py-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardar} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear ventana'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------- Dialog: overrides / prorrogas excepcionales ----------

type OverrideCategoria = 'CASO_FORTUITO' | 'FUERZA_MAYOR' | 'ERROR_ADMINISTRATIVO' | 'REPRESENTANTE_OFICIAL' | 'OTRO'

const CATEGORIA_LABEL: Record<OverrideCategoria, string> = {
  CASO_FORTUITO: 'Caso fortuito',
  FUERZA_MAYOR: 'Fuerza mayor',
  ERROR_ADMINISTRATIVO: 'Error administrativo',
  REPRESENTANTE_OFICIAL: 'Representante oficial',
  OTRO: 'Otro',
}
const CATEGORIA_DESC: Record<OverrideCategoria, string> = {
  CASO_FORTUITO: 'Enfermedad, accidente u otro caso individual.',
  FUERZA_MAYOR: 'Paro, pandemia, desastre o causa externa colectiva.',
  ERROR_ADMINISTRATIVO: 'Error del sistema o de mesa de partes.',
  REPRESENTANTE_OFICIAL: 'Comision oficial o representacion de la universidad.',
  OTRO: 'Otra causa no tipificada.',
}
const CATEGORIAS: OverrideCategoria[] = ['CASO_FORTUITO', 'FUERZA_MAYOR', 'ERROR_ADMINISTRATIVO', 'REPRESENTANTE_OFICIAL', 'OTRO']

interface OverrideItem {
  id: string
  thesisId: string | null
  userId: string | null
  categoria: OverrideCategoria
  motivo: string
  vigenciaHasta: string
  createdAt: string
  thesis: { id: string; titulo: string } | null
  user: { id: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; numeroDocumento: string } | null
  autorizadoPor: { id: string; nombres: string; apellidoPaterno: string } | null
}

interface TesisBusquedaResult {
  id: string
  titulo: string
  estado: string
  autores: Array<{ nombreCompleto: string; documento: string; codigo: string; facultadCodigo: string }>
}
interface UserBusquedaResult {
  id: string
  nombreCompleto: string
  documento: string
  email: string
  roles: string[]
}

type Scope = 'tesis' | 'usuario' | 'general'

interface OverridesDialogProps {
  open: boolean
  ventana: Ventana
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}
function OverridesDialog({ open, ventana, onOpenChange, onChanged }: OverridesDialogProps) {
  const [overrides, setOverrides] = useState<OverrideItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'crear' | 'vigentes' | 'expiradas'>('crear')
  const [editando, setEditando] = useState<OverrideItem | null>(null)

  // Form state
  const [scope, setScope] = useState<Scope>('tesis')
  const [tesisSel, setTesisSel] = useState<TesisBusquedaResult | null>(null)
  const [userSel, setUserSel] = useState<UserBusquedaResult | null>(null)
  const [categoria, setCategoria] = useState<OverrideCategoria>('CASO_FORTUITO')
  const [motivo, setMotivo] = useState('')
  const [vigenciaHasta, setVigenciaHasta] = useState('')
  const [saving, setSaving] = useState(false)

  // Busqueda
  const [qTesis, setQTesis] = useState('')
  const [resTesis, setResTesis] = useState<TesisBusquedaResult[]>([])
  const [buscandoTesis, setBuscandoTesis] = useState(false)
  const [qUser, setQUser] = useState('')
  const [resUser, setResUser] = useState<UserBusquedaResult[]>([])
  const [buscandoUser, setBuscandoUser] = useState(false)

  const resetForm = useCallback(() => {
    setEditando(null)
    setScope('tesis')
    setTesisSel(null); setUserSel(null)
    setCategoria('CASO_FORTUITO')
    setMotivo('')
    setVigenciaHasta('')
    setQTesis(''); setResTesis([])
    setQUser(''); setResUser([])
    setTab('crear') // al reabrir el dialog, siempre arrancar en el form
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/calendario-academico/overrides?windowId=${ventana.id}`)
      const d: { overrides?: OverrideItem[]; error?: string } = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Error')
      setOverrides(d.overrides ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [ventana.id])

  useEffect(() => { if (open) { load(); resetForm() } }, [open, load, resetForm])

  // Debounce busqueda tesis
  useEffect(() => {
    if (scope !== 'tesis' || qTesis.trim().length < 2) { setResTesis([]); return }
    const ac = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoTesis(true)
      try {
        const r = await fetch(`/api/admin/tesis/buscar?q=${encodeURIComponent(qTesis)}`, { signal: ac.signal })
        const d: { tesis?: TesisBusquedaResult[] } = await r.json()
        if (!ac.signal.aborted) setResTesis(d.tesis ?? [])
      } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) console.error(e) }
      finally { if (!ac.signal.aborted) setBuscandoTesis(false) }
    }, 250)
    return () => { ac.abort(); clearTimeout(t) }
  }, [qTesis, scope])

  // Debounce busqueda user
  useEffect(() => {
    if (scope !== 'usuario' || qUser.trim().length < 2) { setResUser([]); return }
    const ac = new AbortController()
    const t = setTimeout(async () => {
      setBuscandoUser(true)
      try {
        const r = await fetch(`/api/admin/users/buscar?q=${encodeURIComponent(qUser)}`, { signal: ac.signal })
        const d: { users?: UserBusquedaResult[] } = await r.json()
        if (!ac.signal.aborted) setResUser(d.users ?? [])
      } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) console.error(e) }
      finally { if (!ac.signal.aborted) setBuscandoUser(false) }
    }, 250)
    return () => { ac.abort(); clearTimeout(t) }
  }, [qUser, scope])

  function quickChip(days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setVigenciaHasta(toInputValue(d.toISOString()))
  }
  function quickFinVentana() {
    setVigenciaHasta(toInputValue(ventana.fechaFin))
  }

  function startEdit(o: OverrideItem) {
    setEditando(o)
    // Limpiamos ambos selects antes de setear el que aplica, para no dejar
    // residuales de ediciones previas cuando scope=general.
    setTesisSel(null); setUserSel(null)
    if (o.thesisId && o.thesis) {
      setScope('tesis')
      setTesisSel({ id: o.thesisId, titulo: o.thesis.titulo, estado: '', autores: [] })
    } else if (o.userId && o.user) {
      setScope('usuario')
      setUserSel({
        id: o.userId,
        nombreCompleto: `${o.user.apellidoPaterno} ${o.user.apellidoMaterno}, ${o.user.nombres}`,
        documento: o.user.numeroDocumento, email: '', roles: [],
      })
    } else {
      setScope('general')
    }
    setCategoria(o.categoria)
    setMotivo(o.motivo)
    // toInputValue formatea en zona America/Lima.
    setVigenciaHasta(toInputValue(o.vigenciaHasta))
    setTab('crear')
  }

  async function guardar() {
    if (motivo.trim().length < 10) { toast.error('Motivo minimo 10 caracteres'); return }
    if (!vigenciaHasta) { toast.error('Fecha de vigencia requerida'); return }
    if (scope === 'tesis' && !tesisSel) { toast.error('Selecciona una tesis'); return }
    if (scope === 'usuario' && !userSel) { toast.error('Selecciona un usuario'); return }
    setSaving(true)
    try {
      if (editando) {
        const r = await fetch(`/api/admin/calendario-academico/overrides/${editando.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoria, motivo: motivo.trim(),
            vigenciaHasta: fromInputValue(vigenciaHasta, true),
          }),
        })
        const d: { error?: string } = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Error')
        toast.success('Prorroga actualizada')
      } else {
        const r = await fetch('/api/admin/calendario-academico/overrides', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            windowId: ventana.id,
            thesisId: scope === 'tesis' ? tesisSel!.id : null,
            userId: scope === 'usuario' ? userSel!.id : null,
            categoria, motivo: motivo.trim(),
            vigenciaHasta: fromInputValue(vigenciaHasta, true),
          }),
        })
        const d: { error?: string } = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Error')
        toast.success('Prorroga creada')
      }
      resetForm()
      setTab('vigentes')
      load()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id: string) {
    if (!confirm('Eliminar esta prorroga?')) return
    const r = await fetch(`/api/admin/calendario-academico/overrides/${id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error('Error al eliminar'); return }
    toast.success('Prorroga eliminada')
    load()
    onChanged()
  }

  const ahora = new Date()
  const vigentes = overrides.filter((o) => new Date(o.vigenciaHasta) >= ahora)
  const expiradas = overrides.filter((o) => new Date(o.vigenciaHasta) < ahora)

  const VentanaIcon = TIPO_ICON[ventana.tipo] ?? FileText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b bg-gradient-to-br from-amber-50/50 to-card dark:from-amber-950/20 dark:to-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40 ring-1 ring-inset ring-amber-200 dark:ring-amber-900/60">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
                Prórrogas excepcionales
                <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <VentanaIcon className="w-3.5 h-3.5" /> {TIPO_LABEL[ventana.tipo]}
                </span>
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-[12px] mt-1">
                <span className="tabular-nums">
                  Ventana original <b>{isoDate(ventana.fechaInicio)}</b> → <b>{isoDate(ventana.fechaFin)}</b>
                </span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  ventana.habilitada
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400'
                )}>
                  <span className={cn('inline-block h-1.5 w-1.5 rounded-full', ventana.habilitada ? 'bg-emerald-500' : 'bg-zinc-400')} />
                  {ventana.habilitada ? 'Habilitada' : 'Deshabilitada'}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden px-6 pb-3 pt-3">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="crear">{editando ? 'Editando' : 'Crear nueva'}</TabsTrigger>
            <TabsTrigger value="vigentes">Vigentes ({vigentes.length})</TabsTrigger>
            <TabsTrigger value="expiradas">Expiradas ({expiradas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="crear" className="flex-1 overflow-y-auto pr-1 space-y-4 pt-3">
            {editando && (
              <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2 text-xs flex items-center justify-between">
                <span>Editando prorroga #{editando.id.slice(-6)}. El scope (tesis/usuario/general) no se puede cambiar.</span>
                <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            )}

            {/* Scope selector */}
            <div className="space-y-2">
              <Label className="text-xs">Aplicar a</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                {(['tesis', 'usuario', 'general'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={Boolean(editando)}
                    onClick={() => {
                      setScope(s)
                      // Limpiar seleccion y busqueda del scope anterior para no
                      // dejar residuales.
                      setTesisSel(null); setUserSel(null)
                      setQTesis(''); setResTesis([])
                      setQUser(''); setResUser([])
                    }}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                      scope === s ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      editando && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    {s === 'tesis' ? 'Tesis especifica' : s === 'usuario' ? 'Usuario especifico' : 'General (todos)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buscador segun scope */}
            {scope === 'tesis' && !editando && (
              <div className="space-y-2">
                {tesisSel ? (
                  <div className="rounded-md border p-2 text-sm flex items-start justify-between gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300">
                    <div className="flex-1">
                      <div className="font-medium">{tesisSel.titulo}</div>
                      {tesisSel.autores[0] && (
                        <div className="text-xs text-muted-foreground">
                          {tesisSel.autores[0].nombreCompleto} — {tesisSel.autores[0].codigo} — {tesisSel.autores[0].facultadCodigo}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setTesisSel(null)}>Cambiar</Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar por titulo, DNI, codigo o nombre de autor..."
                      value={qTesis}
                      onChange={(e) => setQTesis(e.target.value)}
                    />
                    {buscandoTesis && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    {!buscandoTesis && qTesis.length >= 2 && resTesis.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin resultados.</p>
                    )}
                    {resTesis.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {resTesis.map((t) => (
                          <button
                            key={t.id} type="button"
                            onClick={() => { setTesisSel(t); setQTesis(''); setResTesis([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0 cursor-pointer"
                          >
                            <div className="font-medium line-clamp-1">{t.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.autores[0]?.nombreCompleto ?? 'sin autor activo'} — {t.estado}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {scope === 'usuario' && !editando && (
              <div className="space-y-2">
                {userSel ? (
                  <div className="rounded-md border p-2 text-sm flex items-start justify-between gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300">
                    <div className="flex-1">
                      <div className="font-medium">{userSel.nombreCompleto}</div>
                      <div className="text-xs text-muted-foreground">DNI {userSel.documento}{userSel.email ? ` — ${userSel.email}` : ''}</div>
                      {userSel.roles.length > 0 && (
                        <div className="text-[10px] mt-1 flex gap-1 flex-wrap">
                          {userSel.roles.map((r) => <Badge key={r} variant="outline" className="text-[9px] px-1 py-0 h-4">{r}</Badge>)}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setUserSel(null)}>Cambiar</Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Buscar por nombre, apellido, DNI o email..."
                      value={qUser}
                      onChange={(e) => setQUser(e.target.value)}
                    />
                    {buscandoUser && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    {!buscandoUser && qUser.length >= 2 && resUser.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin resultados.</p>
                    )}
                    {resUser.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {resUser.map((u) => (
                          <button
                            key={u.id} type="button"
                            onClick={() => { setUserSel(u); setQUser(''); setResUser([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0 cursor-pointer"
                          >
                            <div className="font-medium">{u.nombreCompleto}</div>
                            <div className="text-xs text-muted-foreground">
                              DNI {u.documento} — {u.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {scope === 'general' && !editando && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="font-medium flex items-center gap-1"><AlertTriangleIcon /> Prorroga general</div>
                <p className="mt-1">Afectara a <b>todas las tesis/usuarios</b> que intenten la accion mientras la prorroga este vigente. Usalo solo para casos de fuerza mayor colectiva.</p>
              </div>
            )}

            {/* Categoría */}
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as OverrideCategoria)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{CATEGORIA_DESC[categoria]}</p>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <Label className="text-xs">Motivo / justificacion (minimo 10 caracteres)</Label>
              <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ej: Resolucion rectoral 0123-2026 por paro de transporte del 10-15 abril." />
              <p className="text-[11px] text-muted-foreground">{motivo.length} caracteres</p>
            </div>

            {/* Vigencia con chips */}
            <div className="space-y-2">
              <Label className="text-xs">Vigencia hasta</Label>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(3)}>+3 días</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(7)}>+1 semana</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(15)}>+15 días</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickChip(30)}>+1 mes</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={quickFinVentana}>Fin de ventana</Button>
              </div>
              <Input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)} />
              {vigenciaHasta && new Date(vigenciaHasta) > new Date(ventana.fechaFin) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  La vigencia excede el fin de la ventana original ({isoDate(ventana.fechaFin)}).
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editando && <Button variant="outline" onClick={resetForm}>Cancelar edicion</Button>}
              <Button onClick={guardar} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editando ? 'Guardar cambios' : 'Crear prorroga'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="vigentes" className="flex-1 overflow-y-auto pr-1 pt-3">
            {loading
              ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : <OverridesLista overrides={vigentes} onEdit={startEdit} onDelete={eliminar} ventanaFechaFin={new Date(ventana.fechaFin)} />}
          </TabsContent>

          <TabsContent value="expiradas" className="flex-1 overflow-y-auto pr-1 pt-3">
            {loading
              ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              : <OverridesLista overrides={expiradas} onDelete={eliminar} readonly ventanaFechaFin={new Date(ventana.fechaFin)} />}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AlertTriangleIcon() {
  // Inline tiny triangle icon to evitar importar otro lucide en este archivo
  return <span className="inline-block w-3 h-3 text-amber-600">⚠</span>
}

interface OverridesListaProps {
  overrides: OverrideItem[]
  onEdit?: (o: OverrideItem) => void
  onDelete: (id: string) => void
  readonly?: boolean
  ventanaFechaFin: Date
}
function OverridesLista({ overrides, onEdit, onDelete, readonly, ventanaFechaFin }: OverridesListaProps) {
  if (overrides.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Sin prorrogas en esta lista.</p>
  }
  const ahora = new Date()
  return (
    <div className="space-y-2">
      {overrides.map((o) => {
        const vig = new Date(o.vigenciaHasta)
        const diasRest = Math.ceil((vig.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000))
        const excedeVentana = vig > ventanaFechaFin
        return (
          <div key={o.id} className="rounded-md border p-3 text-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{CATEGORIA_LABEL[o.categoria]}</Badge>
                {o.thesis && <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">Tesis</Badge>}
                {o.user && <Badge className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200">Usuario</Badge>}
                {!o.thesis && !o.user && <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">General</Badge>}
                {diasRest >= 0 && <span className="text-[11px] text-muted-foreground">{diasRest === 0 ? 'vence hoy' : `${diasRest} dia${diasRest === 1 ? '' : 's'} restantes`}</span>}
                {diasRest < 0 && <span className="text-[11px] text-muted-foreground">expiro hace {-diasRest} dia{-diasRest === 1 ? '' : 's'}</span>}
              </div>
              <div className="flex gap-1">
                {!readonly && onEdit && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(o)} title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDelete(o.id)} title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            </div>
            {o.thesis && (
              <div className="text-xs"><span className="text-muted-foreground">Tesis:</span> {o.thesis.titulo}</div>
            )}
            {o.user && (
              <div className="text-xs">
                <span className="text-muted-foreground">Usuario:</span> {o.user.apellidoPaterno} {o.user.apellidoMaterno}, {o.user.nombres} (DNI {o.user.numeroDocumento})
              </div>
            )}
            <div className="text-xs whitespace-pre-wrap">{o.motivo}</div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Hasta <b>{new Date(o.vigenciaHasta).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</b>
                {excedeVentana && <span className="text-amber-700 dark:text-amber-300 ml-1">(excede fin de ventana)</span>}
              </span>
              {o.autorizadoPor && <span>por {o.autorizadoPor.apellidoPaterno}, {o.autorizadoPor.nombres}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
