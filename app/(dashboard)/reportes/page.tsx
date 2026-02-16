'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  Gavel,
  Inbox,
  Loader2,
  Search,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TesisReporte {
  id: string
  codigo: string
  titulo: string
  estado: string
  fase: string
  fechaCreacion: string
  fechaActualizacion: string
  autorPrincipal: {
    nombre: string
    codigo: string
    email: string
  } | null
  cantidadAutores: number
  asesor: {
    nombre: string
  } | null
  carrera: string
  facultad: {
    id: string
    nombre: string
    codigo: string
  } | null
}

interface Facultad {
  id: string
  nombre: string
  codigo: string
}

interface Resumen {
  total: number
  proyectosAprobados: number
  informesAprobados: number
  enProceso: number
}

type Contadores = Record<string, number>

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  BORRADOR: {
    label: 'Borrador',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  EN_REVISION: {
    label: 'En Revision',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  ASIGNANDO_JURADOS: {
    label: 'Asignando Jurados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <UserPlus className="w-3.5 h-3.5" />,
  },
  EN_EVALUACION_JURADO: {
    label: 'Eval. Jurado',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-3.5 h-3.5" />,
  },
  OBSERVADA_JURADO: {
    label: 'Obs. Jurado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  PROYECTO_APROBADO: {
    label: 'Proy. Aprobado',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  INFORME_FINAL: {
    label: 'Informe Final',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <FileUp className="w-3.5 h-3.5" />,
  },
  EN_EVALUACION_INFORME: {
    label: 'Eval. Informe',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-3.5 h-3.5" />,
  },
  OBSERVADA_INFORME: {
    label: 'Obs. Informe',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  EN_SUSTENTACION: {
    label: 'En Sustentacion',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    icon: <Gavel className="w-3.5 h-3.5" />,
  },
  SUSTENTADA: {
    label: 'Sustentada',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    icon: <FileCheck className="w-3.5 h-3.5" />,
  },
  ARCHIVADA: {
    label: 'Archivada',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: <Inbox className="w-3.5 h-3.5" />,
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-3.5 h-3.5" />,
  },
}

const ESTADOS_PRINCIPALES = [
  'EN_REVISION', 'OBSERVADA', 'ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO',
  'OBSERVADA_JURADO', 'PROYECTO_APROBADO', 'INFORME_FINAL', 'EN_EVALUACION_INFORME',
  'OBSERVADA_INFORME', 'APROBADA', 'EN_SUSTENTACION', 'SUSTENTADA', 'ARCHIVADA', 'RECHAZADA',
]

export default function ReportesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole, hasPermission } = useAuth()

  const [tesis, setTesis] = useState<TesisReporte[]>([])
  const [contadores, setContadores] = useState<Contadores>({})
  const [resumen, setResumen] = useState<Resumen>({ total: 0, proyectosAprobados: 0, informesAprobados: 0, enProceso: 0 })
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

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  const loadReportes = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(ITEMS_PER_PAGE))
      if (filtroEstado !== 'TODOS') params.set('estado', filtroEstado)
      if (filtroFacultad !== 'TODAS') params.set('facultadId', filtroFacultad)
      if (busquedaDebounced) params.set('busqueda', busquedaDebounced)

      const response = await fetch(`/api/reportes?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTesis(data.data)
        setContadores(data.contadores)
        setResumen(data.resumen)
        setFacultades(data.facultades)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.totalItems)
      }
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [page, filtroEstado, filtroFacultad, busquedaDebounced])

  useEffect(() => {
    if (!authLoading && user) {
      loadReportes()
    }
  }, [authLoading, user, loadReportes])

  const handleFiltroEstado = (estado: string) => {
    setPage(1)
    setFiltroEstado(estado)
  }

  const handleFiltroFacultad = (facultadId: string) => {
    setPage(1)
    setFiltroFacultad(facultadId)
  }

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasRole('MESA_PARTES') && !hasRole('ADMIN') && !hasRole('SUPER_ADMIN') && !hasPermission('reportes', 'view')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              No tienes permisos para acceder al módulo de Reportes.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Estado general de las tesis en el sistema
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tesis
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.total}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proyectos Aprobados
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.proyectosAprobados}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Informes Aprobados
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.informesAprobados}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En Proceso
              </CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resumen.enProceso}</div>
            </CardContent>
          </Card>
        </div>

        {/* Distribución por Estado */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Distribucion por Estado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {ESTADOS_PRINCIPALES.map((estado) => {
              const config = ESTADO_CONFIG[estado]
              if (!config) return null
              const count = contadores[estado] || 0
              return (
                <Card
                  key={estado}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    filtroEstado === estado && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleFiltroEstado(filtroEstado === estado ? 'TODOS' : estado)}
                >
                  <CardContent className="pt-3 pb-3 px-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{config.label}</p>
                      </div>
                      <div className={cn('p-1 rounded-lg flex-shrink-0', config.bgColor, config.color)}>
                        {config.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tabla */}
        <Card>
          {/* Barra de filtros */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo o tesista..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroEstado} onValueChange={handleFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="INFORMES_APROBADOS">Informes Aprobados</SelectItem>
                {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
                  <SelectItem key={estado} value={estado}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroFacultad} onValueChange={handleFiltroFacultad}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Facultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las facultades</SelectItem>
                {facultades.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contenido de la tabla */}
          <div className={cn('relative', loading && 'opacity-50 pointer-events-none')}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {tesis.length === 0 ? (
              <div className="py-16 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-base font-semibold mb-1">No hay tesis</h3>
                <p className="text-sm text-muted-foreground">
                  No se encontraron tesis con los filtros aplicados
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[100px]">Codigo</TableHead>
                    <TableHead>Titulo / Tesista</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Fase</TableHead>
                    <TableHead className="hidden md:table-cell">Carrera / Facultad</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="text-right w-[80px]">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tesis.map((t) => {
                    const estadoConfig = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.EN_REVISION
                    return (
                      <TableRow key={t.id} className="group cursor-pointer" onClick={() => router.push(`/mesa-partes/${t.id}`)}>
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {t.codigo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 max-w-[320px]">
                            <p className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                              {t.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {t.autorPrincipal?.nombre || 'Sin autor'}
                              {t.cantidadAutores > 1 && (
                                <span className="text-muted-foreground/70"> (+{t.cantidadAutores - 1})</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-[11px] font-medium', estadoConfig.color, estadoConfig.bgColor, 'border-transparent')}
                          >
                            {estadoConfig.icon}
                            <span>{estadoConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{t.fase}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="max-w-[180px]">
                            <p className="text-xs text-muted-foreground truncate">{t.carrera}</p>
                            {t.facultad && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                                {t.facultad.codigo}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.fechaActualizacion).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild className="h-8 px-2.5" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/mesa-partes/${t.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Paginación */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Mostrando{' '}
                <span className="font-medium text-foreground">
                  {((page - 1) * ITEMS_PER_PAGE) + 1}
                </span>
                {' '}-{' '}
                <span className="font-medium text-foreground">
                  {Math.min(page * ITEMS_PER_PAGE, totalItems)}
                </span>
                {' '}de{' '}
                <span className="font-medium text-foreground">{totalItems}</span>
                {' '}tesis
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (p === 1 || p === totalPages) return true
                        if (Math.abs(p - page) <= 1) return true
                        return false
                      })
                      .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) {
                          acc.push('ellipsis')
                        }
                        acc.push(p)
                        return acc
                      }, [])
                      .map((item, i) =>
                        item === 'ellipsis' ? (
                          <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-xs">...</span>
                        ) : (
                          <Button
                            key={item}
                            variant={page === item ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPage(item as number)}
                            disabled={loading}
                          >
                            {item}
                          </Button>
                        )
                      )}
                  </div>
                  <span className="sm:hidden text-xs text-muted-foreground px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
