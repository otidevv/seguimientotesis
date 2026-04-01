'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertCircle, BookOpen, CheckCircle, ChevronLeft, ChevronRight, ClipboardCheck,
  Clock, Eye, FileCheck, FileText, FileUp, Gavel, Inbox, Loader2, MoreVertical,
  RotateCcw, RefreshCw, Search, Trash2, UserPlus, X, Archive,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface TesisItem {
  id: string
  codigo: string
  titulo: string
  estado: string
  fase: string
  fechaCreacion: string
  fechaActualizacion: string
  eliminada: boolean
  autorPrincipal: { nombre: string; codigo: string; email: string } | null
  cantidadAutores: number
  asesor: { nombre: string } | null
  carrera: string
  facultad: { id: string; nombre: string; codigo: string } | null
}

interface Facultad { id: string; nombre: string; codigo: string }
type Contadores = Record<string, number>

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string; icon: React.ReactNode }> = {
  BORRADOR:               { label: 'Borrador',           color: 'text-gray-600',    bgColor: 'bg-gray-100 dark:bg-gray-800/40',       dotColor: 'bg-gray-400',    icon: <FileText className="w-3.5 h-3.5" /> },
  EN_REVISION:            { label: 'En Revisión',        color: 'text-blue-600',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       dotColor: 'bg-blue-500',    icon: <Clock className="w-3.5 h-3.5" /> },
  OBSERVADA:              { label: 'Observada',          color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  ASIGNANDO_JURADOS:      { label: 'Asign. Jurados',     color: 'text-purple-600',  bgColor: 'bg-purple-100 dark:bg-purple-900/30',   dotColor: 'bg-purple-500',  icon: <UserPlus className="w-3.5 h-3.5" /> },
  EN_EVALUACION_JURADO:   { label: 'Eval. Jurado',       color: 'text-indigo-600',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   dotColor: 'bg-indigo-500',  icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  OBSERVADA_JURADO:       { label: 'Obs. Jurado',        color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  PROYECTO_APROBADO:      { label: 'Proy. Aprobado',     color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', dotColor: 'bg-emerald-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  INFORME_FINAL:          { label: 'Informe Final',      color: 'text-cyan-600',    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',       dotColor: 'bg-cyan-500',    icon: <FileUp className="w-3.5 h-3.5" /> },
  EN_EVALUACION_INFORME:  { label: 'Eval. Informe',      color: 'text-indigo-600',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   dotColor: 'bg-indigo-500',  icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  OBSERVADA_INFORME:      { label: 'Obs. Informe',       color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   dotColor: 'bg-orange-500',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  APROBADA:               { label: 'Aprobada',           color: 'text-green-600',   bgColor: 'bg-green-100 dark:bg-green-900/30',     dotColor: 'bg-green-500',   icon: <CheckCircle className="w-3.5 h-3.5" /> },
  EN_SUSTENTACION:        { label: 'En Sustentación',    color: 'text-violet-600',  bgColor: 'bg-violet-100 dark:bg-violet-900/30',   dotColor: 'bg-violet-500',  icon: <Gavel className="w-3.5 h-3.5" /> },
  SUSTENTADA:             { label: 'Sustentada',         color: 'text-teal-600',    bgColor: 'bg-teal-100 dark:bg-teal-900/30',       dotColor: 'bg-teal-500',    icon: <FileCheck className="w-3.5 h-3.5" /> },
  ARCHIVADA:              { label: 'Archivada',          color: 'text-gray-600',    bgColor: 'bg-gray-100 dark:bg-gray-800/40',       dotColor: 'bg-gray-400',    icon: <Archive className="w-3.5 h-3.5" /> },
  RECHAZADA:              { label: 'Rechazada',          color: 'text-red-600',     bgColor: 'bg-red-100 dark:bg-red-900/30',         dotColor: 'bg-red-500',     icon: <X className="w-3.5 h-3.5" /> },
}

const TODOS_LOS_ESTADOS = Object.keys(ESTADO_CONFIG)

export default function GestionTesisPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasPermission } = useAuth()

  const [tesis, setTesis] = useState<TesisItem[]>([])
  const [contadores, setContadores] = useState<Contadores>({})
  const [resumen, setResumen] = useState({ total: 0, activas: 0, eliminadas: 0 })
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroFacultad, setFiltroFacultad] = useState('TODAS')
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const ITEMS_PER_PAGE = 10

  const [dialogEstadoOpen, setDialogEstadoOpen] = useState(false)
  const [tesisSeleccionada, setTesisSeleccionada] = useState<TesisItem | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [comentario, setComentario] = useState('')
  const [procesando, setProcesando] = useState(false)

  const [dialogEliminarOpen, setDialogEliminarOpen] = useState(false)
  const [tesisEliminar, setTesisEliminar] = useState<TesisItem | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const [verEliminadas, setVerEliminadas] = useState(false)

  const [dialogRestaurarOpen, setDialogRestaurarOpen] = useState(false)
  const [tesisRestaurar, setTesisRestaurar] = useState<TesisItem | null>(null)
  const [restaurando, setRestaurando] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  const loadTesis = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<{
        data: TesisItem[]
        contadores: Contadores
        resumen: { total: number; activas: number; eliminadas: number }
        facultades: Facultad[]
        pagination: { totalPages: number; totalItems: number }
      }>('/api/gestion-tesis', {
        params: {
          page, limit: ITEMS_PER_PAGE,
          estado: filtroEstado !== 'TODOS' ? filtroEstado : undefined,
          facultadId: filtroFacultad !== 'TODAS' ? filtroFacultad : undefined,
          busqueda: busquedaDebounced || undefined,
          eliminadas: verEliminadas ? 'true' : undefined,
        },
      })
      setTesis(data.data)
      setContadores(data.contadores)
      setResumen(data.resumen)
      setFacultades(data.facultades)
      setTotalPages(data.pagination.totalPages)
      setTotalItems(data.pagination.totalItems)
    } catch (error) {
      console.error('Error cargando tesis:', error)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [page, filtroEstado, filtroFacultad, busquedaDebounced, verEliminadas])

  useEffect(() => {
    if (!authLoading && user) loadTesis()
  }, [authLoading, user, loadTesis])

  const handleFiltroEstado = (estado: string) => { setPage(1); setFiltroEstado(estado) }
  const handleFiltroFacultad = (facultadId: string) => { setPage(1); setFiltroFacultad(facultadId) }

  const abrirCambiarEstado = (t: TesisItem) => {
    setTesisSeleccionada(t); setNuevoEstado(''); setComentario(''); setDialogEstadoOpen(true)
  }

  const ejecutarCambioEstado = async () => {
    if (!tesisSeleccionada || !nuevoEstado) return
    try {
      setProcesando(true)
      await api.patch(`/api/gestion-tesis/${tesisSeleccionada.id}`, {
        accion: 'CAMBIAR_ESTADO', nuevoEstado, comentario: comentario.trim() || undefined,
      })
      toast.success('Estado actualizado correctamente')
      setDialogEstadoOpen(false)
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally { setProcesando(false) }
  }

  const abrirEliminar = (t: TesisItem) => { setTesisEliminar(t); setDialogEliminarOpen(true) }

  const ejecutarEliminacion = async () => {
    if (!tesisEliminar) return
    try {
      setEliminando(true)
      await api.delete(`/api/gestion-tesis/${tesisEliminar.id}`)
      toast.success('Tesis eliminada correctamente')
      setDialogEliminarOpen(false)
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally { setEliminando(false) }
  }

  const toggleVerEliminadas = () => { setVerEliminadas((v) => !v); setPage(1); setFiltroEstado('TODOS') }

  const abrirRestaurar = (t: TesisItem) => { setTesisRestaurar(t); setDialogRestaurarOpen(true) }

  const ejecutarRestauracion = async () => {
    if (!tesisRestaurar) return
    try {
      setRestaurando(true)
      await api.patch(`/api/gestion-tesis/${tesisRestaurar.id}`, { accion: 'RESTAURAR' })
      toast.success('Tesis restaurada correctamente')
      setDialogRestaurarOpen(false)
      loadTesis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally { setRestaurando(false) }
  }

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasPermission('tesis', 'view')) {
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
                <p className="text-sm text-muted-foreground">No tienes permisos para acceder a Gestión de Tesis.</p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Volver al Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group estados with counts > 0 for the filter chips
  const estadosConDatos = TODOS_LOS_ESTADOS.filter((e) => (contadores[e] || 0) > 0)
  const estadosSinDatos = TODOS_LOS_ESTADOS.filter((e) => (contadores[e] || 0) === 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Tesis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administración completa de todas las tesis del sistema
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <div className="text-right">
              <p className="text-xl font-bold leading-none">{resumen.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <div className="text-right">
              <p className="text-xl font-bold leading-none">{resumen.activas}</p>
              <p className="text-[10px] text-muted-foreground">Activas</p>
            </div>
          </div>
          <button
            onClick={toggleVerEliminadas}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              verEliminadas ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'hover:bg-muted/50'
            )}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
            <div className="text-right">
              <p className="text-xl font-bold leading-none">{resumen.eliminadas}</p>
              <p className="text-[10px] text-muted-foreground">{verEliminadas ? 'Mostrando' : 'Eliminadas'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Estado filter chips */}
      {!verEliminadas && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribución por Estado</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleFiltroEstado('TODOS')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                filtroEstado === 'TODOS'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border bg-card hover:bg-accent text-muted-foreground'
              )}
            >
              Todos
              <span className={cn('tabular-nums', filtroEstado === 'TODOS' ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>{resumen.total}</span>
            </button>
            {estadosConDatos.map((estado) => {
              const config = ESTADO_CONFIG[estado]
              const count = contadores[estado] || 0
              const isActive = filtroEstado === estado
              return (
                <button
                  key={estado}
                  onClick={() => handleFiltroEstado(isActive ? 'TODOS' : estado)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border bg-card hover:bg-accent'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full flex-shrink-0', isActive ? 'bg-primary-foreground/60' : config.dotColor)} />
                  <span className={isActive ? '' : config.color}>{config.label}</span>
                  <span className={cn('tabular-nums', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>{count}</span>
                </button>
              )
            })}
            {estadosSinDatos.length > 0 && (
              <span className="inline-flex items-center px-2 py-1.5 text-[10px] text-muted-foreground/40">
                +{estadosSinDatos.length} sin tesis
              </span>
            )}
          </div>
        </div>
      )}

      {/* Table Card */}
      <Card className="overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b bg-muted/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o tesista..."
              className="pl-9 bg-background"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Select value={filtroEstado} onValueChange={handleFiltroEstado}>
            <SelectTrigger className="w-full sm:w-44 bg-background">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
                <SelectItem key={estado} value={estado}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroFacultad} onValueChange={handleFiltroFacultad}>
            <SelectTrigger className="w-full sm:w-44 bg-background">
              <SelectValue placeholder="Facultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las facultades</SelectItem>
              {facultades.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table content */}
        <div className={cn('relative', loading && 'opacity-50 pointer-events-none')}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {tesis.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold mb-1">No hay tesis</h3>
              <p className="text-xs text-muted-foreground">No se encontraron tesis con los filtros aplicados</p>
            </div>
          ) : (
            <Table aria-label="Tabla de gestión de tesis">
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[90px] text-xs">Código</TableHead>
                  <TableHead className="text-xs">Título / Tesista</TableHead>
                  <TableHead className="hidden md:table-cell text-xs">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs">Asesor</TableHead>
                  <TableHead className="hidden md:table-cell text-xs">Facultad</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs">Fecha</TableHead>
                  <TableHead className="text-right w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tesis.map((t) => {
                  const ec = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.EN_REVISION
                  return (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <span className="font-mono text-[11px] font-medium text-muted-foreground">{t.codigo}</span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0 max-w-[320px]">
                          <p className="font-medium text-sm leading-snug line-clamp-1">{t.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {t.autorPrincipal?.nombre || 'Sin autor'}
                            {t.cantidadAutores > 1 && <span className="opacity-60"> (+{t.cantidadAutores - 1})</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium border-transparent', ec.color, ec.bgColor)}>
                          {ec.icon}
                          <span>{ec.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground truncate block max-w-[150px]">
                          {t.asesor?.nombre || 'Sin asesor'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {t.facultad && (
                          <Badge variant="secondary" className="text-[10px] font-medium">{t.facultad.codigo}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(t.fechaActualizacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Acciones">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.eliminada ? (
                              <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600" onClick={() => abrirRestaurar(t)}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Restaurar
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/mesa-partes/${t.id}`}><Eye className="w-4 h-4 mr-2" /> Ver detalle</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => abrirCambiarEstado(t)}>
                                  <RefreshCw className="w-4 h-4 mr-2" /> Cambiar estado
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => abrirEliminar(t)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <nav aria-label="Paginación" className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{((page - 1) * ITEMS_PER_PAGE) + 1}</span>
              {' - '}
              <span className="font-medium text-foreground">{Math.min(page * ITEMS_PER_PAGE, totalItems)}</span>
              {' de '}
              <span className="font-medium text-foreground">{totalItems}</span> tesis
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} aria-label="Página anterior">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${i}`} className="px-1 text-muted-foreground text-xs">...</span>
                      ) : (
                        <Button key={item} variant={page === item ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0" onClick={() => setPage(item as number)} disabled={loading} {...(page === item ? { 'aria-current': 'page' as const } : {})}>
                          {item}
                        </Button>
                      )
                    )}
                </div>
                <span className="sm:hidden text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} aria-label="Página siguiente">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </nav>
        )}
      </Card>

      {/* Dialog: Cambiar Estado */}
      <Dialog open={dialogEstadoOpen} onOpenChange={setDialogEstadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              {tesisSeleccionada && (<><span className="font-mono text-xs">{tesisSeleccionada.codigo}</span> - {tesisSeleccionada.titulo}</>)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tesisSeleccionada && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Actual:</span>
                <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium border-transparent', ESTADO_CONFIG[tesisSeleccionada.estado]?.color, ESTADO_CONFIG[tesisSeleccionada.estado]?.bgColor)}>
                  {ESTADO_CONFIG[tesisSeleccionada.estado]?.icon}
                  <span>{ESTADO_CONFIG[tesisSeleccionada.estado]?.label}</span>
                </Badge>
              </div>
            )}
            <div>
              <Label>Nuevo estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {TODOS_LOS_ESTADOS.filter((e) => e !== tesisSeleccionada?.estado).map((estado) => (
                    <SelectItem key={estado} value={estado}>{ESTADO_CONFIG[estado].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comentario (opcional)</Label>
              <Textarea placeholder="Agregar un comentario..." value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} className="mt-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEstadoOpen(false)} disabled={procesando}>Cancelar</Button>
            <Button onClick={ejecutarCambioEstado} disabled={procesando || !nuevoEstado}>
              {procesando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><RefreshCw className="w-4 h-4 mr-2" />Cambiar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Eliminar */}
      <Dialog open={dialogEliminarOpen} onOpenChange={setDialogEliminarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Tesis</DialogTitle>
            <DialogDescription>
              {tesisEliminar && (<><span className="font-mono text-xs">{tesisEliminar.codigo}</span> - {tesisEliminar.titulo}</>)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Esta acción eliminará la tesis del sistema. Podrás restaurarla desde la sección de eliminadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEliminarOpen(false)} disabled={eliminando}>Cancelar</Button>
            <Button variant="destructive" onClick={ejecutarEliminacion} disabled={eliminando}>
              {eliminando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Eliminando...</> : <><Trash2 className="w-4 h-4 mr-2" />Eliminar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Restaurar */}
      <Dialog open={dialogRestaurarOpen} onOpenChange={setDialogRestaurarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Tesis</DialogTitle>
            <DialogDescription>
              {tesisRestaurar && (<><span className="font-mono text-xs">{tesisRestaurar.codigo}</span> - {tesisRestaurar.titulo}</>)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            La tesis será restaurada y volverá a aparecer en el listado principal con su estado anterior.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRestaurarOpen(false)} disabled={restaurando}>Cancelar</Button>
            <Button onClick={ejecutarRestauracion} disabled={restaurando} className="bg-emerald-600 hover:bg-emerald-700">
              {restaurando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restaurando...</> : <><RotateCcw className="w-4 h-4 mr-2" />Restaurar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
