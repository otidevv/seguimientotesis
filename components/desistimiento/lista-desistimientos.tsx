'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ESTADO_SOLICITUD_CONFIG, MOTIVO_COLOR } from '@/components/desistimiento/constants'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'
import {
  ArrowRight, ArrowUpRight, BarChart3, Ban, CheckCircle2, ChevronLeft,
  ChevronRight, Clock, Inbox, RefreshCw, Search, Users, XCircle,
  ArrowDownUp, ArrowUp, ArrowDown,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const FILTERS_STORAGE_KEY = 'desistimientos-filters-v1'
type SortKey = 'solicitadoAt' | 'estudiante' | 'motivoCategoria' | 'estadoTesisAlSolicitar'
type SortDir = 'asc' | 'desc'

type EstadoSolicitud = keyof typeof ESTADO_SOLICITUD_CONFIG

interface Item {
  id: string
  thesisId: string
  tituloTesis: string
  estudiante: string
  documento: string
  carrera: string
  facultad: string
  motivoCategoria: string
  estadoSolicitud: EstadoSolicitud
  estadoTesisAlSolicitar: string
  teniaCoautor: boolean
  solicitadoAt: string
  aprobadoAt: string | null
}

interface Contadores {
  PENDIENTE: number
  APROBADO: number
  RECHAZADO: number
  CANCELADO: number
  TOTAL: number
}

type FiltroEstado = 'TODOS' | EstadoSolicitud

const FILTROS: Array<{ key: FiltroEstado; label: string }> = [
  { key: 'PENDIENTE',  label: 'Pendientes' },
  { key: 'APROBADO',   label: 'Aprobados' },
  { key: 'RECHAZADO',  label: 'Rechazados' },
  { key: 'CANCELADO',  label: 'Cancelados' },
  { key: 'TODOS',      label: 'Todos' },
]

const ESTADO_TESIS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  OBSERVADA: 'Observada',
  ASIGNANDO_JURADOS: 'Asignando jurados',
  EN_EVALUACION_JURADO: 'Eval. jurado',
  OBSERVADA_JURADO: 'Obs. jurado',
  PROYECTO_APROBADO: 'Proy. aprobado',
}

const PAGE_SIZE = 20

function diasDesde(fechaISO: string): number {
  const ms = Date.now() - new Date(fechaISO).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function colorUrgencia(dias: number): string {
  if (dias <= 2) return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30'
  if (dias <= 7) return 'text-amber-700 bg-amber-100 dark:bg-amber-900/30'
  return 'text-red-700 bg-red-100 dark:bg-red-900/30'
}

function formatoFecha(d: string): string {
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima',
  })
}

function filtrarPorQuery(busqueda: string) {
  const q = busqueda.trim().toLowerCase()
  return (i: Item) =>
    i.estudiante.toLowerCase().includes(q) ||
    i.tituloTesis.toLowerCase().includes(q) ||
    i.documento.toLowerCase().includes(q) ||
    i.carrera.toLowerCase().includes(q)
}

function obtenerValor(i: Item, key: SortKey): string | number {
  switch (key) {
    case 'solicitadoAt': return new Date(i.solicitadoAt).getTime()
    case 'estudiante': return i.estudiante.toLowerCase()
    case 'motivoCategoria': return i.motivoCategoria
    case 'estadoTesisAlSolicitar': return i.estadoTesisAlSolicitar
  }
}

function tooltipEstado(estado: EstadoSolicitud): string {
  switch (estado) {
    case 'PENDIENTE':  return 'El tesista solicitó desistir y la solicitud está a la espera de revisión de mesa de partes.'
    case 'APROBADO':   return 'Mesa de partes aprobó el desistimiento. Se aplicaron los cambios en la tesis.'
    case 'RECHAZADO':  return 'Mesa de partes rechazó la solicitud. La tesis continúa en su estado previo.'
    case 'CANCELADO':  return 'El propio tesista canceló su solicitud antes de ser resuelta.'
  }
}

export function ListaDesistimientos() {
  // Restaurar filtros desde localStorage (si existen)
  const initial = (() => {
    if (typeof window === 'undefined') return { estado: 'PENDIENTE' as FiltroEstado, busqueda: '', sortKey: 'solicitadoAt' as SortKey, sortDir: 'desc' as SortDir }
    try {
      const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY)
      if (!raw) return { estado: 'PENDIENTE' as FiltroEstado, busqueda: '', sortKey: 'solicitadoAt' as SortKey, sortDir: 'desc' as SortDir }
      const parsed = JSON.parse(raw)
      return {
        estado: (parsed.estado ?? 'PENDIENTE') as FiltroEstado,
        busqueda: typeof parsed.busqueda === 'string' ? parsed.busqueda : '',
        sortKey: (parsed.sortKey ?? 'solicitadoAt') as SortKey,
        sortDir: (parsed.sortDir ?? 'desc') as SortDir,
      }
    } catch {
      return { estado: 'PENDIENTE' as FiltroEstado, busqueda: '', sortKey: 'solicitadoAt' as SortKey, sortDir: 'desc' as SortDir }
    }
  })()

  const [estado, setEstado] = useState<FiltroEstado>(initial.estado)
  const [items, setItems] = useState<Item[]>([])
  const [contadores, setContadores] = useState<Contadores>({ PENDIENTE: 0, APROBADO: 0, RECHAZADO: 0, CANCELADO: 0, TOTAL: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busqueda, setBusqueda] = useState(initial.busqueda)
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey)
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir)

  // Persistir filtros y ordenamiento
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ estado, busqueda, sortKey, sortDir }))
    } catch { /* silencioso */ }
  }, [estado, busqueda, sortKey, sortDir])

  const cargar = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(
        `/api/mesa-partes/desistimientos?estado=${estado}&page=${page}&pageSize=${PAGE_SIZE}`,
        { signal },
      )
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items ?? [])
      setTotal(d.total ?? 0)
      if (d.contadores) setContadores(d.contadores)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [estado, page])

  useEffect(() => {
    setLoading(true)
    const ctrl = new AbortController()
    cargar(ctrl.signal)
    return () => ctrl.abort()
  }, [cargar])

  // Handler de ordenamiento: si la misma columna, invierte dir; si es otra, asigna default.
  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'solicitadoAt' ? 'desc' : 'asc')
    }
  }, [sortKey])

  const itemsFiltrados = useMemo(() => {
    const filtrados = busqueda.trim()
      ? items.filter(filtrarPorQuery(busqueda))
      : items
    const ordenados = [...filtrados].sort((a, b) => {
      const va = obtenerValor(a, sortKey)
      const vb = obtenerValor(b, sortKey)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return ordenados
  }, [items, busqueda, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const refrescar = () => {
    setRefreshing(true)
    cargar()
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pendientes"
          value={contadores.PENDIENTE}
          icon={<Clock className="w-5 h-5" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600"
          highlighted={contadores.PENDIENTE > 0}
          onClick={() => { setEstado('PENDIENTE'); setPage(1) }}
          active={estado === 'PENDIENTE'}
        />
        <StatCard
          label="Aprobados"
          value={contadores.APROBADO}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
          onClick={() => { setEstado('APROBADO'); setPage(1) }}
          active={estado === 'APROBADO'}
        />
        <StatCard
          label="Rechazados"
          value={contadores.RECHAZADO}
          icon={<XCircle className="w-5 h-5" />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600"
          onClick={() => { setEstado('RECHAZADO'); setPage(1) }}
          active={estado === 'RECHAZADO'}
        />
        <StatCard
          label="Cancelados"
          value={contadores.CANCELADO}
          icon={<Ban className="w-5 h-5" />}
          iconBg="bg-slate-100 dark:bg-slate-800"
          iconColor="text-slate-600"
          onClick={() => { setEstado('CANCELADO'); setPage(1) }}
          active={estado === 'CANCELADO'}
        />
      </div>

      {/* Filtros + búsqueda + acciones */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTROS.map(f => {
              const count = f.key === 'TODOS' ? contadores.TOTAL : (contadores[f.key as EstadoSolicitud] ?? 0)
              const isActive = estado === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => { setEstado(f.key); setPage(1) }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border bg-card hover:bg-accent text-muted-foreground',
                    count === 0 && !isActive && 'opacity-50',
                  )}
                >
                  <span>{f.label}</span>
                  <span className={cn('tabular-nums', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
                    {count}
                  </span>
                </button>
              )
            })}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refrescar} disabled={refreshing}>
                <RefreshCw className={cn('w-4 h-4 mr-1.5', refreshing && 'animate-spin')} />
                Actualizar
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/mesa-partes/reportes/desistimientos">
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  Ver reportes
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estudiante, tesis, DNI o carrera..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla / cards / estado vacío / loading */}
      {loading ? (
        <LoadingSkeleton />
      ) : itemsFiltrados.length === 0 ? (
        <EmptyState estado={estado} hasSearch={!!busqueda.trim()} />
      ) : (
        <>
          {/* Desktop */}
          <Card className="overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs w-[140px]">
                    <SortButton col="solicitadoAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}>
                      Fecha / Antigüedad
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortButton col="estudiante" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}>
                      Estudiante
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-xs max-w-[260px]">Tesis</TableHead>
                  <TableHead className="text-xs">
                    <SortButton col="motivoCategoria" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}>
                      Motivo
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortButton col="estadoTesisAlSolicitar" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}>
                      Fase / Coautor
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-right w-[80px]"><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsFiltrados.map(i => {
                  const cfg = ESTADO_SOLICITUD_CONFIG[i.estadoSolicitud]
                  const dias = diasDesde(i.solicitadoAt)
                  const urgente = i.estadoSolicitud === 'PENDIENTE'
                  return (
                    <TableRow key={i.id} className="group">
                      <TableCell>
                        <div className="text-xs text-muted-foreground">{formatoFecha(i.solicitadoAt)}</div>
                        {urgente && (
                          <span className={cn('inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium', colorUrgencia(dias))}>
                            <Clock className="w-3 h-3" />
                            {dias === 0 ? 'Hoy' : dias === 1 ? '1 día' : `${dias} días`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{i.estudiante}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono">{i.documento}</span>
                          <span className="mx-1">·</span>
                          <span className="truncate">{i.carrera}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="text-sm font-medium line-clamp-1" title={i.tituloTesis}>
                          {i.tituloTesis}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{i.facultad}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(MOTIVO_COLOR[i.motivoCategoria] ?? 'bg-gray-100 text-gray-800', 'text-[11px] font-medium')}>
                          {MOTIVO_LABEL[i.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? i.motivoCategoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            {ESTADO_TESIS_LABELS[i.estadoTesisAlSolicitar] ?? i.estadoTesisAlSolicitar}
                          </div>
                          {i.teniaCoautor && (
                            <Badge variant="outline" className="text-[10px] gap-1 h-5">
                              <Users className="w-3 h-3" />Con coautor
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1 text-[11px] font-medium border-transparent cursor-help')}>
                                {cfg.icon}{cfg.label}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{tooltipEstado(i.estadoSolicitud)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          size="sm"
                          variant={urgente ? 'default' : 'ghost'}
                          className={cn(
                            'h-8',
                            !urgente && 'opacity-0 group-hover:opacity-100 transition-opacity',
                          )}
                        >
                          <Link href={`/mesa-partes/desistimientos/${i.id}`}>
                            {urgente ? 'Revisar' : 'Ver'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {itemsFiltrados.map(i => {
              const cfg = ESTADO_SOLICITUD_CONFIG[i.estadoSolicitud]
              const dias = diasDesde(i.solicitadoAt)
              const urgente = i.estadoSolicitud === 'PENDIENTE'
              return (
                <Link
                  key={i.id}
                  href={`/mesa-partes/desistimientos/${i.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors">
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">{i.estudiante}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{i.carrera}</div>
                        </div>
                        <Badge className={cn(cfg.bgColor, cfg.color, 'gap-1 text-[10px] shrink-0 border-transparent')}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                      </div>
                      <div className="text-sm line-clamp-2 leading-snug">{i.tituloTesis}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn(MOTIVO_COLOR[i.motivoCategoria] ?? 'bg-gray-100 text-gray-800', 'text-[10px] font-medium')}>
                          {MOTIVO_LABEL[i.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? i.motivoCategoria}
                        </Badge>
                        {i.teniaCoautor && (
                          <Badge variant="outline" className="text-[10px] gap-1 h-5"><Users className="w-3 h-3" />Coautor</Badge>
                        )}
                        {urgente && (
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ml-auto', colorUrgencia(dias))}>
                            <Clock className="w-3 h-3" />{dias === 0 ? 'Hoy' : `${dias} días`}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                          Ver <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Paginación */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-muted-foreground">
                Mostrando{' '}
                <span className="font-medium text-foreground">{((page - 1) * PAGE_SIZE) + 1}</span>
                {' - '}
                <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, total)}</span>
                {' de '}
                <span className="font-medium text-foreground">{total}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2.5" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Página anterior">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </Button>
                <span className="text-xs text-muted-foreground px-2 tabular-nums">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 px-2.5" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Página siguiente">
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label, value, icon, iconBg, iconColor, highlighted, onClick, active,
}: {
  label: string; value: number; icon: React.ReactNode;
  iconBg: string; iconColor: string;
  highlighted?: boolean; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-4 flex items-center gap-3 transition-all cursor-pointer',
        'hover:border-primary/50 hover:shadow-sm',
        active && 'border-primary ring-2 ring-primary/20 bg-primary/5',
        highlighted && !active && 'border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10',
      )}
    >
      <div className={cn('flex items-center justify-center w-11 h-11 rounded-xl shrink-0', iconBg)}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </button>
  )
}

function SortButton({
  col, sortKey, sortDir, onClick, children,
}: {
  col: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onClick: (k: SortKey) => void
  children: React.ReactNode
}) {
  const activo = sortKey === col
  const Icon = activo ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowDownUp
  return (
    <button
      type="button"
      onClick={() => onClick(col)}
      className={cn(
        'inline-flex items-center gap-1 transition-colors cursor-pointer',
        activo ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
      aria-label={`Ordenar por ${typeof children === 'string' ? children : col}`}
      aria-pressed={activo}
    >
      {children}
      <Icon className="w-3 h-3 opacity-70" aria-hidden="true" />
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-20" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function EmptyState({ estado, hasSearch }: { estado: FiltroEstado; hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Sin coincidencias</h3>
          <p className="text-xs text-muted-foreground">Ajusta tu búsqueda o limpia el filtro</p>
        </CardContent>
      </Card>
    )
  }

  const mensajes: Record<FiltroEstado, { titulo: string; descripcion: string; icon: React.ReactNode }> = {
    PENDIENTE:  { titulo: 'Sin solicitudes pendientes',  descripcion: 'Cuando un tesista solicite desistir, aparecerá aquí para que decidas.', icon: <Clock className="w-7 h-7 text-amber-500" /> },
    APROBADO:   { titulo: 'Sin desistimientos aprobados', descripcion: 'Aquí verás los casos que ya aprobaste con su resolución modificatoria.', icon: <CheckCircle2 className="w-7 h-7 text-emerald-500" /> },
    RECHAZADO:  { titulo: 'Sin rechazos registrados',     descripcion: 'Aquí aparecerán las solicitudes que hayas rechazado con su motivo.',    icon: <XCircle className="w-7 h-7 text-red-500" /> },
    CANCELADO:  { titulo: 'Sin cancelaciones',            descripcion: 'Aquí aparecerán las solicitudes que los tesistas cancelen por su cuenta.', icon: <Ban className="w-7 h-7 text-slate-500" /> },
    TODOS:      { titulo: 'Sin registros aún',            descripcion: 'Aún no se ha registrado ningún desistimiento en tu facultad.',         icon: <Inbox className="w-7 h-7 text-muted-foreground" /> },
  }
  const m = mensajes[estado]
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
          {m.icon}
        </div>
        <h3 className="text-sm font-semibold mb-1">{m.titulo}</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{m.descripcion}</p>
      </CardContent>
    </Card>
  )
}
