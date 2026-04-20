'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock, Eye, FileCheck, FileText, FileUp, Gavel, Inbox, Loader2,
  Search, GraduationCap, UserPlus, X, Archive, Ban, BarChart3, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { CalendarStatusWidget } from '@/components/academic-calendar/calendar-status-widget'

interface Proyecto {
  id: string; codigo: string; titulo: string; estado: string; fechaEnvio: string
  autorPrincipal: { nombre: string; codigo: string; email: string } | null
  cantidadAutores: number
  asesor: { nombre: string; estado: string } | null
  carrera: string
  facultad: { id: string; nombre: string; codigo: string } | null
  tieneProyecto: boolean; tieneCartaAsesor: boolean; documentosCount: number
}

type Contadores = Record<string, number>

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string; icon: React.ReactNode }> = {
  EN_REVISION:            { label: 'En Revisión',      color: 'text-blue-600',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       dotColor: 'bg-blue-500',    icon: <Clock className="w-3.5 h-3.5" /> },
  OBSERVADA:              { label: 'Observada',         color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  ASIGNANDO_JURADOS:      { label: 'Asign. Jurados',    color: 'text-purple-600',  bgColor: 'bg-purple-100 dark:bg-purple-900/30',   dotColor: 'bg-purple-500',  icon: <UserPlus className="w-3.5 h-3.5" /> },
  EN_EVALUACION_JURADO:   { label: 'Eval. Jurado',      color: 'text-indigo-600',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   dotColor: 'bg-indigo-500',  icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  OBSERVADA_JURADO:       { label: 'Obs. Jurado',       color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  PROYECTO_APROBADO:      { label: 'Proy. Aprobado',    color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', dotColor: 'bg-emerald-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  INFORME_FINAL:          { label: 'Informe Final',     color: 'text-cyan-600',    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',       dotColor: 'bg-cyan-500',    icon: <FileUp className="w-3.5 h-3.5" /> },
  EN_REVISION_INFORME:    { label: 'Rev. Informe',      color: 'text-blue-600',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       dotColor: 'bg-blue-500',    icon: <Clock className="w-3.5 h-3.5" /> },
  EN_EVALUACION_INFORME:  { label: 'Eval. Informe',     color: 'text-indigo-600',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   dotColor: 'bg-indigo-500',  icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  OBSERVADA_INFORME:      { label: 'Obs. Informe',      color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  APROBADA:               { label: 'Aprobada',          color: 'text-green-600',   bgColor: 'bg-green-100 dark:bg-green-900/30',     dotColor: 'bg-green-500',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  EN_SUSTENTACION:        { label: 'En Sustentación',   color: 'text-purple-600',  bgColor: 'bg-purple-100 dark:bg-purple-900/30',   dotColor: 'bg-purple-500',  icon: <GraduationCap className="w-3.5 h-3.5" /> },
  RECHAZADA:              { label: 'Rechazada',         color: 'text-red-600',     bgColor: 'bg-red-100 dark:bg-red-900/30',         dotColor: 'bg-red-500',     icon: <X className="w-3.5 h-3.5" /> },
  SOLICITUD_DESISTIMIENTO:{ label: 'Desistimiento',     color: 'text-amber-700',   bgColor: 'bg-amber-100 dark:bg-amber-900/30',     dotColor: 'bg-amber-500',   icon: <Ban className="w-3.5 h-3.5" /> },
}

const TODOS_LOS_ESTADOS = Object.keys(ESTADO_CONFIG)

export default function MesaPartesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasPermission } = useAuth()

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [contadores, setContadores] = useState<Contadores>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('EN_REVISION')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [facultadAsignada, setFacultadAsignada] = useState<string | null>(null)
  const [desistimientosPendientes, setDesistimientosPendientes] = useState(0)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (!authLoading && user) loadProyectos()
  }, [authLoading, user, filtroEstado, page])

  const handleFiltroEstado = (estado: string) => { setPage(1); setFiltroEstado(estado) }

  const loadProyectos = async () => {
    try {
      setLoading(true)
      const result = await api.get<{
        data: Proyecto[]; contadores: Contadores; facultadAsignada?: string
        desistimientosPendientes?: number
        pagination?: { totalPages: number; totalItems: number }
      }>('/api/mesa-partes', { params: { estado: filtroEstado, page, limit: ITEMS_PER_PAGE } })
      setProyectos(result.data); setContadores(result.contadores)
      if (result.facultadAsignada !== undefined) setFacultadAsignada(result.facultadAsignada)
      if (typeof result.desistimientosPendientes === 'number') setDesistimientosPendientes(result.desistimientosPendientes)
      if (result.pagination) { setTotalPages(result.pagination.totalPages); setTotalItems(result.pagination.totalItems) }
    } catch (error) { console.error('Error cargando proyectos:', error) }
    finally { setLoading(false); setInitialLoading(false) }
  }

  const proyectosFiltrados = proyectos.filter((p) => {
    if (!busqueda) return true
    const t = busqueda.toLowerCase()
    return p.titulo.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t) ||
      p.autorPrincipal?.nombre.toLowerCase().includes(t) || p.carrera.toLowerCase().includes(t)
  })

  if (authLoading || initialLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-8 w-28 rounded-lg" />))}
        </div>
        <Card>
          <div className="flex gap-3 p-4 border-b"><Skeleton className="h-9 flex-1" /><Skeleton className="h-9 w-44" /></div>
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-4 w-20" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-64" /><Skeleton className="h-3 w-40" /></div>
                <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
                <Skeleton className="h-4 w-16 hidden sm:block" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (!hasPermission('mesa-partes', 'view')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Acceso Restringido</h2>
                <p className="text-sm text-muted-foreground">Esta sección es solo para personal de Mesa de Partes.</p>
              </div>
              <Button variant="outline" asChild><Link href="/dashboard">Volver al Dashboard</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalProyectos = Object.values(contadores).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Mesa de Partes
          {facultadAsignada && <span className="text-primary/80"> — {facultadAsignada}</span>}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {facultadAsignada ? `Gestión de proyectos de tesis de la ${facultadAsignada}` : 'Gestión de proyectos de tesis recibidos'}
        </p>
      </div>

      {/* Accesos rápidos: Desistimientos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/mesa-partes/desistimientos"
          className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="relative w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Ban className="w-6 h-6 text-amber-700" />
            {desistimientosPendientes > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                {desistimientosPendientes}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Solicitudes de desistimiento</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {desistimientosPendientes > 0
                ? `${desistimientosPendientes} pendiente${desistimientosPendientes === 1 ? '' : 's'} de revisar`
                : 'Revisa y resuelve las solicitudes de los tesistas'}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>

        <Link
          href="/reportes-mp/desistimientos"
          className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Reporte de desistimientos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Métricas por motivo, facultad y fase. Exporta a Excel.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      </div>

      {/* Estado de ventanas del calendario academico */}
      <CalendarStatusWidget
        tipos={[
          'PRESENTACION_PROYECTO',
          'REVISION_MESA_PARTES',
          'ASIGNACION_JURADOS',
          'EVALUACION_JURADO',
          'INFORME_FINAL',
          'SUSTENTACION',
          'DESISTIMIENTO',
        ]}
        titulo="Estado del calendario academico"
      />

      {/* Estado filter chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtrar por Estado</p>
        <div className="flex flex-wrap gap-1.5">
          {TODOS_LOS_ESTADOS.map((estado) => {
            const config = ESTADO_CONFIG[estado]
            const count = contadores[estado] || 0
            const isActive = filtroEstado === estado
            return (
              <button
                key={estado}
                onClick={() => handleFiltroEstado(estado)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border bg-card hover:bg-accent',
                  count === 0 && !isActive && 'opacity-50'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', isActive ? 'bg-primary-foreground/60' : config.dotColor)} />
                <span className={isActive ? '' : config.color}>{config.label}</span>
                <span className={cn('tabular-nums', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b bg-muted/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por título, código, autor o carrera..." className="pl-9 bg-background" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <Select value={filtroEstado} onValueChange={handleFiltroEstado}>
            <SelectTrigger className="w-full sm:w-44 bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
                <SelectItem key={estado} value={estado}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn('relative', loading && 'opacity-50 pointer-events-none')}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {proyectosFiltrados.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">No hay proyectos</h3>
              <p className="text-xs text-muted-foreground">
                {busqueda ? 'No se encontraron resultados' : `No hay proyectos en estado "${ESTADO_CONFIG[filtroEstado]?.label}"`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[90px] text-xs">Código</TableHead>
                  <TableHead className="text-xs">Título / Tesista</TableHead>
                  <TableHead className="hidden md:table-cell text-xs">Carrera</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs text-center">Docs</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-right w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectosFiltrados.map((p) => {
                  const ec = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.EN_REVISION
                  return (
                    <TableRow key={p.id} className="group">
                      <TableCell><span className="font-mono text-[11px] font-medium text-muted-foreground">{p.codigo}</span></TableCell>
                      <TableCell>
                        <div className="min-w-0 max-w-[320px]">
                          <p className="font-medium text-sm leading-snug line-clamp-1">{p.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {p.autorPrincipal?.nombre || 'Sin autor'}
                            {p.cantidadAutores > 1 && <span className="opacity-60"> (+{p.cantidadAutores - 1})</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="max-w-[180px]">
                          <p className="text-xs text-muted-foreground truncate">{p.carrera}</p>
                          {p.facultad && <Badge variant="secondary" className="text-[10px] font-medium mt-0.5">{p.facultad.codigo}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', p.tieneProyecto ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted')} title={p.tieneProyecto ? 'Proyecto subido' : 'Sin proyecto'}>
                            <FileText className={cn('w-2.5 h-2.5', p.tieneProyecto ? 'text-green-600' : 'text-muted-foreground/40')} />
                          </div>
                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', p.tieneCartaAsesor ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted')} title={p.tieneCartaAsesor ? 'Carta firmada' : 'Sin carta'}>
                            <FileCheck className={cn('w-2.5 h-2.5', p.tieneCartaAsesor ? 'text-green-600' : 'text-muted-foreground/40')} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(p.fechaEnvio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium border-transparent', ec.color, ec.bgColor)}>
                          {ec.icon}<span className="hidden sm:inline">{ec.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/mesa-partes/${p.id}`}><Eye className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Ver</span></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{((page - 1) * ITEMS_PER_PAGE) + 1}</span>
              {' - '}<span className="font-medium text-foreground">{Math.min(page * ITEMS_PER_PAGE, totalItems)}</span>
              {' de '}<span className="font-medium text-foreground">{totalItems}</span> proyectos
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p); return acc
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${i}`} className="px-1 text-muted-foreground text-xs">...</span>
                      ) : (
                        <Button key={item} variant={page === item ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setPage(item as number)} disabled={loading}>{item}</Button>
                      )
                    )}
                </div>
                <span className="sm:hidden text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
