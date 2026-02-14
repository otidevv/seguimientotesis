'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  UserPlus,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Proyecto {
  id: string
  codigo: string
  titulo: string
  estado: string
  fechaEnvio: string
  autorPrincipal: {
    nombre: string
    codigo: string
    email: string
  } | null
  cantidadAutores: number
  asesor: {
    nombre: string
    estado: string
  } | null
  carrera: string
  facultad: {
    id: string
    nombre: string
    codigo: string
  } | null
  tieneProyecto: boolean
  tieneCartaAsesor: boolean
  documentosCount: number
}

type Contadores = Record<string, number>

const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
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
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-3.5 h-3.5" />,
  },
}

// Estados principales para contadores
const ESTADOS_PRINCIPALES = [
  'EN_REVISION', 'OBSERVADA', 'ASIGNANDO_JURADOS', 'EN_EVALUACION_JURADO',
  'PROYECTO_APROBADO', 'INFORME_FINAL', 'APROBADA', 'RECHAZADA',
]

export default function MesaPartesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, hasRole } = useAuth()

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
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (!authLoading && user) {
      loadProyectos()
    }
  }, [authLoading, user, filtroEstado, page])

  const handleFiltroEstado = (estado: string) => {
    setPage(1)
    setFiltroEstado(estado)
  }

  const loadProyectos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mesa-partes?estado=${filtroEstado}&page=${page}&limit=${ITEMS_PER_PAGE}`)
      const data = await response.json()

      if (data.success) {
        setProyectos(data.data)
        setContadores(data.contadores)
        if (data.facultadAsignada !== undefined) {
          setFacultadAsignada(data.facultadAsignada)
        }
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
          setTotalItems(data.pagination.totalItems)
        }
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  // Filtrar por búsqueda local
  const proyectosFiltrados = proyectos.filter((p) => {
    if (!busqueda) return true
    const termino = busqueda.toLowerCase()
    return (
      p.titulo.toLowerCase().includes(termino) ||
      p.codigo.toLowerCase().includes(termino) ||
      p.autorPrincipal?.nombre.toLowerCase().includes(termino) ||
      p.autorPrincipal?.codigo?.toLowerCase().includes(termino) ||
      p.carrera.toLowerCase().includes(termino)
    )
  })

  if (authLoading || initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasRole('MESA_PARTES') && !hasRole('ADMIN') && !hasRole('SUPER_ADMIN')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es solo para personal de Mesa de Partes.
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
            <Inbox className="w-7 h-7 text-primary" />
            Mesa de Partes
            {facultadAsignada && (
              <span className="text-primary/80 font-semibold">
                — {facultadAsignada}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            {facultadAsignada
              ? `Gestión de proyectos de tesis de la ${facultadAsignada}`
              : 'Gestión de proyectos de tesis recibidos'}
          </p>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
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
                onClick={() => handleFiltroEstado(estado)}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                    <div className={cn('p-1.5 rounded-lg', config.bgColor, config.color)}>
                      {config.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabla */}
        <Card>
          {/* Barra de filtros */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, código, autor o carrera..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroEstado} onValueChange={handleFiltroEstado}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ESTADO_CONFIG).map(([estado, config]) => (
                  <SelectItem key={estado} value={estado}>
                    {config.label}
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

            {proyectosFiltrados.length === 0 ? (
              <div className="py-16 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-base font-semibold mb-1">No hay proyectos</h3>
                <p className="text-sm text-muted-foreground">
                  {busqueda
                    ? 'No se encontraron resultados para la búsqueda'
                    : `No hay proyectos en estado "${ESTADO_CONFIG[filtroEstado]?.label}"`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Título / Tesista</TableHead>
                    <TableHead className="hidden md:table-cell">Carrera</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Docs</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right w-[90px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proyectosFiltrados.map((proyecto) => {
                    const estadoConfig = ESTADO_CONFIG[proyecto.estado] || ESTADO_CONFIG.EN_REVISION
                    return (
                      <TableRow key={proyecto.id} className="group">
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {proyecto.codigo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 max-w-[320px]">
                            <p className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                              {proyecto.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {proyecto.autorPrincipal?.nombre || 'Sin autor'}
                              {proyecto.cantidadAutores > 1 && (
                                <span className="text-muted-foreground/70"> (+{proyecto.cantidadAutores - 1})</span>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="max-w-[180px]">
                            <p className="text-xs text-muted-foreground truncate">{proyecto.carrera}</p>
                            {proyecto.facultad && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                                {proyecto.facultad.codigo}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center justify-center gap-1.5">
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                proyecto.tieneProyecto
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              )}
                              title={proyecto.tieneProyecto ? 'Proyecto subido' : 'Sin proyecto'}
                            >
                              <FileText className={cn('w-3 h-3', proyecto.tieneProyecto ? 'text-green-600' : 'text-gray-400')} />
                            </div>
                            <div
                              className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center',
                                proyecto.tieneCartaAsesor
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              )}
                              title={proyecto.tieneCartaAsesor ? 'Carta firmada' : 'Sin carta'}
                            >
                              <FileCheck className={cn('w-3 h-3', proyecto.tieneCartaAsesor ? 'text-green-600' : 'text-gray-400')} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {new Date(proyecto.fechaEnvio).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('gap-1 text-[11px] font-medium', estadoConfig.color, estadoConfig.bgColor, 'border-transparent')}
                          >
                            {estadoConfig.icon}
                            <span className="hidden sm:inline">{estadoConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild className="h-8 px-2.5">
                            <Link href={`/mesa-partes/${proyecto.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Revisar
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

          {/* Footer: paginación */}
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
                {' '}proyectos
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
