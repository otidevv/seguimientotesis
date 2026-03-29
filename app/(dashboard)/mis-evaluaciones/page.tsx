'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Eye,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface EvaluacionItem {
  id: string
  thesisId: string
  tipo: string
  fase: string
  titulo: string
  estado: string
  faseTerminada: boolean
  rondaActual: number
  faseActual: string | null
  fechaLimiteEvaluacion: string | null
  fechaSustentacion: string | null
  autores: string
  yaEvaluo: boolean
  miResultado: string | null
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20]

const TIPO_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VOCAL: 'Vocal',
  SECRETARIO: 'Secretario',
  ACCESITARIO: 'Accesitario',
}

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  EN_EVALUACION_JURADO: { label: 'En Evaluacion', color: 'text-indigo-600 bg-indigo-100' },
  OBSERVADA_JURADO: { label: 'Observada', color: 'text-orange-600 bg-orange-100' },
  PROYECTO_APROBADO: { label: 'Proyecto Aprobado', color: 'text-green-600 bg-green-100' },
  EN_EVALUACION_INFORME: { label: 'Evaluando Informe', color: 'text-indigo-600 bg-indigo-100' },
  OBSERVADA_INFORME: { label: 'Informe Observado', color: 'text-orange-600 bg-orange-100' },
  EN_SUSTENTACION: { label: 'En Sustentación', color: 'text-emerald-600 bg-emerald-100' },
  SUSTENTADA: { label: 'Sustentada', color: 'text-green-700 bg-green-100' },
  APROBADA: { label: 'Aprobada', color: 'text-green-600 bg-green-100' },
  ASIGNANDO_JURADOS: { label: 'Asignando Jurados', color: 'text-purple-600 bg-purple-100' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-cyan-600 bg-cyan-100' },
}

const FASE_OPTIONS = [
  { value: 'TODOS', label: 'Todas las fases' },
  { value: 'PROYECTO', label: 'Proyecto' },
  { value: 'INFORME_FINAL', label: 'Informe Final' },
]

export default function MisEvaluacionesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [busquedaDebounced, setBusquedaDebounced] = useState('')
  const [filtroFase, setFiltroFase] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [contadores, setContadores] = useState({ total: 0, pendientes: 0, evaluadas: 0 })

  // Debounce de busqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaDebounced(busqueda)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [busqueda])

  const loadEvaluaciones = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.get<{
        data: EvaluacionItem[]
        pagination?: { totalPages: number; totalItems: number }
        contadores?: { total: number; pendientes: number; evaluadas: number }
      }>('/api/mis-evaluaciones', {
        params: {
          page,
          limit: itemsPerPage,
          fase: filtroFase !== 'TODOS' ? filtroFase : undefined,
          busqueda: busquedaDebounced || undefined,
        },
      })
      setEvaluaciones(result.data)
      if (result.pagination) {
        setTotalPages(result.pagination.totalPages)
        setTotalItems(result.pagination.totalItems)
      }
      if (result.contadores) {
        setContadores(result.contadores)
      }
    } catch {
      // Error silencioso
    } finally {
      setLoading(false)
    }
  }, [page, itemsPerPage, filtroFase, busquedaDebounced])

  useEffect(() => {
    if (!authLoading && user) {
      loadEvaluaciones()
    }
  }, [authLoading, user, loadEvaluaciones])

  const handleFiltroFase = (value: string) => {
    setPage(1)
    setFiltroFase(value)
  }

  const handleItemsPerPage = (value: string) => {
    setPage(1)
    setItemsPerPage(Number(value))
  }

  // Generar numeros de pagina visibles
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  if (authLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          {/* Counter cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-7 w-10" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Table skeleton */}
          <Card>
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-full sm:w-48" />
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tesis</TableHead>
                      <TableHead className="hidden md:table-cell">Mi Rol</TableHead>
                      <TableHead className="hidden md:table-cell">Fase</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                      <TableHead>Mi Evaluacion</TableHead>
                      <TableHead className="w-[80px]">Accion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-52" />
                            <Skeleton className="h-3 w-36" />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const startItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, totalItems)

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-2xl font-bold">Mis Evaluaciones</h1>
          <p className="text-muted-foreground">
            Tesis asignadas para evaluacion como jurado
          </p>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes de evaluar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.evaluadas}</p>
                <p className="text-xs text-muted-foreground">Evaluadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.total}</p>
                <p className="text-xs text-muted-foreground">Total asignadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Tesis Asignadas</CardTitle>
          </CardHeader>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo de tesis..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Select value={filtroFase} onValueChange={handleFiltroFase}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent position="popper">
                {FASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CardContent className="p-0">
            <div className="relative">
              {loading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tesis</TableHead>
                        <TableHead className="hidden md:table-cell">Mi Rol</TableHead>
                        <TableHead className="hidden md:table-cell">Fase</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                        <TableHead>Mi Evaluacion</TableHead>
                        <TableHead className="w-[80px]">Accion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: itemsPerPage > 5 ? 5 : itemsPerPage }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-52" />
                              <Skeleton className="h-3 w-36" />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : evaluaciones.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No hay evaluaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    {busqueda
                      ? 'No se encontraron resultados para la busqueda'
                      : 'No tienes tesis asignadas para evaluacion'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tesis</TableHead>
                          <TableHead className="hidden md:table-cell">Mi Rol</TableHead>
                          <TableHead className="hidden md:table-cell">Fase</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                          <TableHead>Mi Evaluacion</TableHead>
                          <TableHead className="w-[80px]">Accion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evaluaciones.map((item, index) => {
                          const estadoConfig = ESTADO_LABELS[item.estado]
                          const puedeEvaluar = !item.faseTerminada && ['EN_EVALUACION_JURADO', 'EN_EVALUACION_INFORME'].includes(item.estado) && !item.yaEvaluo
                          return (
                            <TableRow
                              key={item.id}
                              className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards"
                              style={{ animationDelay: `${index * 80}ms`, animationDuration: '500ms' }}
                            >
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="font-medium text-sm truncate">{item.titulo}</p>
                                  <p className="text-xs text-muted-foreground truncate">{item.autores}</p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="text-xs">
                                  {TIPO_LABELS[item.tipo]}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-xs">
                                  {item.fase === 'PROYECTO' ? 'Proyecto' : 'Informe Final'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn('text-xs', estadoConfig?.color || 'bg-gray-100 text-gray-600')}>
                                  {estadoConfig?.label || item.estado}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {['EN_SUSTENTACION', 'SUSTENTADA'].includes(item.estado) && item.fechaSustentacion ? (
                                  <span className="text-xs text-purple-600 font-medium">
                                    {new Date(item.fechaSustentacion).toLocaleDateString('es-PE')}
                                  </span>
                                ) : item.fechaLimiteEvaluacion ? (
                                  <span className="text-xs">
                                    {new Date(item.fechaLimiteEvaluacion).toLocaleDateString('es-PE')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.yaEvaluo || item.faseTerminada ? (
                                  <Badge variant="outline" className={cn(
                                    'text-xs',
                                    item.miResultado === 'APROBADO'
                                      ? 'border-green-500 text-green-600'
                                      : item.miResultado === 'OBSERVADO'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-green-500 text-green-600'
                                  )}>
                                    {item.miResultado === 'APROBADO' ? 'Aprobado' : item.miResultado === 'OBSERVADO' ? 'Observado' : 'Aprobado'}
                                  </Badge>
                                ) : puedeEvaluar ? (
                                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                                    Pendiente
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/mis-evaluaciones/${item.thesisId}?juradoId=${item.id}`}>
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginacion */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Filas por pagina</span>
                        <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPage}>
                          <SelectTrigger className="w-[70px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-muted-foreground hidden sm:block">
                        Mostrando {startItem} - {endItem} de {totalItems}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((p, i) =>
                          typeof p === 'string' ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              key={p}
                              variant={page === p ? 'default' : 'outline'}
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          )
                        )}
                      </div>
                      <span className="sm:hidden text-sm text-muted-foreground px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
